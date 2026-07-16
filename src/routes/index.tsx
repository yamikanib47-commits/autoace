import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AutoAceLogo } from "@/components/AutoAceLogo";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/welcome" }), 2200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between py-24 px-8 text-white"
      style={{ background: "var(--gradient-primary)" }}
    >
      <div />
      <div className="flex flex-col items-center gap-4 animate-fade-up">
        <AutoAceLogo tone="light" className="text-5xl" />
        <p className="text-sm font-medium tracking-wide opacity-90">
          Your car journey starts here.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-[3px] border-white/25 border-t-white animate-spin-ring" />
        <p className="text-xs font-medium opacity-80">Loading your experience…</p>
      </div>
    </div>
  );
}
