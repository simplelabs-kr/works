import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const statuses = searchParams.getAll("statuses");
  const stages = searchParams.getAll("stages");
  const brandIds = searchParams.getAll("brandIds");

  // NOT (col IS TRUE) → includes NULL and false, excludes only explicit true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from("order_items")
    .select(
      `id, 고유_번호, brand_id, product_id, 데드라인, 매몰, 주물, 출고예정일, 소재_최종, 도금_색상, 작업_위치, 작업지시서, 호수, 수량, 고객명, 중량, 검수, 검수_담당, 공임_조정액, 각인_내용, 생산시작일, 상태, 작업_단계, 발주일`
    )
    .not("중단_취소", "is", true)
    .not("숨기기", "is", true)
    .order("발주일", { ascending: false });

  if (search)
    q = q.or(`고유_번호.ilike.%${search}%,고객명.ilike.%${search}%`);
  if (statuses.length > 0) q = q.in("상태", statuses);
  if (stages.length > 0) q = q.in("작업_단계", stages);
  if (brandIds.length > 0) q = q.in("brand_id", brandIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error } = await q as { data: any[]; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Fetch ALL brands and products (reference tables — always small)
  const [brandsRes, productsRes] = await Promise.all([
    supabaseAdmin.from("brands").select("id, name"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any).from("products").select(`id, "제품명"`),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandMap = new Map((brandsRes.data ?? []).map((b: any) => [b.id, b.name]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productMap = new Map((productsRes.data ?? []).map((p: any) => [p.id, p["제품명"]]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = items.map((item: any) => ({
    ...item,
    brands: { name: brandMap.get(item.brand_id) ?? "" },
    products: { "제품명": productMap.get(item.product_id) ?? "" },
  }));

  return NextResponse.json({ data });
}
