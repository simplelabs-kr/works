import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const search = searchParams.get("search") ?? "";
  const statusesParam = searchParams.get("statuses") ?? "";
  const stagesParam = searchParams.get("stages") ?? "";

  const statuses = statusesParam ? statusesParam.split(",") : [];
  const stages = stagesParam ? stagesParam.split(",") : [];
  const from = page * PAGE_SIZE;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin
    .from("order_items")
    .select(
      `고유_번호, 소재, 호수, 수량, 상태, 작업_단계, 발주일, 데드라인, 고객명,
brands(name),
products("제품명")`,
      { count: "exact" }
    )
    .neq("중단_취소", true)
    .neq("숨기기", true)
    .order("발주일", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (search)
    q = q.or(`고유_번호.ilike.%${search}%,고객명.ilike.%${search}%`);
  if (statuses.length > 0) q = q.in("상태", statuses);
  if (stages.length > 0) q = q.in("작업_단계", stages);

  const { data, count, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count });
}
