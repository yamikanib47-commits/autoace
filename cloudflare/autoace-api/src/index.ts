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
const asInterest = (r: Row) => ({ id: r.id, vehicleListingId: r.vehicle_listing_id, name: r.name, phone: r.phone, message: r.message, createdAt: r.created_at });
const asMatch = (r: Row) => ({ id: r.id, status: r.status, adminNotes: r.admin_notes, createdAt: r.created_at, updatedAt: r.updated_at, buyerRequest: r.buyer_requests ? asBuyer(Array.isArray(r.buyer_requests) ? r.buyer_requests[0] : r.buyer_requests) : undefined, vehicleListing: r.vehicle_listings ? asVehicle(Array.isArray(r.vehicle_listings) ? r.vehicle_listings[0] : r.vehicle_listings) : undefined });

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
async function authRequest<T>(env: Env["Bindings"], path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl(env)}/auth/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Accept: "application/json", "Content-Type": "application/json", ...init.headers } });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("supabase_auth_request_failed", { path, status: response.status, detail });
    throw new HTTPException(response.status === 400 || response.status === 401 ? 401 : 502, { message: detail });
  }
  return await response.json() as T;
}
async function rolesFor(env: Env["Bindings"], userId: string): Promise<("admin" | "user")[]> {
  try {
    const rows = await supabase<Row[]>(env, `user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
    return [rows[0]?.role === "admin" ? "admin" : "user"];
  } catch (error) {
    console.error("user_roles_lookup_failed", { userId, message: error instanceof Error ? error.message : String(error) });
    return ["user"];
  }
}
async function authenticatedUser(env: Env["Bindings"], token: string) {
  try {
    const user = await authRequest<{ id: string; email?: string }>(env, "user", { headers: { Authorization: `Bearer ${token}` } });
    return { id: user.id, email: user.email ?? "", roles: await rolesFor(env, user.id) };
  } catch {
    return null;
  }
}

async function requireAdmin(c: any) {
  const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
  if (!token) throw new HTTPException(401, { message: "Authentication required" });
  const user = await authenticatedUser(c.env, token);
  if (!user) throw new HTTPException(401, { message: "Authentication required" });
  if (!user.roles.includes("admin")) throw new HTTPException(403, { message: "Admin access required" });
  return user;
}

app.get("/health", (c) => c.json({ ok: true, service: "autoace-cloudflare-api", database: "supabase" }));
app.post("/auth/sign-up", async (c) => { const input = await body(c, z.object({ email: z.string().trim().email(), password: z.string().min(6).max(200) })); const created = await authRequest<{ user: { id: string } }>(c.env, "admin/users", { method: "POST", body: JSON.stringify({ email: input.email.toLowerCase(), password: input.password, email_confirm: true }) }); try { await supabase(c.env, "user_roles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: created.user.id, role: "user" }) }); } catch (error) { console.error("user_role_seed_failed", { userId: created.user.id, message: error instanceof Error ? error.message : String(error) }); } return c.json({ requiresEmailConfirmation: false }, 201); });
app.post("/auth/sign-in", async (c) => { const input = await body(c, z.object({ email: z.string().trim().email(), password: z.string().min(6).max(200) })); const result = await authRequest<{ access_token: string; user: { id: string; email?: string } }>(c.env, "token?grant_type=password", { method: "POST", body: JSON.stringify({ email: input.email.toLowerCase(), password: input.password }) }); const user = { id: result.user.id, email: result.user.email ?? input.email, roles: await rolesFor(c.env, result.user.id) }; return c.json({ user, accessToken: result.access_token }); });
app.post("/auth/sign-out", async (c) => { const token = c.req.header("Authorization")?.replace(/^Bearer /, ""); if (token) await fetch(`${baseUrl(c.env)}/auth/v1/logout`, { method: "POST", headers: { apikey: c.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` } }).catch((error) => console.error("supabase_signout_failed", { message: error instanceof Error ? error.message : String(error) })); return c.body(null, 204); });
app.get("/auth/session", async (c) => { const token = c.req.header("Authorization")?.replace(/^Bearer /, ""); if (!token) return c.body(null, 204); const user = await authenticatedUser(c.env, token); return user ? c.json({ user, accessToken: token }) : c.body(null, 204); });
app.get("/vehicles/available", async (c) => { const rows = await supabase<Row[]>(c.env, "public_vehicle_listings?select=*&order=created_at.desc"); return c.json(rows.map(asPublicVehicle)); });
app.get("/vehicles", async (c) => { await requireAdmin(c); const rows = await supabase<Row[]>(c.env, "vehicle_listings?select=*&order=created_at.desc"); return c.json(rows.map(asVehicle)); });
app.get("/buyer-requests/public", async (c) => { const rows = await supabase<Row[]>(c.env, "public_buyer_requests?select=*&order=created_at.desc"); return c.json(rows.map(asPublicBuyer)); });
app.get("/buyer-requests", async (c) => { await requireAdmin(c); const rows = await supabase<Row[]>(c.env, "buyer_requests?select=*&order=created_at.desc"); return c.json(rows.map(asBuyer)); });
app.post("/buyer-requests", async (c) => { const input = await body(c, buyerSchema); const rows = await supabase<Row[]>(c.env, "buyer_requests", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: input.name, phone: input.phone, budget: input.budget, preferred_make: input.preferredMake ?? null, preferred_model: input.preferredModel ?? null, preferred_year: input.preferredYear ?? null, city: input.city ?? null, transmission: input.transmission ?? null, fuel_type: input.fuelType ?? null, notes: input.notes ?? null }) }); return c.json(asBuyer(rows[0]), 201); });
app.post("/vehicles", async (c) => { const input = await body(c, vehicleSchema); if (input.buyerRequestId) { const buyerRows = await supabase<Row[]>(c.env, `buyer_requests?select=id&id=eq.${encodeURIComponent(input.buyerRequestId)}`); if (!buyerRows.length) throw new HTTPException(422, { message: "Buyer request not found" }); } const rows = await supabase<Row[]>(c.env, "vehicle_listings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: input.name, phone: input.phone, make: input.make, model: input.model, year: input.year, price: input.price, mileage: input.mileage, transmission: input.transmission ?? null, fuel_type: input.fuelType ?? null, city: input.city ?? null, description: input.description ?? null, condition: input.condition ?? null, notes: input.notes ?? null, photo_paths: input.photoPaths ?? [], buyer_request_id: input.buyerRequestId ?? null }) }); const listing = rows[0]; if (input.buyerRequestId) { await supabase(c.env, "matches", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ buyer_request_id: input.buyerRequestId, vehicle_listing_id: listing.id }) }); } return c.json(asVehicle(listing), 201); });
app.post("/storage/vehicle-photos/resolve", async (c) => { const input = await body(c, z.object({ paths: z.array(z.string().max(300)).max(30) })); return c.json({ urls: input.paths.map((path) => storageUrl(c.env, path)) }); });
app.get("/matches", async (c) => { await requireAdmin(c); const rows = await supabase<Row[]>(c.env, "matches?select=*,buyer_requests(*),vehicle_listings(*)&order=created_at.desc"); return c.json(rows.map(asMatch)); });
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
app.get("/vehicle-interests", async (c) => {
  const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
  if (!token) {
    return c.json({ message: "Authentication required" }, 401);
  }
  const user = await authenticatedUser(c.env, token);
  if (!user || !user.roles.includes("admin")) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const rows = await supabase<Row[]>(c.env, "vehicle_interests?select=*&order=created_at.desc");
  return c.json(rows.map(asInterest));
});
app.post("/vehicle-interests", async (c) => { const input = await body(c, z.object({ vehicleListingId: z.string().uuid(), name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), message: z.string().max(500).nullable().optional() })); const vehicleRows = await supabase<Row[]>(c.env, `vehicle_listings?select=id&id=eq.${encodeURIComponent(input.vehicleListingId)}&limit=1`); if (!vehicleRows.length) throw new HTTPException(404, { message: "Vehicle not found" }); const rows = await supabase<Row[]>(c.env, "vehicle_interests", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ vehicle_listing_id: input.vehicleListingId, name: input.name, phone: input.phone, message: input.message ?? null }) }); return c.json(asInterest(rows[0]), 201); });
app.notFound((c) => c.json({ message: "Not found" }, 404));
app.onError((error, c) => {
  const status = error instanceof HTTPException ? error.status : 500;
  console.error("worker_request_failed", { method: c.req.method, path: new URL(c.req.url).pathname, status, message: error.message, stack: error instanceof Error ? error.stack : undefined });
  return c.json({ message: error instanceof HTTPException ? error.message : "Internal server error" }, status);
});
export default app;
