import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Wallet, Car, Calendar, Send } from "lucide-react";
import { toast } from "sonner";
import { buyerService } from "@/application/services/buyerService";
import { MobileShell } from "@/components/MobileShell";
import type { PublicBuyerRequest } from "@/domain/types";

export const Route = createFileRoute("/requests")({
  component: RequestsPage,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RequestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PublicBuyerRequest[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await buyerService.listActiveRequests();
        setItems(data);
      } catch (err) {
        toast.error("Couldn't load buyer requests", { description: (err as Error).message });
        setItems([]);
      }
    })();
  }, []);

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 px-6 pt-6 pb-10">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/welcome" })}
            className="press h-10 w-10 rounded-full border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Active Buyer Requests</h1>
            <p className="text-xs text-muted-foreground">Have a matching car? Submit it.</p>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-4">
          {items === null && (
            <div className="text-sm text-muted-foreground py-16 text-center">Loading requests…</div>
          )}
          {items?.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              No active buyer requests right now. Check back soon.
            </div>
          )}
          {items?.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              onRespond={() => navigate({ to: "/sell", search: { request: r.id } })}
            />
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

function RequestCard({ r, onRespond }: { r: PublicBuyerRequest; onRespond: () => void }) {
  const vehicle =
    [r.preferredMake, r.preferredModel].filter(Boolean).join(" ").trim() || "Any make/model";
  const reqs = [
    r.transmission && `${r.transmission} transmission`,
    r.fuelType && r.fuelType,
    r.notes,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-3xl bg-background border border-border p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-tight flex items-center gap-2">
          <Car className="h-4 w-4 text-primary" /> {vehicle}
        </h2>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {formatDate(r.createdAt)}
        </span>
      </div>

      <div className="mt-3 grid gap-1.5 text-sm">
        <Row icon={<Wallet className="h-4 w-4" />} label="Budget" value={r.budget} />
        {r.preferredYear && (
          <Row icon={<Calendar className="h-4 w-4" />} label="Year" value={r.preferredYear} />
        )}
        <Row icon={<MapPin className="h-4 w-4" />} label="Location" value={r.city || "Zambia"} />
        {reqs && (
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Requirements:</span> {reqs}
          </div>
        )}
      </div>

      <button
        onClick={onRespond}
        className="press mt-4 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2"
      >
        <Send className="h-4 w-4" /> Submit Matching Vehicle
      </button>
    </article>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground min-w-16">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
