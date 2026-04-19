import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// 방어적 상한: 제품 수는 order_items보다 훨씬 작지만 같은 한도 재사용.
const MAX_OFFSET = 1_000_000
const MAX_SEARCH_LENGTH = 200

// DB 쪽 실제 RPC 시그니처
//   search_products(p_search, p_brand_id, p_category, p_개발_현황,
//                   p_발주_가능, p_제공_중단, p_limit, p_offset)
//   count_products (p_search, p_brand_id, p_category, p_개발_현황,
//                   p_발주_가능, p_제공_중단)
// DataGrid가 기본으로 보내는 포맷(generic filters 배열, sorts 배열,
// search_term, offset, trashed_only)과 달리 이 RPC는 5개의 한정된 필터
// 컬럼만 discrete 파라미터로 받는다. 따라서 DataGrid의 filters 배열에서
// 해당 컬럼에 대한 단순 equality 조건만 골라 extract 하고, 나머지
// 복잡한 필터 / sorts / trashedOnly 는 RPC가 아직 지원하지 않으므로
// 현재 버전에서는 무시한다 (서버 RPC에 해당 기능 추가 전까지 TODO).

type FilterValueShape = {
  column?: unknown
  columnName?: unknown
  field?: unknown
  operator?: unknown
  value?: unknown
}

// DataGrid filters 배열에서 특정 컬럼의 단순 equality / contains 조건을
// 찾아 scalar 값으로 반환. 복잡한 AND/OR 구조, 범위 비교 등은 무시 —
// RPC가 표현할 수 없는 필터는 그냥 버린다.
function pickDiscreteFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any,
  targetColumn: string,
): unknown {
  if (!filters) return null
  const queue: unknown[] = Array.isArray(filters) ? [...filters] : [filters]
  while (queue.length) {
    const node = queue.shift()
    if (!node || typeof node !== 'object') continue
    const obj = node as Record<string, unknown>
    // Nested groups: push children.
    if (Array.isArray(obj.conditions)) queue.push(...obj.conditions)
    if (Array.isArray(obj.rules)) queue.push(...obj.rules)
    if (Array.isArray(obj.children)) queue.push(...obj.children)
    const leaf = obj as FilterValueShape
    const col = leaf.column ?? leaf.columnName ?? leaf.field
    if (typeof col !== 'string' || col !== targetColumn) continue
    const op = typeof leaf.operator === 'string' ? leaf.operator.toLowerCase() : ''
    if (op && !['=', '==', 'eq', 'equals', 'is', 'contains', 'includes'].includes(op)) continue
    return leaf.value ?? null
  }
  return null
}

function asBoolOrNull(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}
function asStringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s : null
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await request.json()
  const offsetRaw = Number(body.offset ?? 0)
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 && offsetRaw <= MAX_OFFSET
    ? Math.floor(offsetRaw)
    : 0

  const searchRaw  = typeof body.search_term === 'string' ? body.search_term : ''
  const p_search = searchRaw ? searchRaw.slice(0, MAX_SEARCH_LENGTH) : null

  // body.* 로 직접 전달된 discrete 필터 > body.filters 배열에서 추출한 값.
  // DataGrid가 나중에 discrete 경로로 전환되어도 동작하도록 양쪽 모두 수용.
  const rawFilters = body.filters
  const p_brand_id   = asStringOrNull(body.brand_id   ?? pickDiscreteFilter(rawFilters, 'brand_id'))
  const p_category   = asStringOrNull(body.category   ?? pickDiscreteFilter(rawFilters, '카테고리'))
  const p_개발_현황  = asStringOrNull(body.개발_현황 ?? pickDiscreteFilter(rawFilters, '개발_현황'))
  const p_발주_가능  = asBoolOrNull(body.발주_가능 ?? pickDiscreteFilter(rawFilters, '발주_가능'))
  const p_제공_중단  = asBoolOrNull(body.제공_중단 ?? pickDiscreteFilter(rawFilters, '제공_중단'))

  const searchParams = {
    p_search,
    p_brand_id,
    p_category,
    p_개발_현황,
    p_발주_가능,
    p_제공_중단,
    p_limit: 100,
    p_offset: offset,
  }
  const countParams = {
    p_search: null as string | null,
    p_brand_id,
    p_category,
    p_개발_현황,
    p_발주_가능,
    p_제공_중단,
  }

  const noopResult = Promise.resolve({ data: null, error: null } as { data: null; error: null })

  const [dataResult, filterCountResult, searchCountResult] = await Promise.all([
    supabaseAdmin.rpc('search_products', searchParams),
    offset === 0
      ? supabaseAdmin.rpc('count_products', countParams)
      : noopResult,
    offset === 0 && p_search
      ? supabaseAdmin.rpc('count_products', { ...countParams, p_search })
      : noopResult,
  ])

  if (dataResult.error) {
    console.error('[products] rpc error:', dataResult.error.message)
    return NextResponse.json({ error: '데이터 조회에 실패했습니다' }, { status: 500 })
  }

  let filterCount: number | null = null
  let searchCount: number | null = null

  if (filterCountResult.error) {
    console.error('[products] filterCount error:', filterCountResult.error.message)
  } else if (filterCountResult.data != null) {
    filterCount = Number(filterCountResult.data)
  }

  if (searchCountResult.error) {
    console.error('[products] searchCount error:', searchCountResult.error.message)
  } else if (searchCountResult.data != null) {
    searchCount = Number(searchCountResult.data)
  }

  return NextResponse.json({
    data: dataResult.data ?? [],
    filterCount,
    searchCount,
  })
}
