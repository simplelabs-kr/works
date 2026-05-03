import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createListRoute } from '@/lib/api/createTableRoute'

export const maxDuration = 10

// Grid list (flat_brands).
export const POST = createListRoute({
  searchRpc: 'search_flat_brands',
  countRpc:  'count_flat_brands',
  logPrefix: '[brands]',
})

// Legacy lightweight picker — keeps existing dropdown contract intact.
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("brands")
    .select("id, name")
    .order("name");

  if (error) {
    console.error('[brands] supabase error:', error.message);
    return NextResponse.json({ error: '브랜드 목록 조회에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [] });
}
