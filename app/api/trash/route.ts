import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/requireUser'

export const maxDuration = 10

// 통합 휴지통 — 여러 테이블의 soft-deleted 레코드를 한 화면에서
// 보여주기 위한 엔드포인트. 각 테이블은 자체 소프트 삭제 규칙을
// 가지므로 DataGrid 경로를 재사용하지 않고 여기서 직접 집계한다.
//
// source 필드: 레스토어 엔드포인트가 원본 테이블을 식별하는 데
// 사용. 프런트엔드 라벨링도 이 값으로 분기.
type TrashEntry = {
  source: 'order-items' | 'products'
  sourceLabel: string
  id: string
  deleted_at: string | null
  // 페이지별 표시 필드 — 프런트에서 그대로 렌더한다.
  fields: Record<string, string | null>
}

const PAGE_LIMIT = 200

export async function GET() {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const [orderItemsResult, productsResult] = await Promise.all([
    // order_items: flat_order_details RPC에 trashed_only 플래그 존재.
    supabaseAdmin.rpc('search_flat_order_details', {
      filters_json: [],
      sorts_json: [],
      search_term: null,
      result_offset: 0,
      result_limit: PAGE_LIMIT,
      trashed_only: true,
    }),
    // products: RPC는 trashed_only 를 아직 지원하지 않으므로 직접 조회.
    // brand name은 FK 임베드로 함께 가져온다. 실패하면 brand_id 만 표시.
    supabaseAdmin
      .from('products')
      .select('id, 제품명, 카테고리, brand_id, deleted_at, brands:brand_id(name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(PAGE_LIMIT),
  ])

  const entries: TrashEntry[] = []

  if (orderItemsResult.error) {
    console.error('[trash] order_items rpc error:', orderItemsResult.error.message)
  } else if (Array.isArray(orderItemsResult.data)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of orderItemsResult.data as any[]) {
      entries.push({
        source: 'order-items',
        sourceLabel: '생산관리',
        id: String(row.id),
        deleted_at: row.deleted_at ?? null,
        fields: {
          '제품명[코드]': row['제품명_코드'] ?? null,
          '고객명': row['고객명'] ?? row['거래처명'] ?? null,
          '발주일': row['발주일'] ?? null,
        },
      })
    }
  }

  if (productsResult.error) {
    console.error('[trash] products error:', productsResult.error.message)
  } else if (Array.isArray(productsResult.data)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of productsResult.data as any[]) {
      // brands 임베드는 { name } 객체 또는 null. 레거시/누락 환경을 대비해
      // 오브젝트/배열 양쪽 모두 허용.
      const brandRaw = row.brands
      let brandName: string | null = null
      if (brandRaw && typeof brandRaw === 'object') {
        if (Array.isArray(brandRaw) && brandRaw[0]?.name) brandName = String(brandRaw[0].name)
        else if ('name' in brandRaw && brandRaw.name) brandName = String(brandRaw.name)
      }
      entries.push({
        source: 'products',
        sourceLabel: '제품 관리',
        id: String(row.id),
        deleted_at: row.deleted_at ?? null,
        fields: {
          '제품명': row['제품명'] ?? null,
          '브랜드명': brandName ?? (row.brand_id ? String(row.brand_id) : null),
          '카테고리': row['카테고리'] ?? null,
        },
      })
    }
  }

  // deleted_at DESC. null은 뒤로.
  entries.sort((a, b) => {
    if (!a.deleted_at && !b.deleted_at) return 0
    if (!a.deleted_at) return 1
    if (!b.deleted_at) return -1
    return b.deleted_at.localeCompare(a.deleted_at)
  })

  return NextResponse.json({ entries })
}
