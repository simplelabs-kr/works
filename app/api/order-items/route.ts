import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from("order_items")
    .select(`
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
    `)
    .not("중단_취소", "is", true)
    .order("id", { ascending: false });

  if (search) {
    // Step 1: products에서 제품명 ilike 검색 → productIds 수집
    const { data: productRows } = await supabaseAdmin
      .from("products")
      .select("id")
      .ilike("제품명", `%${search}%`);

    const productIds = (productRows ?? []).map((p: { id: number }) => p.id);

    // Step 2: 고유번호 검색(q1)과 product_id 기반 검색(q2) 병렬 실행
    const baseQuery = () =>
      supabaseAdmin
        .from("order_items")
        .select(`
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
    `)
        .not("중단_취소", "is", true)
        .order("id", { ascending: false });

    const q1Promise = baseQuery().ilike("고유_번호", `%${search}%`);
    const q2Promise = productIds.length > 0
      ? baseQuery().in("product_id", productIds)
      : Promise.resolve({ data: [], error: null });

    const [r1, r2] = await Promise.all([q1Promise, q2Promise]);

    if (r1.error) {
      console.error("[order-items] q1 error:", r1.error.message);
      return NextResponse.json({ error: r1.error.message }, { status: 500 });
    }
    if (r2.error) {
      console.error("[order-items] q2 error:", r2.error.message);
      return NextResponse.json({ error: r2.error.message }, { status: 500 });
    }

    // Step 3: id 기준 중복 제거
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seen = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = [...(r1.data ?? []), ...(r2.data ?? [])].filter((item: any) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    return NextResponse.json({ data: merged });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await q as { data: any[]; error: any };

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
