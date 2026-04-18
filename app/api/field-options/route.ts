import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/requireUser";

// GET /api/field-options?table=order_items
//
// Returns select-option catalogs for a given source table, grouped by
// field_name. Used by DataGrid at mount time to hydrate select column
// options (values + background colors) so that the option set can be
// managed from the UI later without a code change.
//
// Response: { data: { [field_name]: { value, bg }[] } }
//   bg may be '' when field_options.color is null in the DB; callers
//   typically merge hardcoded fallback colors until the DB is populated.
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const table = url.searchParams.get("table");
  if (!table) {
    return NextResponse.json({ error: "table param required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("field_options")
    .select("field_name, value, color, sort_order")
    .eq("table_name", table)
    .order("field_name")
    .order("sort_order");

  if (error) {
    console.error("[field-options] supabase error:", error.message);
    return NextResponse.json(
      { error: "옵션 목록 조회에 실패했습니다" },
      { status: 500 }
    );
  }

  const grouped: Record<string, { value: string; bg: string }[]> = {};
  for (const row of data ?? []) {
    const field = row.field_name as string;
    if (!grouped[field]) grouped[field] = [];
    grouped[field].push({
      value: String(row.value ?? ""),
      bg: row.color ?? "",
    });
  }

  return NextResponse.json({ data: grouped });
}
