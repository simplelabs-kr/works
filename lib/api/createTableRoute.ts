import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

// 모든 페이지별 테이블 API route 가 공유하는 팩토리 묶음.
// 각 페이지의 route 파일은 RPC 이름 / 테이블명 / 필드 스펙만
// 주입해서 핸들러를 만든다 — 드리프트를 없애고 방어 로직
// (offset 상한, search 길이 제한, 에러 로깅 shape) 을 한 곳에 모은다.
//
// 전제:
// - 모든 대상 테이블은 `id` 가 문자열 PK 이고 `deleted_at`(nullable) 이 있다.
// - search / count RPC 는 order-items / products 와 동일한 시그니처:
//     search_*(filters_json, sorts_json, search_term, result_offset,
//              result_limit, trashed_only)
//     count_*(filters_json, search_term, trashed_only)
//   filters_json 은 RootFilterState ({logic, conditions}) 를 그대로 받는다.

export const MAX_OFFSET = 1_000_000
export const MAX_SEARCH_LENGTH = 200

const ID_REGEX = /^[A-Za-z0-9-]{8,64}$/
type IdParams = { params: { id: string } }

function logError(
  prefix: string,
  label: string,
  err: unknown,
  ctx?: Record<string, unknown>,
) {
  const payload = err && typeof err === 'object'
    ? JSON.stringify(err, null, 2)
    : String(err)
  // ctx 도 JSON.stringify 로 풀어서 출력 — 기본 console 은 중첩
  // 객체를 [Object] 로 잘라버리므로 원인 진단이 어렵다.
  if (ctx) console.error(`${prefix} ${label}:`, payload, JSON.stringify(ctx, null, 2))
  else console.error(`${prefix} ${label}:`, payload)
}

// ─── list: POST /api/{table} ─────────────────────────────────────────
export type ListRouteOpts = {
  searchRpc: string
  countRpc: string
  logPrefix: string
  // search RPC 가 keep_custom_sort boolean 파라미터를 받는 경우에만 true.
  // 기본 RPC 시그니처에는 없는 옵션 파라미터라 모든 테이블에 무조건 전달하면
  // "function ... does not exist" 로 깨진다. 명시 opt-in.
  supportsKeepCustomSort?: boolean
}

export function createListRoute(opts: ListRouteOpts) {
  const { searchRpc, countRpc, logPrefix, supportsKeepCustomSort } = opts
  return async function POST(request: NextRequest) {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = await request.json()
    const offsetRaw = Number(body.offset ?? 0)
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 && offsetRaw <= MAX_OFFSET
      ? Math.floor(offsetRaw)
      : 0
    // filters 는 배열(legacy) 또는 RootFilterState 객체 둘 다 허용 —
    // RPC 쪽 헬퍼가 두 shape 를 함께 처리한다.
    const filters = Array.isArray(body.filters)
      ? body.filters
      : (body.filters && typeof body.filters === 'object' ? body.filters : [])
    const sorts = Array.isArray(body.sorts) ? body.sorts : []
    const searchRaw = typeof body.search_term === 'string' ? body.search_term : ''
    const searchTerm = searchRaw ? searchRaw.slice(0, MAX_SEARCH_LENGTH) : null
    const trashedOnly = body.trashed_only === true
    const keepCustomSort = body.keep_custom_sort === true

    const noopResult = Promise.resolve({ data: null, error: null } as { data: null; error: null })

    const searchArgs: Record<string, unknown> = {
      filters_json:  filters,
      sorts_json:    sorts,
      search_term:   searchTerm,
      result_offset: offset,
      result_limit:  100,
      trashed_only:  trashedOnly,
    }
    if (supportsKeepCustomSort) searchArgs.keep_custom_sort = keepCustomSort

    const [dataResult, filterCountResult, searchCountResult] = await Promise.all([
      // 1) 데이터 — 모든 파라미터 사용
      supabaseAdmin.rpc(searchRpc, searchArgs),
      // 2) filterCount — 필터만 (검색어 제외). count RPC 는 sorts/offset/limit 없음.
      offset === 0
        ? supabaseAdmin.rpc(countRpc, {
            filters_json: filters, search_term: null, trashed_only: trashedOnly,
          })
        : noopResult,
      // 3) searchCount — 필터 + 검색어. offset===0 이고 검색어 있을 때만.
      offset === 0 && searchTerm
        ? supabaseAdmin.rpc(countRpc, {
            filters_json: filters, search_term: searchTerm, trashed_only: trashedOnly,
          })
        : noopResult,
    ])

    if (dataResult.error) {
      logError(logPrefix, 'rpc error', dataResult.error, {
        filters, sorts, searchTerm, offset, trashedOnly,
        ...(supportsKeepCustomSort ? { keepCustomSort } : {}),
      })
      return NextResponse.json({ error: '데이터 조회에 실패했습니다' }, { status: 500 })
    }

    let filterCount: number | null = null
    let searchCount: number | null = null

    if (filterCountResult.error) {
      logError(logPrefix, 'filterCount error', filterCountResult.error)
    } else if (filterCountResult.data != null) {
      filterCount = Number(filterCountResult.data)
    }

    if (searchCountResult.error) {
      logError(logPrefix, 'searchCount error', searchCountResult.error)
    } else if (searchCountResult.data != null) {
      searchCount = Number(searchCountResult.data)
    }

    return NextResponse.json({
      data: dataResult.data ?? [],
      filterCount,
      searchCount,
    })
  }
}

