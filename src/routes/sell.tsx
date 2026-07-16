import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImagePlus, X, Target } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { vehicleListingSchema } from "@/application/validation/schemas";
import { sellerService } from "@/application/services/sellerService";
import { formatKwacha } from "@/application/utils/currency";
import { MobileShell } from "@/components/MobileShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const searchSchema = z.object({
  request: z.string().uuid().optional(),
});

export const Route = createFileRoute("/sell")({
  validateSearch: (s) => searchSchema.parse(s),
  component: SellForm,
});

type PhotoItem = { file: File; preview: string };

function SellForm() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const buyerRequestId = search.request ?? null;
  const [values, setValues] = useState({
    name: "",
    phone: "",
    make: "",
    model: "",
    year: "",
    price: "",
    mileage: "",
    transmission: "",
    fuel_type: "",
    city: "",
    condition: "",
    description: "",
    notes: "",
  });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const set = (k: keyof typeof values) => (v: string) => setValues((s) => ({ ...s, [k]: v }));

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 8 - photos.length;
    const next = Array.from(files)
      .slice(0, remaining)
      .map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
      }));
    setPhotos((p) => [...p, ...next]);
  };

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = vehicleListingSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSubmitting(true);
    try {
      await sellerService.submitListing(
        parsed.data,
        photos.map((p) => p.file),
        buyerRequestId,
      );
      toast.success("Car listed", {
        description: "Your listing is live on the AutoAce marketplace.",
      });
      setTimeout(() => navigate({ to: "/marketplace" }), 900);
    } catch (err) {
      toast.error("Couldn't save your listing", { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 px-6 pt-6 pb-10 animate-fade-up">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/welcome" })}
            className="press h-10 w-10 rounded-full border border-border flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold">List my car</h1>
        </header>

        {buyerRequestId ? (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm flex items-start gap-2">
            <Target className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span>
              You're responding to a specific buyer request. AutoAce will match your car with them
              and reach out.
            </span>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Share your car details to get it in front of buyers.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Name">
            <Input
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Your full name"
              className="h-12 rounded-2xl"
            />
          </Field>
          <Field label="Phone Number">
            <Input
              inputMode="tel"
              value={values.phone}
              onChange={(e) => set("phone")(e.target.value)}
              placeholder="+260 …"
              className="h-12 rounded-2xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle Make">
              <Input
                value={values.make}
                onChange={(e) => set("make")(e.target.value)}
                placeholder="Toyota"
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="Model">
              <Input
                value={values.model}
                onChange={(e) => set("model")(e.target.value)}
                placeholder="Corolla"
                className="h-12 rounded-2xl"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Year">
              <Input
                inputMode="numeric"
                value={values.year}
                onChange={(e) => set("year")(e.target.value)}
                placeholder="2020"
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="Price (Kwacha)">
              <Input
                inputMode="numeric"
                value={values.price}
                onChange={(e) => set("price")(formatKwacha(e.target.value))}
                placeholder="K120,000"
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="Mileage">
              <Input
                inputMode="numeric"
                value={values.mileage}
                onChange={(e) => set("mileage")(e.target.value)}
                placeholder="km"
                className="h-12 rounded-2xl"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Transmission (optional)">
              <Input
                value={values.transmission}
                onChange={(e) => set("transmission")(e.target.value)}
                placeholder="Automatic"
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="Fuel type (optional)">
              <Input
                value={values.fuel_type}
                onChange={(e) => set("fuel_type")(e.target.value)}
                placeholder="Petrol"
                className="h-12 rounded-2xl"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City (optional)">
              <Input
                value={values.city}
                onChange={(e) => set("city")(e.target.value)}
                placeholder="Lusaka"
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="Condition (optional)">
              <Input
                value={values.condition}
                onChange={(e) => set("condition")(e.target.value)}
                placeholder="Excellent"
                className="h-12 rounded-2xl"
              />
            </Field>
          </div>

          <Field label="Upload Photos">
            <div className="grid grid-cols-3 gap-3">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-muted"
                >
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className="press aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Add photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Up to 8 photos. First photo will be the cover.
            </p>
          </Field>

          <Field label="Description (optional)">
            <Textarea
              value={values.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder="Describe your car — features, condition, service history…"
              className="min-h-24 rounded-2xl"
            />
          </Field>

          <Field label="Private notes to AutoAce (optional)">
            <Textarea
              value={values.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Anything only AutoAce should see"
              className="min-h-16 rounded-2xl"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="press mt-4 w-full h-16 rounded-3xl bg-primary text-primary-foreground font-semibold text-base shadow-[var(--shadow-soft)] disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "List My Car"}
          </button>
        </form>
      </div>
    </MobileShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}
