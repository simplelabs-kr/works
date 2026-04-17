import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Shared guard for API route handlers.
// Returns either { user } on success or { response } with a 401 NextResponse
// that the caller should return directly.
export async function requireUser() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { user: data.user };
}
