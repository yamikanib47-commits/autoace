import type { AuthService, SignInCredentials, SignUpCredentials } from "@/backend/ports/authService";
import type { AppRole, AuthenticatedUser, Session } from "@/domain/types";
import { getSupabaseClient, supabaseClientCreated } from "./supabaseClient";

const SESSION_TIMEOUT_MS = 5000;
type SupabaseSession = { access_token: string; user: { id: string; email?: string | null } };

function mapUser(user: { id: string; email?: string | null }, roles: AppRole[]): AuthenticatedUser {
  return { id: user.id, email: user.email ?? "", roles };
}

function withTimeout<T>(promise: PromiseLike<T>, fallback: T, label: string): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = window.setTimeout(() => {
      console.warn(`[auth] ${label} timed out`);
      resolve(fallback);
    }, SESSION_TIMEOUT_MS);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });
}

export class SupabaseAuthService implements AuthService {
  private listeners = new Set<(session: Session | null) => void>();

  constructor() {
    if (!supabaseClientCreated) return;
    getSupabaseClient().auth.onAuthStateChange((event, authSession) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        void this.emitSessionSafely(authSession);
        return;
      }
      window.setTimeout(() => {
        void this.emitSessionSafely(authSession).catch((error) => {
          console.error("[auth] scheduled session emission failed", error);
        });
      }, 0);
    });
  }

  private async emitSessionSafely(authSession: SupabaseSession | null): Promise<void> {
    try {
      const session = await this.emitSession(authSession);
      this.listeners.forEach((listener) => {
        try {
          listener(session);
        } catch (error) {
          console.error("[auth] session listener failed", error);
        }
      });
    } catch (error) {
      console.error("[auth] session emission failed", error);
      this.listeners.forEach((listener) => {
        try {
          listener(authSession ? { user: mapUser(authSession.user, []), accessToken: authSession.access_token } : null);
        } catch (listenerError) {
          console.error("[auth] fallback session listener failed", listenerError);
        }
      });
    }
  }

  private async emitSession(authSession: SupabaseSession | null): Promise<Session | null> {
    if (!authSession) return null;
    return this.toAppSession(authSession);
  }

  private async toAppSession(authSession: SupabaseSession): Promise<Session> {
    const roles = await withTimeout(
      Promise.resolve(getSupabaseClient().from("user_roles").select("role").eq("user_id", authSession.user.id))
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          return (data ?? []).map((row) => row.role as AppRole);
        })
        .catch((error) => {
          console.error("[auth] role lookup failed", error);
          return [];
        }),
      [],
      "role lookup",
    );
    return { user: mapUser(authSession.user, roles), accessToken: authSession.access_token };
  }

  async getSession(): Promise<Session | null> {
    if (!supabaseClientCreated) return null;
    try {
      const result = await withTimeout(getSupabaseClient().auth.getSession(), { data: { session: null }, error: null }, "session initialization");
      if (result.error || !result.data.session) return null;
      return await this.toAppSession(result.data.session);
    } catch (error) {
      console.error("[auth] session initialization failed", error);
      return null;
    }
  }

  onSessionChange(callback: (session: Session | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async signIn({ email, password }: SignInCredentials): Promise<Session> {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? "Unable to sign in");
    return this.toAppSession(data.session);
  }

  async signUp({ email, password }: SignUpCredentials): Promise<{ requiresEmailConfirmation: boolean }> {
    const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { requiresEmailConfirmation: !data.session };
  }

  async signOut(): Promise<void> {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw new Error(error.message);
  }

  async hasRole(role: "admin" | "user"): Promise<boolean> {
    const session = await this.getSession();
    return !!session?.user.roles.includes(role);
  }
}
