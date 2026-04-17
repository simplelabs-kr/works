import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

// 방어적 상한: 일반 사용자는 수십만 건을 페이지네이션해도 이 범위 내. 초과 시 거부.
const MAX_OFFSET = 1_000_000;
const MAX_SEARCH_LENGTH = 200;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const offsetRaw = Number(body.offset ?? 0);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 && offsetRaw <= MAX_OFFSET
    ? Math.floor(offsetRaw)
    : 0;
  const filters     = Array.isArray(body.filters) ? body.filters : (body.filters && typeof body.filters === 'object' ? body.filters : []);
  const sorts       = Array.isArray(body.sorts) ? body.sorts : [];
  const searchRaw   = typeof body.search_term === 'string' ? body.search_term : '';
  const searchTerm  = searchRaw ? searchRaw.slice(0, MAX_SEARCH_LENGTH) : null;

  const noopResult = Promise.resolve({ data: null, error: null } as { data: null; error: null });

  const [dataResult, filterCountResult, searchCountResult] = await Promise.all([
    // 1) data — uses all params including sorts_json
    supabaseAdmin.rpc("search_flat_order_details", {
      filters_json:  filters,
      sorts_json:    sorts,
      search_term:   searchTerm,
      result_offset: offset,
      result_limit:  100,
    }),
    // 2) filterCount (filters only, no search) — count RPC has no sorts_json param
    offset === 0
      ? supabaseAdmin.rpc("count_flat_order_details", { filters_json: filters, search_term: null })
      : noopResult,
    // 3) searchCount (filters + search) — offset===0 and search active
    offset === 0 && searchTerm
      ? supabaseAdmin.rpc("count_flat_order_details", { filters_json: filters, search_term: searchTerm })
      : noopResult,
  ]);

  if (dataResult.error) {
    console.error("[order-items] rpc error:", dataResult.error.message);
    return NextResponse.json({ error: '데이터 조회에 실패했습니다' }, { status: 500 });
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
