/**
 * AuthService port.
 *
 * This is the ONLY interface the rest of the app is allowed to use for
 * authentication. It knows nothing about Supabase, JWTs, cookies, or any
 * specific identity provider — an adapter under src/backend/adapters
 * implements this against whatever the real backend (e.g. Zo Computer) uses.
 */
import type { Session } from "@/domain/types";

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface AuthService {
  /** Returns the current session, or null if signed out. */
  getSession(): Promise<Session | null>;

  /** Subscribes to session changes. Returns an unsubscribe function. */
  onSessionChange(callback: (session: Session | null) => void): () => void;

  signIn(credentials: SignInCredentials): Promise<Session>;

  signUp(credentials: SignUpCredentials): Promise<{ requiresEmailConfirmation: boolean }>;

  signOut(): Promise<void>;

  /** Convenience check used to gate the admin dashboard. */
  hasRole(role: "admin" | "user"): Promise<boolean>;
}