// ─── patch: PATCH /api/{table}/[id] ─────────────────────────────────
export type FieldType = 'number' | 'boolean' | 'date' | 'text' | 'enum' | 'attachment_list'

export type FieldSpec = {
  type: FieldType
  maxLength?: number
  values?: string[]
}

export type FieldSpecs = Record<string, FieldSpec>

type ValidateResult =
  | { ok: true; normalized: unknown }
  | { ok: false; reason: string }

export function validateValue(spec: FieldSpec, value: unknown): ValidateResult {
  switch (spec.type) {
    case 'number': {
      if (value === null || value === undefined || value === '') return { ok: true, normalized: null }
      const n = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(n)) return { ok: false, reason: 'invalid number' }
      return { ok: true, normalized: n }
    }
    case 'boolean': {
      if (typeof value === 'boolean') return { ok: true, normalized: value }
      if (value === null || value === undefined) return { ok: true, normalized: false }
      return { ok: false, reason: 'invalid boolean' }
    }
    case 'date': {
      if (value === null || value === undefined || value === '') return { ok: true, normalized: null }
      if (typeof value !== 'string') return { ok: false, reason: 'invalid date' }
      const trimmed = value.trim()
      if (trimmed === '') return { ok: true, normalized: null }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { ok: false, reason: 'invalid date format (YYYY-MM-DD)' }
      return { ok: true, normalized: trimmed }
    }
    case 'text': {
      if (value === null || value === undefined) return { ok: true, normalized: null }
      if (typeof value !== 'string') return { ok: false, reason: 'invalid text' }
      if (spec.maxLength != null && value.length > spec.maxLength) {
        return { ok: false, reason: `text too long (max ${spec.maxLength})` }
      }
      return { ok: true, normalized: value === '' ? null : value }
    }
    case 'enum': {
      if (value === null || value === undefined) return { ok: true, normalized: null }
      if (typeof value !== 'string') return { ok: false, reason: 'invalid enum' }
      if (!spec.values?.includes(value)) return { ok: false, reason: 'value not in enum' }
      return { ok: true, normalized: value === '' ? null : value }
    }
    case 'attachment_list': {
      if (value === null || value === undefined) return { ok: true, normalized: [] }
      if (!Array.isArray(value)) return { ok: false, reason: 'attachment list must be array' }
      if (value.length > 50) return { ok: false, reason: 'too many attachments (max 50)' }
      for (const item of value) {
        if (!item || typeof item !== 'object') return { ok: false, reason: 'invalid attachment item' }
        const a = item as Record<string, unknown>
        if (typeof a.url !== 'string' || typeof a.name !== 'string') {
          return { ok: false, reason: 'attachment must have string url and name' }
        }
        if (a.url.length > 2048 || a.name.length > 512) {
          return { ok: false, reason: 'attachment url/name too long' }
        }
      }
      return { ok: true, normalized: value }
    }
  }
}

