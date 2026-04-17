import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

// Shared guard for API route handlers.
// Returns either { user } on success or { response } with a 401 NextResponse
// that the caller should return directly.
export async function requireUser() {
  // Local development bypass — matches middleware.ts behavior so API routes
  // are reachable without a Supabase session during `next dev`.
  if (process.env.NODE_ENV === "development") {
    return {
      user: { id: "dev-user", email: "dev@simplelabs.kr" } as unknown as User,
    };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { user: data.user };
}
