import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const offset      = Number(body.offset ?? 0);
  const filters     = body.filters     ?? [];
  const sorts       = body.sorts       ?? [];
  const searchTerm  = body.search_term || null;

  const baseParams = { filters_json: filters, sorts_json: sorts };

  const noopResult = Promise.resolve({ data: null, error: null } as { data: null; error: null });

  const [dataResult, filterCountResult, searchCountResult] = await Promise.all([
    // 1) data
    supabaseAdmin.rpc("search_flat_order_details", {
      ...baseParams,
      search_term:   searchTerm,
      result_offset: offset,
      result_limit:  100,
    }),
    // 2) filterCount (filters only, no search_term) — offset===0 only
    offset === 0
      ? supabaseAdmin.rpc("count_flat_order_details", { ...baseParams, search_term: null })
      : noopResult,
    // 3) searchCount (filters + search_term) — offset===0 and search active
    offset === 0 && searchTerm
      ? supabaseAdmin.rpc("count_flat_order_details", { ...baseParams, search_term: searchTerm })
      : noopResult,
  ]);

  if (dataResult.error) {
    console.error("[order-items] rpc error:", dataResult.error.message);
    return NextResponse.json({ error: dataResult.error.message }, { status: 500 });
  }

  let filterCount: number | null = null;
  let searchCount: number | null = null;

  if (filterCountResult.error) {
    console.error("[order-items] filterCount error:", filterCountResult.error.message);
  } else if (filterCountResult.data != null) {
    filterCount = Number(filterCountResult.data);
  }

  if (searchCountResult.error) {
    console.error("[order-items] searchCount error:", searchCountResult.error.message);
  } else if (searchCountResult.data != null) {
    searchCount = Number(searchCountResult.data);
  }

  return NextResponse.json({
    data: dataResult.data ?? [],
    filterCount,
    searchCount,
  });
}
