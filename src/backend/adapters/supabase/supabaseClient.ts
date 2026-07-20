import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://vuybamfovddoyowqvmsc.supabase.co";
const supabaseAnonKey = "sb_publishable_ObqxHNSPWkS1qsCedvvgcA_oltYdExw";

export const supabaseUrlConfigured = Boolean(supabaseUrl);
export const supabaseAnonKeyConfigured = Boolean(supabaseAnonKey);
export const supabaseClientCreated = Boolean(supabaseUrl && supabaseAnonKey);

export const edgeFunctionUrl = (name: string) => `${supabaseUrl}/functions/v1/${name}`;

let client: SupabaseClient | null = null;
let clientError: string | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    clientError = error instanceof Error ? error.message : String(error);
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    throw new Error(clientError ?? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }
  return client;
}

export async function getSupabaseDebugState() {
  const state = {
    supabaseUrlExists: supabaseUrlConfigured,
    supabaseAnonKeyExists: supabaseAnonKeyConfigured,
    supabaseClientCreated: Boolean(client),
    clientCreationError: clientError,
    authSessionResult: "not checked" as string,
    currentUserStatus: "not checked" as string,
    startupError: null as string | null,
  };

  if (!client) return state;

  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      state.authSessionResult = `error: ${error.message}`;
      state.currentUserStatus = "unknown";
    } else {
      state.authSessionResult = data.session ? "session found" : "no active session";
      state.currentUserStatus = data.session?.user ? `signed in (${data.session.user.email ?? "email unavailable"})` : "signed out";
    }
  } catch (error) {
    state.startupError = error instanceof Error ? error.message : String(error);
  }

  return state;
}
