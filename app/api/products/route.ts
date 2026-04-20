import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

const MAX_OFFSET = 1_000_000
const MAX_SEARCH_LENGTH = 200
const PAGE_SIZE = 100

// ── Contract ─────────────────────────────────────────────────────────────────
//
// 예전 버전은 PL/pgSQL RPC (`search_products`) 를 호출했지만 RPC 시그니처가
// 5개의 고정 discrete 필터 컬럼만 받아서 제품명 / 제품코드 / 원가_* /
// 기준_중량 등 대부분의 컬럼에 건 필터가 조용히 drop되는 문제가 있었다.
// FilterModal 은 col.title 을 condition.column 에 저장하므로 이름과 data
// 필드가 다른 컬럼은 더더욱 매칭이 안 됐다.
//
// 현재 구현은 products 테이블을 직접 쿼리한다. brands 는 FK embed 로 join
// 하며, 모든 FilterCondition 을 Supabase 쿼리 빌더 호출로 번역한다. 결과가
// order-items 와 동일한 자유도로 필터링된다. RPC 가 계산해 주던 일부
// 파생/집계 컬럼 (parent_여부, 가다번호_목록, mold_개수, sample_개수,
// claim_개수) 은 현 코드에서는 채우지 않는다 — 이 값들을 다시 돌려주려면
// 별도 DB 함수가 필요하며 현재 스코프 밖이다.

// '브랜드' / '브랜드명' 필터는 products 테이블이 아닌 brands 조인 컬럼을
// 대상으로 한다. Supabase left-join 에서 외부 테이블 필터는 행을 drop
// 하지 않기 때문에 이 라우트는 filter 처리 전에 brand_id 리스트로 사전
// 해석 후 products.brand_id IN (...) 로 필터를 건다.
const BRAND_FILTER_COLUMNS = new Set(['브랜드', '브랜드명'])

// ── Filter column map (FilterCondition.column → products DB 컬럼) ────────────
//
// FilterModal 이 col.title 을 condition.column 에 저장하기 때문에 API 쪽에서
// data 이름으로 매핑해 줘야 한다. 이름과 data 가 같은 컬럼은 recoverable 하게
// pass-through 하지만 공백 / 괄호 / 대시 등으로 서식이 다른 컬럼은 이 맵이
// 유일한 진실이다. productsConfig.PRODUCTS_COLUMNS 와 동기화 필요.
// 브랜드 계열은 BRAND_FILTER_COLUMNS 로 별도 처리하므로 맵에서 제외.
const FILTER_COLUMN_MAP: Record<string, string> = {
  '제품코드': '제품코드',
  '제품명': '제품명',
  '카테고리': '카테고리',
  '발주 가능': '발주_가능',
  '발주_가능': '발주_가능',
  '제공 중단': '제공_중단',
  '제공_중단': '제공_중단',
  '개발 현황': '개발_현황',
  '개발_현황': '개발_현황',
  '제작 소요일': '제작_소요일',
  '기준 중량': '기준_중량',
  '체인 두께': '체인_두께',
  '마감/잠금': '마감_잠금',
  '체류지': '체류지',
  '기본 공임': '기본_공임',
  '추가금(도금)': '추가금_도금',
  '추가금(SIL)': '추가금_sil',
  '추가금(WG)': '추가금_wg',
  '추가금(YG)': '추가금_yg',
  '추가금(RG)': '추가금_rg',
  '[원가] 스톤세팅비': '원가_스톤세팅비',
  '[원가] 원자재비': '원가_원자재비',
  '[원가] 주물비': '원가_주물비',
  '[원가] 고정각인비': '원가_고정각인비',
  '[원가] 폴리싱비': '원가_폴리싱비',
  '[원가] 기타': '원가_기타',
  '[원가] 체인비': '원가_체인비',
  '[원가] 심플랩스': '원가_심플랩스',
  '검수 유의': '검수_유의',
  '작업지시서': '작업지시서',
  '파일 경로': '파일_경로',
  '개발 슬랙 링크': '개발_슬랙_링크',
  '개발 슬랙 ID': '개발_슬랙_id',
  '슬랙 Thread ID': '슬랙_thread_id',
}

// ── Filter types (matches FilterModal.tsx 의 FilterCondition / FilterGroup) ──
type FilterCondition = {
  id?: string
  column?: unknown
  operator?: unknown
  value?: unknown
}
type FilterGroup = {
  id?: string
  logic?: 'AND' | 'OR'
  conditions?: unknown
}
type FilterNode = FilterCondition | FilterGroup
type RootFilterState = {
  logic?: 'AND' | 'OR'
  conditions?: unknown
}

