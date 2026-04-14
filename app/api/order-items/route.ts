import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const offset      = Number(body.offset ?? 0);
  const filters     = body.filters     ?? [];
  const sorts       = body.sorts       ?? [];
  const searchTerm  = body.search_term || null;

  const rpcParams = {
    filters_json:  filters,
    sorts_json:    sorts,
    search_term:   searchTerm,
  };

  const [dataResult, countResult] = await Promise.all([
    supabaseAdmin.rpc("search_flat_order_details", {
      ...rpcParams,
      result_offset: offset,
      result_limit:  100,
    }),
    offset === 0
      ? supabaseAdmin.rpc("count_flat_order_details", rpcParams)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (dataResult.error) {
    console.error("[order-items] rpc error:", dataResult.error.message);
    return NextResponse.json({ error: dataResult.error.message }, { status: 500 });
  }

  let totalCount: number | undefined;
  if (countResult.error) {
    console.error("[order-items] count error:", countResult.error.message);
  } else if (countResult.data != null) {
    totalCount = Number(countResult.data);
  }

  return NextResponse.json({ data: dataResult.data ?? [], totalCount });
}
