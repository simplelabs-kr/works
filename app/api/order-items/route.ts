import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const statuses = searchParams.getAll("statuses");
  const stages = searchParams.getAll("stages");
  const brandIds = searchParams.getAll("brandIds");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from("order_items")
    .select(`id, 고유_번호, product_id, 발주일, 생산시작일, 데드라인, products(제품명, 제작_소요일)`)
    .not("중단_취소", "is", true)
    .not("숨기기", "is", true)
    .order("발주일", { ascending: false });

  if (search)
    q = q.or(`고유_번호.ilike.%${search}%,고객명.ilike.%${search}%`);
  if (statuses.length > 0) q = q.in("상태", statuses);
  if (stages.length > 0) q = q.in("작업_단계", stages);
  if (brandIds.length > 0) q = q.in("brand_id", brandIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await q as { data: any[]; error: any };

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

return NextResponse.json({ data: data ?? [] });
}