export type PatchRouteOpts = {
  table: string
  fieldSpecs: FieldSpecs
  logPrefix: string
}

export function createPatchRoute(opts: PatchRouteOpts) {
  const { table, fieldSpecs, logPrefix } = opts
  return async function PATCH(req: NextRequest, { params }: IdParams) {
    const auth = await requireUser()
    if (auth.response) return auth.response

    if (!ID_REGEX.test(params.id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 })
    }

    const body = await req.json()
    const { field, value } = body

    if (typeof field !== 'string') {
      return NextResponse.json({ error: '편집 불가 필드' }, { status: 403 })
    }
    const spec = fieldSpecs[field]
    if (!spec) {
      return NextResponse.json({ error: '편집 불가 필드' }, { status: 403 })
    }

    const result = validateValue(spec, value)
    if (!result.ok) {
      return NextResponse.json({ error: `잘못된 값: ${result.reason}` }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from(table)
      .update({ [field]: result.normalized })
      .eq('id', params.id)

    if (error) {
      logError(logPrefix, 'PATCH error', error, { field, id: params.id })
      return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }
}

// ─── soft delete: DELETE /api/{table}/[id] ──────────────────────────
export type DeleteRouteOpts = {
  table: string
  logPrefix: string
}

export function createSoftDeleteRoute(opts: DeleteRouteOpts) {
  const { table, logPrefix } = opts
  return async function DELETE(_req: NextRequest, { params }: IdParams) {
    const auth = await requireUser()
    if (auth.response) return auth.response

    if (!ID_REGEX.test(params.id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      logError(logPrefix, 'DELETE error', error, { id: params.id })
      return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }
}

// ─── bulk soft delete: POST /api/{table}/bulk-delete ────────────────
export function createBulkDeleteRoute(opts: DeleteRouteOpts) {
  const { table, logPrefix } = opts
  return async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = await req.json()
    const { ids } = body
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)

    if (error) {
      logError(logPrefix, 'bulk-delete error', error)
      return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true, deletedCount: ids.length })
  }
}

// ─── restore: POST /api/{table}/restore ─────────────────────────────
export function createRestoreRoute(opts: DeleteRouteOpts) {
  const { table, logPrefix } = opts
  return async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = await req.json()
    const { ids } = body
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from(table)
      .update({ deleted_at: null })
      .in('id', ids)

    if (error) {
      logError(logPrefix, 'restore error', error)
      return NextResponse.json({ error: '복구에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true, restoredCount: ids.length })
  }
}

// ─── permanent delete: POST /api/{table}/permanent-delete ───────────
// soft-delete 된 행만 hard-delete 되도록 `deleted_at IS NOT NULL` 가드.
// 실수로 활성 행 id 가 섞여도 no-op.
export function createPermanentDeleteRoute(opts: DeleteRouteOpts) {
  const { table, logPrefix } = opts
  return async function POST(req: NextRequest) {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = await req.json()
    const { ids } = body
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .in('id', ids)
      .not('deleted_at', 'is', null)

    if (error) {
      logError(logPrefix, 'permanent-delete error', error)
      return NextResponse.json({ error: '영구삭제에 실패했습니다' }, { status: 500 })
    }
    return NextResponse.json({ success: true, deletedCount: ids.length })
  }
}
