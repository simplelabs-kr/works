import { createClient } from "@supabase/supabase-js";

// Fallback prevents build failure when env vars are not set locally
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"
);
