import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// 방어적 상한 — order-items 와 동일 정책.
const MAX_OFFSET = 1_000_000
const MAX_SEARCH_LENGTH = 200

// 일관성 유지: DB 쪽에 이미 filters_json / sorts_json / search_term 을
// 그대로 소화하는 `search_products` / `count_products` RPC 가 있으므로
// order-items 와 동일한 패턴으로 위임한다. 쿼리 빌더 기반 필터 번역은
// 제거 — 5-컬럼 RPC 제약이 풀리면서 그럴 이유가 사라졌다. 이 라우트는
// 요청 → RPC 파라미터 매핑과 방어적 파싱만 담당한다. 집계/파생 컬럼
// (가다번호_목록, mold_개수, 브랜드명 등) 은 RPC 가 채워서 반환한다.
export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await request.json()
  const offsetRaw = Number(body.offset ?? 0)
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 && offsetRaw <= MAX_OFFSET
    ? Math.floor(offsetRaw)
    : 0
  const filters     = Array.isArray(body.filters) ? body.filters : (body.filters && typeof body.filters === 'object' ? body.filters : [])
  const sorts       = Array.isArray(body.sorts) ? body.sorts : []
  const searchRaw   = typeof body.search_term === 'string' ? body.search_term : ''
  const searchTerm  = searchRaw ? searchRaw.slice(0, MAX_SEARCH_LENGTH) : null
  const trashedOnly = body.trashed_only === true

  const noopResult = Promise.resolve({ data: null, error: null } as { data: null; error: null })

  const [dataResult, filterCountResult, searchCountResult] = await Promise.all([
    // 1) 데이터 — 모든 파라미터 사용
    supabaseAdmin.rpc('search_products', {
      filters_json:  filters,
      sorts_json:    sorts,
      search_term:   searchTerm,
      result_offset: offset,
      result_limit:  100,
      trashed_only:  trashedOnly,
    }),
    // 2) filterCount — 필터만 (검색어 제외). count_products 에는
    //    sorts_json / result_limit / result_offset 파라미터 없음.
    offset === 0
      ? supabaseAdmin.rpc('count_products', { filters_json: filters, search_term: null, trashed_only: trashedOnly })
      : noopResult,
    // 3) searchCount — 필터 + 검색어. offset===0 이고 검색어 있을 때만.
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
