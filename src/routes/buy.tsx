import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { buyerRequestSchema } from "@/application/validation/schemas";
import { buyerService } from "@/application/services/buyerService";
import { formatKwacha } from "@/application/utils/currency";
import { MobileShell } from "@/components/MobileShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/buy")({
  component: BuyForm,
});

function BuyForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    phone: "",
    budget: "",
    make: "",
    model: "",
    year: "",
    city: "",
    transmission: "",
    fuel: "",
    notes: "",
  });
  const set = (k: keyof typeof values) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = buyerRequestSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSubmitting(true);
    try {
      await buyerService.submitRequest(parsed.data);
      toast.success("Request submitted", {
        description: "We'll match you with cars that fit and reach out shortly.",
      });
      setTimeout(() => navigate({ to: "/welcome" }), 900);
    } catch (err) {
      toast.error("Couldn't save your request", { description: (err as Error).message });
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
          <h1 className="text-lg font-semibold">Find my car</h1>
        </header>

        <p className="mt-4 text-sm text-muted-foreground">Tell us what you're looking for.</p>

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
          <Field label="Vehicle Budget (Kwacha)">
            <Input
              inputMode="numeric"
              value={values.budget}
              onChange={(e) => set("budget")(formatKwacha(e.target.value))}
              placeholder="e.g. K150,000"
              className="h-12 rounded-2xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preferred Make">
              <Input
                value={values.make}
                onChange={(e) => set("make")(e.target.value)}
                placeholder="Toyota"
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="Preferred Model">
              <Input
                value={values.model}
                onChange={(e) => set("model")(e.target.value)}
                placeholder="Corolla"
                className="h-12 rounded-2xl"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preferred Year">
              <Input
                inputMode="numeric"
                value={values.year}
                onChange={(e) => set("year")(e.target.value)}
                placeholder="e.g. 2015+"
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="City">
              <Input
                value={values.city}
                onChange={(e) => set("city")(e.target.value)}
                placeholder="e.g. Lusaka"
                className="h-12 rounded-2xl"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Transmission">
              <Select value={values.transmission} onValueChange={set("transmission")}>
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fuel Type">
              <Select value={values.fuel} onValueChange={set("fuel")}>
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={values.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Anything else we should know?"
              className="min-h-24 rounded-2xl"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="press mt-4 w-full h-16 rounded-3xl bg-primary text-primary-foreground font-semibold text-base shadow-[var(--shadow-soft)] disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Find My Car"}
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
