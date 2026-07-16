import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Car,
  Heart,
  MapPin,
  Gauge,
  Fuel,
  Settings2,
  Calendar,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { vehicleInterestSchema } from "@/application/validation/schemas";
import { sellerService } from "@/application/services/sellerService";
import { uploadService } from "@/application/services/uploadService";
import { vehicleInterestService } from "@/application/services/vehicleInterestService";
import { MobileShell } from "@/components/MobileShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PublicVehicleListing } from "@/domain/types";

export const Route = createFileRoute("/vehicles/$id")({
  component: VehicleDetails,
});

function VehicleDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<PublicVehicleListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [interestOpen, setInterestOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = await sellerService.getById(id);
        setVehicle(v);
        setLoading(false);
        if (v?.photoPaths?.length) {
          const urls = await uploadService.resolveVehiclePhotoUrls(v.photoPaths);
          setPhotos(urls.filter(Boolean));
        }
      } catch (err) {
        toast.error("Couldn't load vehicle", { description: (err as Error).message });
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <MobileShell>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </MobileShell>
    );
  }
  if (!vehicle) {
    return (
      <MobileShell>
        <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">This vehicle is no longer listed.</p>
          <Link
            to="/marketplace"
            className="press inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium"
          >
            Browse marketplace
          </Link>
        </div>
      </MobileShell>
    );
  }

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-28">
        <div className="relative">
          <button
            onClick={() => navigate({ to: "/marketplace" })}
            className="press absolute top-4 left-4 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="relative aspect-[4/3] bg-muted">
            {photos[0] ? (
              <button type="button" onClick={() => setLightbox(0)} className="block h-full w-full">
                <img
                  src={photos[0]}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <Car className="h-10 w-10" />
              </div>
            )}
            {vehicle.status !== "available" && (
              <span className="absolute top-4 right-4 text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-black/70 text-white">
                {vehicle.status}
              </span>
            )}
          </div>
        </div>

        {photos.length > 1 && (
          <div className="px-6 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={() => setLightbox(i)}
                className="press shrink-0 h-16 w-20 rounded-xl overflow-hidden border border-border bg-muted"
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="px-6 mt-5 flex flex-col gap-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-black leading-tight">{title}</h1>
              <span className="text-lg font-bold whitespace-nowrap">{vehicle.price}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Listed{" "}
              {new Date(vehicle.createdAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Spec
              icon={<Gauge className="h-4 w-4" />}
              label="Mileage"
              value={`${vehicle.mileage} km`}
            />
            {vehicle.transmission && (
              <Spec
                icon={<Settings2 className="h-4 w-4" />}
                label="Transmission"
                value={vehicle.transmission}
              />
            )}
            {vehicle.fuelType && (
              <Spec icon={<Fuel className="h-4 w-4" />} label="Fuel" value={vehicle.fuelType} />
            )}
            {vehicle.city && (
              <Spec icon={<MapPin className="h-4 w-4" />} label="Location" value={vehicle.city} />
            )}
            {vehicle.condition && (
              <Spec
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Condition"
                value={vehicle.condition}
              />
            )}
          </div>

          {vehicle.description && (
            <section>
              <h2 className="text-sm font-semibold">Description</h2>
              <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {vehicle.description}
              </p>
            </section>
          )}

          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground">AutoAce protects your privacy</p>
            <p className="mt-1">
              Seller contact details stay hidden. Tap "I'm Interested" — AutoAce will introduce you
              both once the fit is right.
            </p>
          </div>
        </div>

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-6 pb-6 pt-3 bg-gradient-to-t from-background via-background to-background/0">
          <button
            disabled={vehicle.status !== "available"}
            onClick={() => setInterestOpen(true)}
            className="press w-full h-14 rounded-3xl bg-primary text-primary-foreground font-semibold text-base shadow-[var(--shadow-soft)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <Heart className="h-4 w-4" />
            {vehicle.status === "available" ? "I'm Interested" : `Vehicle ${vehicle.status}`}
          </button>
        </div>

        <InterestDialog
          open={interestOpen}
          onOpenChange={setInterestOpen}
          vehicleId={vehicle.id}
          title={title}
        />

        {lightbox !== null && photos[lightbox] && (
          <Lightbox
            src={photos[lightbox]}
            onClose={() => setLightbox(null)}
            onPrev={() =>
              setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
            }
            onNext={() => setLightbox((i) => (i === null ? null : (i + 1) % photos.length))}
            hasMultiple={photos.length > 1}
          />
        )}
      </div>
    </MobileShell>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function InterestDialog({
  open,
  onOpenChange,
  vehicleId,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleId: string;
  title: string;
}) {
  const [values, setValues] = useState({ name: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = vehicleInterestSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSubmitting(true);
    try {
      await vehicleInterestService.registerInterest(vehicleId, parsed.data);
      toast.success("Thanks — AutoAce will reach out shortly.");
      onOpenChange(false);
      setValues({ name: "", phone: "", message: "" });
    } catch (err) {
      toast.error("Couldn't send", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Interested in this car?</DialogTitle>
          <DialogDescription>
            Share your contact and AutoAce will introduce you to the seller for the {title}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Name
            </Label>
            <Input
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Your full name"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Phone
            </Label>
            <Input
              inputMode="tel"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              placeholder="+260 …"
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Message (optional)
            </Label>
            <Textarea
              value={values.message}
              onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
              placeholder="What would you like to know?"
              className="min-h-20 rounded-2xl"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="press mt-2 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send interest"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Lightbox({
  src,
  onClose,
  onPrev,
  onNext,
  hasMultiple,
}: {
  src: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasMultiple: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {hasMultiple && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 px-3 rounded-full bg-white/10 text-white text-sm"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 px-3 rounded-full bg-white/10 text-white text-sm"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
