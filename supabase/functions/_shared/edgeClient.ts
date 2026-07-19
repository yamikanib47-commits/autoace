import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseUserClient(request: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Supabase Edge Function configuration is missing");
  return createClient(url, key, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
