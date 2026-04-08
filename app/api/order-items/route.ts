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
      데드라인,
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

  if (search) {
    // Resolve 제품명 → product IDs → order IDs for server-side OR filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: matchingProducts } = await (supabaseAdmin as any)
      .from("products").select("id").ilike("제품명", `%${search}%`).limit(100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productIds = (matchingProducts ?? []).map((p: any) => p.id as string);
    let orderIds: string[] = [];

    if (productIds.length > 0) {
      const { data: matchingOrders } = await supabaseAdmin
        .from("orders").select("id").in("product_id", productIds).limit(1000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderIds = (matchingOrders ?? []).map((o: any) => o.id as string);
    }

    if (orderIds.length > 0) {
      // OR: match 고유_번호 OR belong to an order whose product name matches
      q = q.or(`고유_번호.ilike.%${search}%,order_id.in.(${orderIds.join(",")})`);
    } else {
      q = q.ilike("고유_번호", `%${search}%`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await q as { data: any[]; error: any };

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
