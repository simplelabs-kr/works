import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const offset  = Number(body.offset ?? 0);
  const filters = body.filters ?? [];
  const sorts   = body.sorts   ?? [];

  const { data, error } = await supabaseAdmin.rpc("search_flat_order_details", {
    filters_json:  filters,
    sorts_json:    sorts,
    result_offset: offset,
    result_limit:  100,
  });

  if (error) {
    console.error("[order-items] rpc error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
