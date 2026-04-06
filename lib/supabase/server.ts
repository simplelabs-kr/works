import { createClient } from "@supabase/supabase-js";

// Server-only client using service role key (bypasses RLS)
// Never expose this to the client — no NEXT_PUBLIC_ prefix
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder"
);
