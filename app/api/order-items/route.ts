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
      metal_prices!order_items_metal_price_id_fkey(price_per_gram)
    `)
    .not("중단_취소", "is", true)
    .not("숨기기", "is", true)
    .order("id", { ascending: false });

  if (search) q = q.ilike("고유_번호", `%${search}%`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await q as { data: any[]; error: any };

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
