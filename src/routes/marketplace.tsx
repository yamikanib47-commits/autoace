import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Car, MapPin, Gauge, Fuel, Settings2, Calendar, Search } from "lucide-react";
import { toast } from "sonner";
import { sellerService } from "@/application/services/sellerService";
import { uploadService } from "@/application/services/uploadService";
import type { PublicVehicleListing } from "@/domain/types";

export const Route = createFileRoute("/marketplace")({
  component: Marketplace,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Marketplace() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PublicVehicleListing[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "price_low" | "price_high">("newest");

  useEffect(() => {
    (async () => {
      try {
        const data = await sellerService.listAvailable();
        setItems(data);
      } catch (err) {
        toast.error("Couldn't load vehicles", { description: (err as Error).message });
        setItems([]);
      }
    })();
  }, []);

  const priceNum = (p: string) => Number(String(p).replace(/[^0-9.]/g, "")) || 0;

  const visible = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? items.filter((v) =>
          [v.make, v.model, String(v.year), v.city, v.description]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(needle)),
        )
      : items.slice();
    filtered.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return +new Date(a.createdAt) - +new Date(b.createdAt);
        case "price_low":
          return priceNum(a.price) - priceNum(b.price);
        case "price_high":
          return priceNum(b.price) - priceNum(a.price);
        default:
          return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return filtered;
  }, [items, q, sort]);

  return (
    <div className="min-h-screen w-full bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6 pb-16">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/welcome" })}
            className="press h-10 w-10 rounded-full border border-border bg-background flex items-center justify-center shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold truncate">Available Vehicles</h1>
            <p className="text-xs text-muted-foreground">Cars listed by sellers on AutoAce.</p>
          </div>
        </header>

        <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search make, model, city…"
              className="w-full h-11 pl-9 pr-3 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-11 rounded-full border border-border bg-background text-sm px-4 outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {visible === null && (
            <div className="col-span-full text-sm text-muted-foreground py-16 text-center">
              Loading vehicles…
            </div>
          )}
          {visible?.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              No vehicles match your search.
            </div>
          )}
          {visible?.map((v) => (
            <VehicleCard key={v.id} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ v }: { v: PublicVehicleListing }) {
  const [cover, setCover] = useState<string>("");
  useEffect(() => {
    let alive = true;
    const first = v.photoPaths?.[0];
    if (first) {
      uploadService.resolveVehiclePhotoUrls([first]).then((urls) => {
        if (alive) setCover(urls[0] ?? "");
      });
    }
    return () => {
      alive = false;
    };
  }, [v.photoPaths]);

  const specs = useMemo(
    () =>
      [
        v.mileage && { icon: <Gauge className="h-3.5 w-3.5" />, text: `${v.mileage} km` },
        v.transmission && { icon: <Settings2 className="h-3.5 w-3.5" />, text: v.transmission },
        v.fuelType && { icon: <Fuel className="h-3.5 w-3.5" />, text: v.fuelType },
        v.city && { icon: <MapPin className="h-3.5 w-3.5" />, text: v.city },
      ].filter(Boolean) as { icon: React.ReactNode; text: string }[],
    [v],
  );

  return (
    <Link
      to="/vehicles/$id"
      params={{ id: v.id }}
      className="press block rounded-3xl bg-background border border-border overflow-hidden shadow-[var(--shadow-soft)]"
    >
      <div className="relative aspect-[16/10] bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={`${v.year} ${v.make} ${v.model}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Car className="h-8 w-8" />
          </div>
        )}
        {v.status !== "available" && (
          <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-black/70 text-white">
            {v.status}
          </span>
        )}
        <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-background/90 backdrop-blur">
          {v.price}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-tight truncate">
            {v.year} {v.make} {v.model}
          </h2>
          <span className="text-[11px] text-muted-foreground shrink-0 inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {formatDate(v.createdAt)}
          </span>
        </div>
        {specs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {specs.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5"
              >
                {s.icon} {s.text}
              </span>
            ))}
          </div>
        )}
        {v.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{v.description}</p>
        )}
      </div>
    </Link>
  );
}
