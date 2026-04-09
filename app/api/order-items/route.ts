import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const SELECT = `
  id,
  고유_번호,
  중량,
  데드라인,
  출고일,
  발송일,
  중단_취소,
  검수,
  포장,
  출고,
  가다번호,
  가다_위치,
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
  products!order_items_product_id_direct_fkey(제품명, 제작_소요일)
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search   = searchParams.get("search")   || null;
  const brand    = searchParams.get("brand")    || null;
  const dateFrom = searchParams.get("dateFrom") || null;
  const dateTo   = searchParams.get("dateTo")   || null;
  const offset   = Number(searchParams.get("offset") ?? 0);
  const sortCol  = searchParams.get("sortCol")  || "발주일";
  const sortDir  = searchParams.get("sortDir")  || "desc";

  // Step 1: RPC로 id 목록 수집
  const { data: rpcRows, error: rpcError } = await supabaseAdmin
    .rpc("search_order_items", {
      search_term:   search,
      brand_term:    brand,
      date_from:     dateFrom,
      date_to:       dateTo,
      result_offset: offset,
      result_limit:  100,
      sort_col:      sortCol,
      sort_dir:      sortDir,
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
      .rpc("count_order_items", {
        search_term: search,
        brand_term:  brand,
        date_from:   dateFrom,
        date_to:     dateTo,
      });
    if (!countError) {
      totalCount = Number(countData);
    }
  }

  if (ids.length === 0) {
    return NextResponse.json({ data: [], totalCount: totalCount ?? 0 });
  }

  // Step 3: ids로 실제 데이터 조회
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select(SELECT)
    .not("중단_취소", "is", true)
    .in("id", ids) as { data: AnyRecord[]; error: AnyRecord };

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RPC가 반환한 순서 유지
  const idOrder = new Map(ids.map((id: string, i: number) => [id, i]));
  const sorted = (data ?? []).sort(
    (a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0)
  );

  return NextResponse.json({ data: sorted, totalCount });
}
