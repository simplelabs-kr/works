import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const stages = searchParams.getAll("stages");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from("order_items")
    .select(`
      id,
      고유_번호,
      데드라인,
      작업_단계,
      orders!order_items_order_id_fkey(
        발주일,
        생산시작일,
        고객명,
        brands!orders_brand_id_fkey(name),
        products!orders_product_id_fkey(제품명, 제작_소요일),
        metals!orders_metal_id_fkey(name, purity),
        metal_prices!order_items_metal_price_id_fkey(price_per_gram)
      )
    `)
    .not("중단_취소", "is", true)
    .not("숨기기", "is", true)
    .order("id", { ascending: false });

  if (search) q = q.ilike("고유_번호", `%${search}%`);
  if (stages.length > 0) q = q.in("작업_단계", stages);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await q as { data: any[]; error: any };

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
