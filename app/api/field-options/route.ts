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

// PUT /api/field-options
//
// 특정 (table_name, field_name) 옵션 카탈로그를 통째로 교체한다.
// Body: { table_name, field_name, options: [{ value, color, sort_order? }] }
//   - sort_order 미지정 시 배열 index 로 부여
//   - 기존 레코드 전부 삭제 후 새 레코드 일괄 insert
//
// 이 "replace" 시맨틱 한 endpoint 로 add / rename / recolor / reorder /
// delete 를 모두 커버한다. 사용자가 옵션 패널에서 작업을 마치고 저장하면
// 현재 상태 전체가 body 로 전송된다.
export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: {
    table_name?: unknown;
    field_name?: unknown;
    options?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const table = typeof body.table_name === "string" ? body.table_name.trim() : "";
  const field = typeof body.field_name === "string" ? body.field_name.trim() : "";
  if (!table || !field) {
    return NextResponse.json(
      { error: "table_name and field_name are required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.options)) {
    return NextResponse.json(
      { error: "options must be an array" },
      { status: 400 }
    );
  }

  // 정규화 — value 는 필수(빈 문자열 금지), color 는 null 허용, sort_order 미지정시 idx.
  const normalized: { value: string; color: string | null; sort_order: number }[] = [];
  const seenValues = new Set<string>();
  for (let i = 0; i < body.options.length; i++) {
    const raw = body.options[i] as { value?: unknown; color?: unknown; sort_order?: unknown };
    const value = typeof raw?.value === "string" ? raw.value.trim() : "";
    if (!value) {
      return NextResponse.json(
        { error: `options[${i}].value is required` },
        { status: 400 }
      );
    }
    if (seenValues.has(value)) {
      return NextResponse.json(
        { error: `duplicate value: "${value}"` },
        { status: 400 }
      );
    }
    seenValues.add(value);
    const color =
      typeof raw?.color === "string" && raw.color.trim() !== "" ? raw.color : null;
    const sortOrder =
      typeof raw?.sort_order === "number" && Number.isFinite(raw.sort_order)
        ? raw.sort_order
        : i;
    normalized.push({ value, color, sort_order: sortOrder });
  }

  // 1) 기존 레코드 삭제
  const { error: delErr } = await supabaseAdmin
    .from("field_options")
    .delete()
    .eq("table_name", table)
    .eq("field_name", field);
  if (delErr) {
    console.error("[field-options PUT] delete error:", delErr.message);
    return NextResponse.json(
      { error: "기존 옵션 삭제에 실패했습니다" },
      { status: 500 }
    );
  }

  // 2) 새 레코드 일괄 insert (빈 배열이면 skip)
  if (normalized.length > 0) {
    const rows = normalized.map((o) => ({
      table_name: table,
      field_name: field,
      value: o.value,
      color: o.color,
      sort_order: o.sort_order,
    }));
    const { error: insErr } = await supabaseAdmin.from("field_options").insert(rows);
    if (insErr) {
      console.error("[field-options PUT] insert error:", insErr.message);
      return NextResponse.json(
        { error: "옵션 저장에 실패했습니다" },
        { status: 500 }
      );
    }
  }

  // 저장된 상태를 GET 과 동일한 shape 로 반환
  return NextResponse.json({
    data: normalized.map((o) => ({ value: o.value, bg: o.color ?? "" })),
  });
}
