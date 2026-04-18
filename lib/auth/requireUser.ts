import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

// Shared guard for API route handlers.
// Returns either { user } on success or { response } with a 401 NextResponse
// that the caller should return directly.
export async function requireUser() {
  // Local development bypass — matches middleware.ts behavior so API routes
  // are reachable without a Supabase session during `next dev`.
  //
  // DEV_USER_KEY in .env.local lets you impersonate a different user for
  // collaborative view / ownership testing without needing a real session.
  // Change the env var and restart the dev server to switch identity.
  if (process.env.NODE_ENV === "development") {
    const email = process.env.DEV_USER_KEY || "dev@simplelabs.kr";
    return {
      user: { id: `dev-${email}`, email } as unknown as User,
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