function isGroup(node: FilterNode): node is FilterGroup {
  return !!node && typeof node === 'object' && Array.isArray((node as FilterGroup).conditions)
}

// LIKE wildcard escape. `%` / `_` 는 LIKE 메타문자이므로 사용자 입력값에
// 들어있으면 literal 로 처리한다. 백슬래시는 LIKE 기본 escape 문자.
function escapeLike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

// Supabase/PostgREST .or() 인자로 들어가는 값은 `,` 와 `)` 를 포함하면
// 구문을 깨뜨린다. 대부분의 텍스트 검색엔 문제없지만 방어적으로 제거.
function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, '')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCondition(q: any, cond: FilterCondition): any {
  const rawColumn = typeof cond.column === 'string' ? cond.column : ''
  if (!rawColumn) return q
  const field = FILTER_COLUMN_MAP[rawColumn] ?? rawColumn
  const op = typeof cond.operator === 'string' ? cond.operator : ''
  const value = cond.value

  switch (op) {
    case '=':
    case '==':
    case 'eq':
    case 'equals':
    case 'is':
      if (value == null) return q.is(field, null)
      return q.eq(field, value)
    case 'is_not':
    case 'neq':
      if (value == null) return q.not(field, 'is', null)
      return q.neq(field, value)
    case 'contains':
    case 'includes':
      if (typeof value !== 'string' || !value) return q
      return q.ilike(field, `%${escapeLike(value)}%`)
    case 'not_contains':
      if (typeof value !== 'string' || !value) return q
      return q.not(field, 'ilike', `%${escapeLike(value)}%`)
    case 'is_empty':
      // null 또는 빈 문자열 둘 다 비어있음으로 간주.
      return q.or(`${field}.is.null,${field}.eq.`)
    case 'is_not_empty':
      return q.not(field, 'is', null).neq(field, '')
    case 'is_checked':
      return q.eq(field, true)
    case 'is_unchecked':
      // false 또는 null 을 체크 안 됨으로 간주.
      return q.or(`${field}.eq.false,${field}.is.null`)
    case 'is_any_of':
      if (!Array.isArray(value) || value.length === 0) return q
      return q.in(field, value)
    case 'is_none_of':
      if (!Array.isArray(value) || value.length === 0) return q
      return q.not(field, 'in', `(${value.map(v => String(v)).join(',')})`)
    case 'gt':
      return q.gt(field, value)
    case 'gte':
      return q.gte(field, value)
    case 'lt':
      return q.lt(field, value)
    case 'lte':
      return q.lte(field, value)
    case 'is_before':
      return q.lt(field, value)
    case 'is_after':
      return q.gt(field, value)
    case 'is_on_or_before':
      return q.lte(field, value)
    case 'is_on_or_after':
      return q.gte(field, value)
    default:
      // 지원하지 않는 operator (is_today 등 상대 날짜) 는 일단 drop.
      // 필요해지는 시점에 케이스별로 채우자.
      console.warn('[products] unsupported filter operator:', op, 'for column', rawColumn)
      return q
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, root: RootFilterState | unknown, brandIdFilter: string[] | null): any {
  if (brandIdFilter) {
    if (brandIdFilter.length === 0) {
      // 매칭되는 브랜드가 없으면 결과도 없어야 한다. 존재 불가능한 id 로
      // in 조건을 걸어 빈 결과 강제.
      q = q.in('brand_id', ['__no_match__'])
    } else {
      q = q.in('brand_id', brandIdFilter)
    }
  }
  if (!root || typeof root !== 'object') return q
  const state = root as RootFilterState
  const conditions = Array.isArray(state.conditions) ? state.conditions : []
  const rootLogic = state.logic === 'OR' ? 'OR' : 'AND'

  // OR at root level or groups: 현재 단순화 — root AND 만 필터 푸시다운을
  // 수행한다. OR 루트는 각 조건을 그대로 무시하지 않고 응용하지만 정확도
  // 보장은 힘들다. FilterModal UI 의 기본값은 AND 이므로 대부분 OK.
  if (rootLogic === 'OR' && conditions.length > 1) {
    console.warn('[products] OR at root with multiple conditions — falling back to AND')
  }

  for (const node of conditions) {
    if (!node || typeof node !== 'object') continue
    if (isGroup(node as FilterNode)) {
      // 중첩 그룹: 현재 단순 평탄화. 그룹 내부 조건을 모두 AND 로 강제 —
      // 그룹의 OR/AND 구분은 추후 .or() 빌더로 개선 가능.
      const inner = Array.isArray((node as FilterGroup).conditions)
        ? (node as FilterGroup).conditions as unknown[]
        : []
      for (const sub of inner) {
        if (sub && typeof sub === 'object' && !isGroup(sub as FilterNode)) {
          const col = (sub as FilterCondition).column
          if (typeof col === 'string' && BRAND_FILTER_COLUMNS.has(col)) continue
          q = applyCondition(q, sub as FilterCondition)
        }
      }
    } else {
      const col = (node as FilterCondition).column
      if (typeof col === 'string' && BRAND_FILTER_COLUMNS.has(col)) continue
      q = applyCondition(q, node as FilterCondition)
    }
  }
  return q
}

// 브랜드 관련 필터 조건을 수집해서 실제 brand_id 리스트로 변환한다.
// 조건이 없으면 null 을 돌려 products 쿼리에 brand_id 필터를 걸지 않는다.
function collectBrandConditions(root: RootFilterState | unknown): FilterCondition[] {
  const out: FilterCondition[] = []
  if (!root || typeof root !== 'object') return out
  const state = root as RootFilterState
  const conditions = Array.isArray(state.conditions) ? state.conditions : []
  for (const node of conditions) {
    if (!node || typeof node !== 'object') continue
    if (isGroup(node as FilterNode)) {
      const inner = Array.isArray((node as FilterGroup).conditions)
        ? (node as FilterGroup).conditions as unknown[]
        : []
      for (const sub of inner) {
        if (!sub || typeof sub !== 'object' || isGroup(sub as FilterNode)) continue
        const col = (sub as FilterCondition).column
        if (typeof col === 'string' && BRAND_FILTER_COLUMNS.has(col)) out.push(sub as FilterCondition)
      }
    } else {
      const col = (node as FilterCondition).column
      if (typeof col === 'string' && BRAND_FILTER_COLUMNS.has(col)) out.push(node as FilterCondition)
    }
  }
  return out
}

async function resolveBrandIdFilter(
  conditions: FilterCondition[],
): Promise<string[] | null> {
  if (conditions.length === 0) return null
  // 각 조건을 brands 테이블에 독립적으로 적용한 뒤 교집합을 구한다.
  // 보통은 브랜드 필터가 하나뿐이지만 사용자가 여러 개 걸 수도 있으므로
  // AND 시맨틱을 유지한다.
  let matchedIds: Set<string> | null = null
  for (const cond of conditions) {
    const op = typeof cond.operator === 'string' ? cond.operator : ''
    const val = cond.value
    let q = supabaseAdmin.from('brands').select('id')
    switch (op) {
      case '=': case '==': case 'eq': case 'equals': case 'is':
        if (typeof val !== 'string') return []
        q = q.eq('name', val)
        break
      case 'is_not': case 'neq':
        if (typeof val !== 'string') return []
        q = q.neq('name', val)
        break
      case 'contains': case 'includes':
        if (typeof val !== 'string' || !val) continue
        q = q.ilike('name', `%${escapeLike(val)}%`)
        break
      case 'not_contains':
        if (typeof val !== 'string' || !val) continue
        q = q.not('name', 'ilike', `%${escapeLike(val)}%`)
        break
      case 'is_empty':
        q = q.or('name.is.null,name.eq.')
        break
      case 'is_not_empty':
        q = q.not('name', 'is', null).neq('name', '')
        break
      case 'is_any_of':
        if (!Array.isArray(val) || val.length === 0) continue
        q = q.in('name', val)
        break
      case 'is_none_of':
        if (!Array.isArray(val) || val.length === 0) continue
        q = q.not('name', 'in', `(${val.map(v => String(v)).join(',')})`)
        break
      default:
        console.warn('[products] unsupported brand filter operator:', op)
        continue
    }
    const { data, error } = await q
    if (error) {
      console.error('[products] brand resolve error:', error.message)
      return []
    }
    const ids = new Set<string>((data ?? []).map(r => String(r.id)))
    if (matchedIds == null) {
      matchedIds = ids
    } else {
      const next = new Set<string>()
      matchedIds.forEach(id => { if (ids.has(id)) next.add(id) })
      matchedIds = next
    }
    if (matchedIds.size === 0) return []
  }
  if (!matchedIds) return []
  const out: string[] = []
  matchedIds.forEach(id => out.push(id))
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySearchTerm(q: any, term: string | null): any {
  if (!term) return q
  // 서버에서 검색해야 하는 텍스트 컬럼 집합. 이 집합은 사용자가 검색창에
  // 기대하는 대상과 일치해야 한다 — 제품명 / 제품코드가 가장 흔함.
  const needle = `%${escapeLike(sanitizeForOr(term))}%`
  return q.or(`제품명.ilike.${needle},제품코드.ilike.${needle}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySorts(q: any, sorts: unknown): any {
  if (!Array.isArray(sorts)) return q
  for (const s of sorts) {
    if (!s || typeof s !== 'object') continue
    const col = (s as { column?: unknown }).column
    const dir = (s as { direction?: unknown }).direction
    if (typeof col !== 'string' || !col) continue
    const field = FILTER_COLUMN_MAP[col] ?? col
    const ascending = dir === 'asc'
    q = q.order(field, { ascending, nullsFirst: false })
  }
  return q
}

// 공용 SELECT 절. products 네이티브 + brands embed. 파생/집계 컬럼
// (가다번호_목록, mold_개수 등) 은 포함되지 않으므로 UI 에서 공란으로
// 렌더된다. 필터/정렬/검색 동작이 우선이므로 수용 가능한 트레이드오프.
const SELECT_FIELDS = '*, brands:brand_id(name)'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductRawRow = Record<string, any>

function flattenBrand(row: ProductRawRow): ProductRawRow {
  // brands embed 는 { name } 단일 객체 또는 배열. 레거시 응답도 수용.
  const b = row.brands
  let 브랜드명: string | null = null
  if (b && typeof b === 'object') {
    if (Array.isArray(b) && b[0]?.name) 브랜드명 = String(b[0].name)
    else if ('name' in b && b.name) 브랜드명 = String(b.name)
  }
  const { brands: _discard, ...rest } = row
  return { ...rest, 브랜드명 }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await request.json()
  const offsetRaw = Number(body.offset ?? 0)
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 && offsetRaw <= MAX_OFFSET
    ? Math.floor(offsetRaw)
    : 0

  const searchRaw = typeof body.search_term === 'string' ? body.search_term : ''
  const searchTerm = searchRaw ? searchRaw.slice(0, MAX_SEARCH_LENGTH) : null

  // 브랜드 필터는 products 테이블에 존재하지 않으므로 brands 쿼리로 먼저
  // brand_id 집합으로 해석한 뒤 products.brand_id IN (...) 로 적용한다.
  const brandConditions = collectBrandConditions(body.filters)
  const brandIdFilter = await resolveBrandIdFilter(brandConditions)

  // ── Data 조회 (필터 + 검색 + 정렬 + 페이지) ──
  let dataQ = supabaseAdmin
    .from('products')
    .select(SELECT_FIELDS)
  dataQ = applyFilters(dataQ, body.filters, brandIdFilter)
  dataQ = applySearchTerm(dataQ, searchTerm)
  dataQ = applySorts(dataQ, body.sorts)
  // updated_at DESC 를 암묵 tie-breaker 로. 명시 정렬이 있으면 그 뒤에 추가.
  dataQ = dataQ.order('updated_at', { ascending: false, nullsFirst: false })
  dataQ = dataQ.range(offset, offset + PAGE_SIZE - 1)

  // ── Count 조회 (필터만 적용, offset=0 에서만) ──
  const noopResult = Promise.resolve({ data: null, error: null, count: null } as { data: null; error: null; count: number | null })

  const filterCountPromise = offset === 0
    ? (() => {
        let q = supabaseAdmin.from('products').select('id', { count: 'exact', head: true })
        q = applyFilters(q, body.filters, brandIdFilter)
        return q
      })()
    : noopResult

  const searchCountPromise = offset === 0 && searchTerm
    ? (() => {
        let q = supabaseAdmin.from('products').select('id', { count: 'exact', head: true })
        q = applyFilters(q, body.filters, brandIdFilter)
        q = applySearchTerm(q, searchTerm)
        return q
      })()
    : noopResult

  const [dataResult, filterCountResult, searchCountResult] = await Promise.all([
    dataQ,
    filterCountPromise,
    searchCountPromise,
  ])

  if (dataResult.error) {
    console.error('[products] query error:', dataResult.error.message)
    return NextResponse.json({ error: '데이터 조회에 실패했습니다' }, { status: 500 })
  }

  const rows = Array.isArray(dataResult.data)
    ? (dataResult.data as ProductRawRow[]).map(flattenBrand)
    : []

  let filterCount: number | null = null
  let searchCount: number | null = null

  if (filterCountResult.error) {
    console.error('[products] filterCount error:', filterCountResult.error.message)
  } else if (filterCountResult.count != null) {
    filterCount = Number(filterCountResult.count)
  }

  if (searchCountResult.error) {
    console.error('[products] searchCount error:', searchCountResult.error.message)
  } else if (searchCountResult.count != null) {
    searchCount = Number(searchCountResult.count)
  }

  return NextResponse.json({
    data: rows,
    filterCount,
    searchCount,
  })
}
