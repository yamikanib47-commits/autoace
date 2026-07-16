import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authService } from "@/application/services/authService";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await authService.getSession();
    if (!session) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
