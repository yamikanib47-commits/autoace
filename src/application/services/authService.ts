/**
 * authService — thin application-layer wrapper around the AuthService
 * port. Exists so route/component code depends on "the app's auth
 * workflow" and not directly on the backend composition root, keeping a
 * single seam if session handling ever needs app-specific logic (e.g.
 * analytics, redirect rules) beyond what the port itself provides.
 */
import { authService as backendAuthService } from "@/backend";
import type { AuthCredentials } from "@/application/validation/schemas";
import { authCredentialsSchema } from "@/application/validation/schemas";

export const authService = {
  getSession: backendAuthService.getSession.bind(backendAuthService),
  onSessionChange: backendAuthService.onSessionChange.bind(backendAuthService),
  signOut: backendAuthService.signOut.bind(backendAuthService),
  hasRole: backendAuthService.hasRole.bind(backendAuthService),

  async signIn(credentials: AuthCredentials) {
    const parsed = authCredentialsSchema.parse(credentials);
    return backendAuthService.signIn(parsed);
  },

  async signUp(credentials: AuthCredentials) {
    const parsed = authCredentialsSchema.parse(credentials);
    return backendAuthService.signUp(parsed);
  },
};
