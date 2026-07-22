import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

type Env = {
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    APP_ORIGIN?: string;
  };
};
type Row = Record<string, unknown>;

const app = new Hono<Env>();
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    const origin = c.req.header("Origin");
    const allowedOrigin = origin && [c.env.APP_ORIGIN, "https://autoace-cloudflare-test.pages.dev"].includes(origin) ? origin : c.env.APP_ORIGIN ?? "*";
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" } });
  }
  return next();
});
app.use("*", cors({ origin: (origin, c) => origin && [c.env.APP_ORIGIN, "https://autoace-cloudflare-test.pages.dev"].includes(origin) ? origin : c.env.APP_ORIGIN ?? "*", allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "OPTIONS"] }));

const buyerSchema = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), budget: z.string().trim().min(1).max(100), preferredMake: z.string().trim().max(60).nullable().optional(), preferredModel: z.string().trim().max(60).nullable().optional(), preferredYear: z.string().trim().max(20).nullable().optional(), city: z.string().trim().max(60).nullable().optional(), transmission: z.string().max(30).nullable().optional(), fuelType: z.string().max(30).nullable().optional(), notes: z.string().max(500).nullable().optional() });
const vehicleSchema = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), make: z.string().trim().min(1).max(60), model: z.string().trim().min(1).max(60), year: z.number().int().min(1886).max(2100), price: z.string().trim().min(1).max(100), mileage: z.string().trim().min(1).max(100), transmission: z.string().max(30).nullable().optional(), fuelType: z.string().max(30).nullable().optional(), city: z.string().max(80).nullable().optional(), description: z.string().max(1000).nullable().optional(), condition: z.string().max(60).nullable().optional(), notes: z.string().max(500).nullable().optional(), photoPaths: z.array(z.string().max(300)).max(30).optional(), buyerRequestId: z.string().uuid().nullable().optional() });
const asBuyer = (r: Row) => ({ id: r.id, name: r.name, phone: r.phone, budget: r.budget, preferredMake: r.preferred_make, preferredModel: r.preferred_model, preferredYear: r.preferred_year, city: r.city, transmission: r.transmission, fuelType: r.fuel_type, notes: r.notes, createdAt: r.created_at });
const asPublicBuyer = (r: Row) => ({ id: r.id, budget: r.budget, preferredMake: r.preferred_make, preferredModel: r.preferred_model, preferredYear: r.preferred_year, city: r.city, transmission: r.transmission, fuelType: r.fuel_type, createdAt: r.created_at });
const asVehicle = (r: Row) => ({ id: r.id, name: r.name, phone: r.phone, make: r.make, model: r.model, year: r.year, price: r.price, mileage: r.mileage, transmission: r.transmission, fuelType: r.fuel_type, city: r.city, description: r.description, condition: r.condition, notes: r.notes, photoPaths: r.photo_paths ?? [], status: r.status, buyerRequestId: r.buyer_request_id, createdAt: r.created_at });
const asPublicVehicle = (r: Row) => ({ id: r.id, make: r.make, model: r.model, year: r.year, price: r.price, mileage: r.mileage, transmission: r.transmission, fuelType: r.fuel_type, city: r.city, description: r.description, condition: r.condition, photoPaths: r.photo_paths ?? [], status: r.status, buyerRequestId: r.buyer_request_id, createdAt: r.created_at });

