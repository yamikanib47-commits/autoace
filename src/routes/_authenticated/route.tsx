import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authService } from "@/application/services/authService";

const AUTH_TIMEOUT_MS = 6000;

async function getSessionSafely() {
  try {
    return await Promise.race([
      authService.getSession(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
    ]);
  } catch (error) {
    console.error("[auth-route] session restore failed", error);
    return null;
  }
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await getSessionSafely();
    if (!session) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
