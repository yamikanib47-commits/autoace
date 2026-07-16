import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Tag } from "lucide-react";
import { AutoAceLogo } from "@/components/AutoAceLogo";
import { MobileShell } from "@/components/MobileShell";
import heroSedan from "@/assets/hero-sedan.png";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  return (
    <MobileShell>
      <div className="flex flex-col flex-1 px-6 pt-10 pb-8 animate-fade-up">
        <div className="flex justify-center">
          <AutoAceLogo className="text-2xl" />
        </div>

        <div className="mt-8">
          <h1 className="text-[40px] leading-[1.05] font-black tracking-tight text-foreground">
            Your car
            <br />
            journey
            <br />
            starts here.
          </h1>
          <p className="mt-4 text-base text-muted-foreground max-w-[320px]">
            Buy or sell your next car, the easy way.
          </p>
        </div>

        <div className="relative flex-1 flex items-center justify-center my-6 min-h-[220px]">
          <div className="absolute bottom-4 h-6 w-56 rounded-[50%] bg-black/20 blur-2xl" />
          <img
            src={heroSedan}
            alt="Premium white sedan"
            width={1280}
            height={896}
            className="relative w-full max-w-[380px] object-contain animate-float drop-shadow-[0_30px_40px_rgba(30,61,255,0.15)]"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate({ to: "/buy" })}
            className="press w-full h-16 rounded-3xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-3 shadow-[var(--shadow-soft)]"
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={2.4} />
            Buy Car
          </button>
          <button
            onClick={() => navigate({ to: "/sell" })}
            className="press w-full h-16 rounded-3xl bg-secondary text-foreground font-semibold text-base flex items-center justify-center gap-3 border border-border"
          >
            <Tag className="h-5 w-5" strokeWidth={2.4} />
            Sell Car
          </button>
        </div>

        <button
          onClick={() => navigate({ to: "/marketplace" })}
          className="press mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Browse available cars →
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Trusted by thousands of Zambian car buyers and sellers.
        </p>
      </div>
    </MobileShell>
  );
}
