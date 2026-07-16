/**
 * REST-backed implementation of AuthService.
 *
 * Expected backend contract (adjust to match Zo Computer's actual auth API
 * — see docs/ARCHITECTURE.md "Backend contract"):
 *   POST /auth/sign-in        { email, password } -> Session
 *   POST /auth/sign-up        { email, password } -> { requiresEmailConfirmation }
 *   POST /auth/sign-out       -> 204
 *   GET  /auth/session        -> Session | 204
 *   GET  /auth/roles          -> { roles: AppRole[] }
 */
import type {
  AuthService,
  SignInCredentials,
  SignUpCredentials,
} from "@/backend/ports/authService";
import type { Session } from "@/domain/types";
import { apiFetch, setAccessToken } from "./httpClient";

const SESSION_STORAGE_KEY = "autoace.session";

type Listener = (session: Session | null) => void;

export class HttpAuthService implements AuthService {
  private listeners = new Set<Listener>();
  private current: Session | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        try {
          this.current = JSON.parse(raw) as Session;
          setAccessToken(this.current.accessToken);
        } catch {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }
  }

  private persist(session: Session | null) {
    this.current = session;
    setAccessToken(session?.accessToken ?? null);
    if (typeof window !== "undefined") {
      if (session) window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    this.listeners.forEach((l) => l(session));
  }

  async getSession(): Promise<Session | null> {
    if (this.current) return this.current;
    try {
      const session = await apiFetch<Session>("/auth/session");
      this.persist(session);
      return session;
    } catch {
      return null;
    }
  }

  onSessionChange(callback: Listener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async signIn({ email, password }: SignInCredentials): Promise<Session> {
    const session = await apiFetch<Session>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    this.persist(session);
    return session;
  }

  async signUp({ email, password }: SignUpCredentials) {
    return apiFetch<{ requiresEmailConfirmation: boolean }>("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
  }

  async signOut(): Promise<void> {
    try {
      await apiFetch<void>("/auth/sign-out", { method: "POST" });
    } finally {
      this.persist(null);
    }
  }

  async hasRole(role: "admin" | "user"): Promise<boolean> {
    const session = await this.getSession();
    return !!session?.user.roles.includes(role);
  }
}
