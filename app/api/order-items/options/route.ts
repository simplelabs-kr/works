import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("order_items")
    .select("상태, 작업_단계")
    .limit(2000);

  if (error || !data) {
    return NextResponse.json({ statuses: [], stages: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statuses = Array.from(new Set(data.map((r: any) => r.상태).filter(Boolean) as string[])).sort();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stages = Array.from(new Set(data.map((r: any) => r.작업_단계).filter(Boolean) as string[])).sort();

  return NextResponse.json({ statuses, stages });
}
