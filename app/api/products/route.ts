import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// 방어적 상한: 제품 수는 order_items보다 훨씬 작지만 같은 한도 재사용.
const MAX_OFFSET = 1_000_000
const MAX_SEARCH_LENGTH = 200

// DataGrid compat: list/search는 POST. search_products RPC는 JOIN된 파생
// 컬럼(브랜드명, parent_여부, 가다번호_목록, 가다위치_목록, mold_개수,
// sample_개수, claim_개수)까지 포함해 반환한다.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await request.json()
  const offsetRaw = Number(body.offset ?? 0)
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 && offsetRaw <= MAX_OFFSET
    ? Math.floor(offsetRaw)
    : 0
  const filters    = Array.isArray(body.filters) ? body.filters : (body.filters && typeof body.filters === 'object' ? body.filters : [])
  const sorts      = Array.isArray(body.sorts) ? body.sorts : []
  const searchRaw  = typeof body.search_term === 'string' ? body.search_term : ''
  const searchTerm = searchRaw ? searchRaw.slice(0, MAX_SEARCH_LENGTH) : null
  const trashedOnly = body.trashed_only === true

  const noopResult = Promise.resolve({ data: null, error: null } as { data: null; error: null })

  const [dataResult, filterCountResult, searchCountResult] = await Promise.all([
    supabaseAdmin.rpc('search_products', {
      filters_json:  filters,
      sorts_json:    sorts,
      search_term:   searchTerm,
      result_offset: offset,
      result_limit:  100,
      trashed_only:  trashedOnly,
    }),
    offset === 0
      ? supabaseAdmin.rpc('count_products', { filters_json: filters, search_term: null, trashed_only: trashedOnly })
      : noopResult,
    offset === 0 && searchTerm
      ? supabaseAdmin.rpc('count_products', { filters_json: filters, search_term: searchTerm, trashed_only: trashedOnly })
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