function baseUrl(env: Env["Bindings"]) { return env.SUPABASE_URL.replace(/\/+$/, ""); }
async function supabase<T>(env: Env["Bindings"], path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const response = await fetch(`${baseUrl(env)}/rest/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Accept: "application/json", "Content-Type": "application/json", ...init.headers } });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("supabase_request_failed", { method, path, status: response.status, detail });
    throw new HTTPException(502, { message: detail });
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}
async function body<T>(c: any, schema: z.ZodType<T>): Promise<T> { const parsed = schema.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) throw new HTTPException(422, { message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") }); return parsed.data; }
function storageUrl(env: Env["Bindings"], path: string) { return `${baseUrl(env)}/storage/v1/object/public/vehicle-photos/${path.split("/").map(encodeURIComponent).join("/")}`; }

app.get("/health", (c) => c.json({ ok: true, service: "autoace-cloudflare-api", database: "supabase" }));
app.get("/vehicles/available", async (c) => { const rows = await supabase<Row[]>(c.env, "public_vehicle_listings?select=*&order=created_at.desc"); return c.json(rows.map(asPublicVehicle)); });
app.get("/buyer-requests/public", async (c) => { const rows = await supabase<Row[]>(c.env, "public_buyer_requests?select=*&order=created_at.desc"); return c.json(rows.map(asPublicBuyer)); });
app.post("/buyer-requests", async (c) => { const input = await body(c, buyerSchema); const rows = await supabase<Row[]>(c.env, "buyer_requests", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: input.name, phone: input.phone, budget: input.budget, preferred_make: input.preferredMake ?? null, preferred_model: input.preferredModel ?? null, preferred_year: input.preferredYear ?? null, city: input.city ?? null, transmission: input.transmission ?? null, fuel_type: input.fuelType ?? null, notes: input.notes ?? null }) }); return c.json(asBuyer(rows[0]), 201); });
app.post("/vehicles", async (c) => { const input = await body(c, vehicleSchema); if (input.buyerRequestId) { const buyerRows = await supabase<Row[]>(c.env, `buyer_requests?select=id&id=eq.${encodeURIComponent(input.buyerRequestId)}`); if (!buyerRows.length) throw new HTTPException(422, { message: "Buyer request not found" }); } const rows = await supabase<Row[]>(c.env, "vehicle_listings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: input.name, phone: input.phone, make: input.make, model: input.model, year: input.year, price: input.price, mileage: input.mileage, transmission: input.transmission ?? null, fuel_type: input.fuelType ?? null, city: input.city ?? null, description: input.description ?? null, condition: input.condition ?? null, notes: input.notes ?? null, photo_paths: input.photoPaths ?? [], buyer_request_id: input.buyerRequestId ?? null }) }); const listing = rows[0]; if (input.buyerRequestId) { await supabase(c.env, "matches", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ buyer_request_id: input.buyerRequestId, vehicle_listing_id: listing.id }) }); } return c.json(asVehicle(listing), 201); });
app.post("/storage/vehicle-photos/resolve", async (c) => { const input = await body(c, z.object({ paths: z.array(z.string().max(300)).max(30) })); return c.json({ urls: input.paths.map((path) => storageUrl(c.env, path)) }); });
app.post("/storage/vehicle-photos/:prefix", async (c) => {
  const prefix = c.req.param("prefix");
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(prefix)) {
    throw new HTTPException(400, { message: "Invalid photo prefix" });
  }

  const parsed = await c.req.parseBody({ all: true });
  const rawFiles = Array.isArray(parsed.files) ? parsed.files : [parsed.files];
  const files = rawFiles.filter((value): value is File => value instanceof File);
  if (!files.length) throw new HTTPException(422, { message: "At least one image file is required in the files field" });

  const paths: string[] = [];
  for (const value of files) {
    if (!value.type.startsWith("image/") || value.size > 10 * 1024 * 1024) {
      throw new HTTPException(422, { message: "Images only, maximum 10MB each" });
    }

    const safeName = value.name.replace(/[^a-zA-Z0-9._-]/g, "");
    const path = `${prefix}/${crypto.randomUUID()}-${safeName || "upload"}`;
    const response = await fetch(`${baseUrl(c.env)}/storage/v1/object/vehicle-photos/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: {
        apikey: c.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": value.type,
        "x-upsert": "false",
      },
      body: await value.arrayBuffer(),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error("storage_upload_failed", { prefix, filename: value.name, contentType: value.type, size: value.size, status: response.status, detail });
      throw new HTTPException(502, { message: "Vehicle photo upload failed" });
    }
    paths.push(path);
  }

  return c.json({ paths }, 201);
});
app.notFound((c) => c.json({ message: "Not found" }, 404));
app.onError((error, c) => {
  const status = error instanceof HTTPException ? error.status : 500;
  console.error("worker_request_failed", { method: c.req.method, path: new URL(c.req.url).pathname, status, message: error.message, stack: error instanceof Error ? error.stack : undefined });
  return c.json({ message: error instanceof HTTPException ? error.message : "Internal server error" }, status);
});
export default app;
