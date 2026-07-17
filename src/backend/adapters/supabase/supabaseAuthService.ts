import type { AuthService, SignInCredentials, SignUpCredentials } from "@/backend/ports/authService";
import type { AppRole, AuthenticatedUser, Session } from "@/domain/types";
import { supabase } from "./supabaseClient";

function mapUser(user: { id: string; email?: string | null }, roles: AppRole[]): AuthenticatedUser {
  return { id: user.id, email: user.email ?? "", roles };
}

export class SupabaseAuthService implements AuthService {
  private listeners = new Set<(session: Session | null) => void>();

  constructor() {
    supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        void this.emitSession(authSession);
        return;
      }
      window.setTimeout(() => void this.emitSession(authSession), 0);
    });
  }

  private async emitSession(authSession: { access_token: string; user: { id: string; email?: string | null } } | null) {
    const session = authSession ? await this.toAppSession(authSession) : null;
    this.listeners.forEach((listener) => listener(session));
  }

  private async toAppSession(authSession: { access_token: string; user: { id: string; email?: string | null } }): Promise<Session> {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", authSession.user.id);
    if (error) throw new Error(error.message);
    return { user: mapUser(authSession.user, (data ?? []).map((row) => row.role as AppRole)), accessToken: authSession.access_token };
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return this.toAppSession(data.session);
  }

  onSessionChange(callback: (session: Session | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async signIn({ email, password }: SignInCredentials): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? "Unable to sign in");
    return this.toAppSession(data.session);
  }

  async signUp({ email, password }: SignUpCredentials): Promise<{ requiresEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { requiresEmailConfirmation: !data.session };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async hasRole(role: "admin" | "user"): Promise<boolean> {
    const session = await this.getSession();
    return !!session?.user.roles.includes(role);
  }
}
