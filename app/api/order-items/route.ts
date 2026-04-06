import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const statusesParam = searchParams.get("statuses") ?? "";
  const stagesParam = searchParams.get("stages") ?? "";

  const statuses = statusesParam ? statusesParam.split(",") : [];
  const stages = stagesParam ? stagesParam.split(",") : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from("order_items")
    .select(
      `고유_번호, brand_id, product_id, 소재, 호수, 수량, 상태, 작업_단계, 발주일, 데드라인, 고객명`
    )
    .neq("중단_취소", true)
    .neq("숨기기", true)
    .order("발주일", { ascending: false });

  if (search)
    q = q.or(`고유_번호.ilike.%${search}%,고객명.ilike.%${search}%`);
  if (statuses.length > 0) q = q.in("상태", statuses);
  if (stages.length > 0) q = q.in("작업_단계", stages);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error } = await q as { data: any[]; error: any };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Fetch brand/product names for unique IDs in results — small queries on PK index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandIds = Array.from(new Set(items.map((i: any) => i.brand_id).filter(Boolean)));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productIds = Array.from(new Set(items.map((i: any) => i.product_id).filter(Boolean)));

  const [brandsRes, productsRes] = await Promise.all([
    brandIds.length > 0
      ? supabaseAdmin.from("brands").select("id, name").in("id", brandIds)
      : Promise.resolve({ data: [] as { id: unknown; name: string }[] }),
    productIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabaseAdmin as any).from("products").select(`id, "제품명"`).in("id", productIds)
      : Promise.resolve({ data: [] as { id: unknown; 제품명: string }[] }),
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
