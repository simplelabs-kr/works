import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const SELECT = `
  id,
  updated_at,
  고유_번호,
  수량,
  중량,
  데드라인,
  출고일,
  발송일,
  중단_취소,
  검수,
  포장,
  출고,
  작업_위치,
  주물_후_수량,
  rp_출력_시작,
  왁스_파트_전달,
  디자이너_노트,
  사출_방식,
  bundle_id,
  metal_price_id,
  order_id,
  orders!order_items_order_id_fkey(
    brand_id,
    product_id,
    수량,
    발주일,
    생산시작일,
    소재,
    metal_id,
    고객명,
    각인_내용,
    각인_폰트,
    기타_옵션,
    호수,
    확정_공임,
    공임_조정액,
    회차,
    도금_색상,
    체인_길이,
    체인_두께,
    brands!orders_brand_id_fkey(name),
    products!orders_product_id_fkey(제품명, 제작_소요일),
    metals!orders_metal_id_fkey(name, purity)
  ),
  metal_prices!order_items_metal_price_id_fkey(price_per_gram),
  products!order_items_product_id_direct_fkey(
    제품명,
    제작_소요일,
    기준_중량,
    기본_공임,
    검수_유의,
    product_molds!product_molds_product_id_fkey(
      molds!product_molds_mold_id_fkey(
        가다번호,
        mold_positions!molds_mold_position_id_fkey(보관함_위치)
      )
    )
  ),
  bundles!order_items_bundle_id_fkey(번들_고유번호),
  purchases!purchases_order_item_id_fkey(
    이름,
    구분,
    발주,
    수령,
    재고_사용,
    material_id,
    materials!purchases_material_id_fkey(품목명)
  )
`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const search   = body.search   || null;
  const brand    = body.brand    || null;
  const dateFrom = body.dateFrom || null;
  const dateTo   = body.dateTo   || null;
  const offset   = Number(body.offset ?? 0);
  const filters  = body.filters  ?? [];
  const sorts    = body.sorts    ?? [];

  // Step 1: RPC로 id 목록 수집
  const { data: rpcRows, error: rpcError } = await supabaseAdmin
    .rpc("search_order_items_v2", {
      search_term:   search,
      brand_term:    brand,
      date_from:     dateFrom,
      date_to:       dateTo,
      result_offset: offset,
      result_limit:  100,
      filters_json:  filters,
      sorts_json:    sorts,
    });

  if (rpcError) {
    console.error("[order-items] rpc error:", rpcError.message);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const ids = (rpcRows ?? []).map((r: AnyRecord) => r.id);

  // Step 2: 총 카운트 (offset === 0일 때만)
  let totalCount: number | undefined;
  if (offset === 0) {
    const { data: countData, error: countError } = await supabaseAdmin
      .rpc("count_order_items_v2", {
        search_term: search,
        brand_term:  brand,
        date_from:   dateFrom,
        date_to:     dateTo,
        filters_json: filters,
        sorts_json:   sorts,
      });
    if (!countError) {
      totalCount = Number(countData);
    }
  }

  if (ids.length === 0) {
    return NextResponse.json({ data: [], totalCount: totalCount ?? 0 });
  }

  // Step 3: ids로 실제 데이터 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select(SELECT)
    .not("중단_취소", "is", true)
    .in("id", ids) as unknown as { data: any[]; error: any };

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RPC가 반환한 순서 유지
  const idOrder = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
  const sorted = (data ?? []).sort(
    (a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0)
  );

  return NextResponse.json({ data: sorted, totalCount });
}
