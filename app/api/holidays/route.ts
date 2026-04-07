import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("holidays")
    .select("date");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dates = (data ?? []).map((row: { date: string }) => row.date.slice(0, 10));
  return NextResponse.json({ dates });
}
