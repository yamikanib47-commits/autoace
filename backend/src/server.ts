import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Context } from "hono";

function runtimeEnv(name: string) {
  const current = process.env[name];
  if (current && !current.includes("placeholder") && !current.includes("your-project")) return current;
  try {
    const lines = readFileSync(process.env.AUTOACE_ENV_FILE ?? "/home/workspace/autoace-migrated/backend/.env", "utf8").split(/\r?\n/);
    const fromFile = lines.find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1);
    return fromFile || current;
  } catch {
    return current;
  }
}

const supabaseUrl = runtimeEnv("SUPABASE_URL")?.replace(/\/+$/, "");
const serviceRoleKey = runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const app = new Hono();
const port = Number(process.env.PORT ?? 8787);
const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";
app.use("*", cors({ origin, allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] }));

const buyerSchema = z.object({
  name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), budget: z.string().trim().min(1).max(100),
  preferredMake: z.string().trim().max(60).nullable().optional(), preferredModel: z.string().trim().max(60).nullable().optional(), preferredYear: z.string().trim().max(20).nullable().optional(), city: z.string().trim().max(60).nullable().optional(), transmission: z.string().max(30).nullable().optional(), fuelType: z.string().max(30).nullable().optional(), notes: z.string().max(500).nullable().optional(),
});
const vehicleSchema = z.object({
  name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), make: z.string().trim().min(1).max(60), model: z.string().trim().min(1).max(60), year: z.number().int().min(1886).max(new Date().getFullYear() + 2), price: z.string().trim().min(1).max(100), mileage: z.string().trim().min(1).max(100), transmission: z.string().max(30).nullable().optional(), fuelType: z.string().max(30).nullable().optional(), city: z.string().max(80).nullable().optional(), description: z.string().max(1000).nullable().optional(), condition: z.string().max(60).nullable().optional(), notes: z.string().max(500).nullable().optional(), photoPaths: z.array(z.string().max(300)).max(30).optional(), buyerRequestId: z.string().uuid().nullable().optional(),
});
const interestSchema = z.object({ vehicleListingId: z.string().uuid(), name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), message: z.string().max(500).nullable().optional() });
const credentialsSchema = z.object({ email: z.string().trim().email(), password: z.string().min(6).max(200) });
const adminRole = z.enum(["admin", "user"]);
const statusSchema = z.enum(["available", "reserved", "sold"]);
const matchStatusSchema = z.enum(["new", "reviewing", "sent_to_buyer", "buyer_interested", "viewing_scheduled", "completed", "rejected"]);

type Row = Record<string, any>;
const asBuyer = (r: Row) => ({ id: r.id, name: r.name, phone: r.phone, budget: r.budget, preferredMake: r.preferred_make, preferredModel: r.preferred_model, preferredYear: r.preferred_year, city: r.city, transmission: r.transmission, fuelType: r.fuel_type, notes: r.notes, createdAt: r.created_at });
const asPublicBuyer = (r: Row) => ({ id: r.id, budget: r.budget, preferredMake: r.preferred_make, preferredModel: r.preferred_model, preferredYear: r.preferred_year, city: r.city, transmission: r.transmission, fuelType: r.fuel_type, createdAt: r.created_at });
const asVehicle = (r: Row) => ({ id: r.id, name: r.name, phone: r.phone, make: r.make, model: r.model, year: r.year, price: r.price, mileage: r.mileage, transmission: r.transmission, fuelType: r.fuel_type, city: r.city, description: r.description, condition: r.condition, notes: r.notes, photoPaths: r.photo_paths ?? [], status: r.status, buyerRequestId: r.buyer_request_id, createdAt: r.created_at });
const asPublicVehicle = (r: Row) => ({ id: r.id, make: r.make, model: r.model, year: r.year, price: r.price, mileage: r.mileage, transmission: r.transmission, fuelType: r.fuel_type, city: r.city, description: r.description, condition: r.condition, photoPaths: r.photo_paths ?? [], status: r.status, buyerRequestId: r.buyer_request_id, createdAt: r.created_at });
const asInterest = (r: Row) => ({ id: r.id, vehicleListingId: r.vehicle_listing_id, name: r.name, phone: r.phone, message: r.message, createdAt: r.created_at });
const asMatch = (r: Row) => ({ id: r.id, status: r.status, adminNotes: r.admin_notes, createdAt: r.created_at, updatedAt: r.updated_at, buyerRequest: r.buyer_requests ? asBuyer(Array.isArray(r.buyer_requests) ? r.buyer_requests[0] : r.buyer_requests) : undefined, vehicleListing: r.vehicle_listings ? asVehicle(Array.isArray(r.vehicle_listings) ? r.vehicle_listings[0] : r.vehicle_listings) : undefined });

async function body<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new HTTPException(422, { message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") });
  return parsed.data;
}
async function user(c: Context) {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !data.user) return null;
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
  return { id: data.user.id, email: data.user.email ?? "", roles: [role?.role ?? "user"].filter((r): r is "admin" | "user" => adminRole.safeParse(r).success) };
}
async function requireUser(c: Context) { const current = await user(c); if (!current) throw new HTTPException(401, { message: "Authentication required" }); return current; }
async function requireAdmin(c: Context) { const current = await requireUser(c); if (!current.roles.includes("admin")) throw new HTTPException(403, { message: "Admin access required" }); return current; }
function session(current: { id: string; email: string; roles: ("admin" | "user")[] }, accessToken: string) { return { user: current, accessToken }; }
async function notify(type: string, submission: Row) { const token = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.TELEGRAM_CHAT_ID; if (!token || !chatId) return; const title = type === "buyer_submission" ? "New AutoAce buyer request" : "New AutoAce seller listing"; await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: `${title}\n${JSON.stringify(submission).slice(0, 3500)}` }) }).catch(() => undefined); }

app.get("/health", (c) => c.json({ ok: true, service: "autoace-backend", database: "supabase" }));
app.post("/auth/sign-up", async (c) => { const input = await body(c, credentialsSchema); const { data, error } = await supabase.auth.admin.createUser({ email: input.email.toLowerCase(), password: input.password, email_confirm: true }); if (error) throw new HTTPException(error.status === 422 || error.message.toLowerCase().includes("already") ? 409 : 400, { message: error.message }); const roleResult = await supabase.from("user_roles").upsert({ user_id: data.user.id, role: "user" }); if (roleResult.error) throw new HTTPException(500, { message: roleResult.error.message }); return c.json({ requiresEmailConfirmation: false }, 201); });
app.post("/auth/sign-in", async (c) => { const input = await body(c, credentialsSchema); const client = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }); const { data, error } = await client.auth.signInWithPassword(input); if (error || !data.session || !data.user) throw new HTTPException(401, { message: error?.message ?? "Invalid email or password" }); const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle(); return c.json(session({ id: data.user.id, email: data.user.email ?? input.email, roles: [role?.role === "admin" ? "admin" : "user"] }, data.session.access_token)); });
app.post("/auth/sign-out", async (c) => { await requireUser(c); const token = c.req.header("authorization")?.slice(7); if (token) await supabase.auth.admin.signOut(token).catch(() => undefined); return c.body(null, 204); });
app.get("/auth/session", async (c) => { const current = await user(c); return current ? c.json({ user: current, accessToken: c.req.header("authorization")?.slice(7) }) : c.body(null, 204); });

app.get("/buyer-requests/public", async (c) => { const { data, error } = await supabase.from("public_buyer_requests").select("*").order("created_at", { ascending: false }); if (error) throw new HTTPException(500, { message: error.message }); return c.json(data.map(asPublicBuyer)); });
app.get("/buyer-requests", async (c) => { await requireAdmin(c); const { data, error } = await supabase.from("buyer_requests").select("*").order("created_at", { ascending: false }); if (error) throw new HTTPException(500, { message: error.message }); return c.json(data.map(asBuyer)); });
app.post("/buyer-requests", async (c) => { const input = await body(c, buyerSchema); const { data, error } = await supabase.from("buyer_requests").insert({ name: input.name, phone: input.phone, budget: input.budget, preferred_make: input.preferredMake ?? null, preferred_model: input.preferredModel ?? null, preferred_year: input.preferredYear ?? null, city: input.city ?? null, transmission: input.transmission ?? null, fuel_type: input.fuelType ?? null, notes: input.notes ?? null }).select().single(); if (error) throw new HTTPException(400, { message: error.message }); void notify("buyer_submission", data); return c.json(asBuyer(data), 201); });
app.delete("/buyer-requests/:id", async (c) => { await requireAdmin(c); const { data, error } = await supabase.from("buyer_requests").delete().eq("id", c.req.param("id")).select("id"); if (error) throw new HTTPException(400, { message: error.message }); if (!data?.length) throw new HTTPException(404, { message: "Buyer request not found" }); return c.body(null, 204); });

app.get("/vehicles/available", async (c) => { const { data, error } = await supabase.from("public_vehicle_listings").select("*").order("created_at", { ascending: false }); if (error) throw new HTTPException(500, { message: error.message }); return c.json(data.map(asPublicVehicle)); });
app.get("/vehicles", async (c) => { await requireAdmin(c); const { data, error } = await supabase.from("vehicle_listings").select("*").order("created_at", { ascending: false }); if (error) throw new HTTPException(500, { message: error.message }); return c.json(data.map(asVehicle)); });
app.post("/vehicles", async (c) => { const input = await body(c, vehicleSchema); if (input.buyerRequestId) { const buyerCheck = await supabase.from("buyer_requests").select("id").eq("id", input.buyerRequestId).maybeSingle(); if (buyerCheck.error || !buyerCheck.data) throw new HTTPException(422, { message: "Buyer request not found" }); } const { data, error } = await supabase.from("vehicle_listings").insert({ name: input.name, phone: input.phone, make: input.make, model: input.model, year: input.year, price: input.price, mileage: input.mileage, transmission: input.transmission ?? null, fuel_type: input.fuelType ?? null, city: input.city ?? null, description: input.description ?? null, condition: input.condition ?? null, notes: input.notes ?? null, photo_paths: input.photoPaths ?? [], buyer_request_id: input.buyerRequestId ?? null }).select().single(); if (error) throw new HTTPException(400, { message: error.message }); if (input.buyerRequestId) await supabase.from("matches").upsert({ buyer_request_id: input.buyerRequestId, vehicle_listing_id: data.id }, { onConflict: "buyer_request_id,vehicle_listing_id" }); void notify("seller_submission", data); return c.json(asVehicle(data), 201); });
app.patch("/vehicles/:id/status", async (c) => { await requireAdmin(c); const input = await body(c, z.object({ status: statusSchema })); const { error } = await supabase.from("vehicle_listings").update({ status: input.status }).eq("id", c.req.param("id")); if (error) throw new HTTPException(400, { message: error.message }); return c.body(null, 204); });
app.delete("/vehicles/:id", async (c) => { await requireAdmin(c); const { data, error } = await supabase.from("vehicle_listings").delete().eq("id", c.req.param("id")).select("id"); if (error) throw new HTTPException(400, { message: error.message }); if (!data?.length) throw new HTTPException(404, { message: "Vehicle not found" }); return c.body(null, 204); });

app.get("/matches", async (c) => { await requireAdmin(c); const { data, error } = await supabase.from("matches").select("*, buyer_requests(*), vehicle_listings(*)").order("created_at", { ascending: false }); if (error) throw new HTTPException(500, { message: error.message }); return c.json(data.map(asMatch)); });
app.post("/matches", async (c) => { await requireAdmin(c); const input = await body(c, z.object({ buyerRequestId: z.string().uuid(), vehicleListingId: z.string().uuid() })); const { data, error } = await supabase.from("matches").upsert({ buyer_request_id: input.buyerRequestId, vehicle_listing_id: input.vehicleListingId }, { onConflict: "buyer_request_id,vehicle_listing_id" }).select("*, buyer_requests(*), vehicle_listings(*)").single(); if (error) throw new HTTPException(400, { message: error.message }); return c.json(asMatch(data), 201); });
app.patch("/matches/:id/status", async (c) => { await requireAdmin(c); const input = await body(c, z.object({ status: matchStatusSchema })); const { error } = await supabase.from("matches").update({ status: input.status, updated_at: new Date().toISOString() }).eq("id", c.req.param("id")); if (error) throw new HTTPException(400, { message: error.message }); return c.body(null, 204); });
app.post("/vehicle-interests", async (c) => { const input = await body(c, interestSchema); const { data, error } = await supabase.from("vehicle_interests").insert({ vehicle_listing_id: input.vehicleListingId, name: input.name, phone: input.phone, message: input.message ?? null }).select().single(); if (error) throw new HTTPException(400, { message: error.message }); return c.json(asInterest(data), 201); });
app.get("/vehicle-interests", async (c) => { await requireAdmin(c); const { data, error } = await supabase.from("vehicle_interests").select("*").order("created_at", { ascending: false }); if (error) throw new HTTPException(500, { message: error.message }); return c.json(data.map(asInterest)); });

app.get("/storage/vehicle-photos/:path{.+}", (c) => c.redirect(supabase.storage.from("vehicle-photos").getPublicUrl(c.req.param("path")).data.publicUrl));
app.post("/storage/vehicle-photos/:prefix", async (c) => { const prefix = c.req.param("prefix"); if (!/^[a-zA-Z0-9_-]{1,100}$/.test(prefix)) throw new HTTPException(400, { message: "Invalid photo prefix" }); const parsed = await c.req.parseBody({ all: true }); const values = Array.isArray(parsed.files) ? parsed.files : [parsed.files]; const paths: string[] = []; for (const value of values) { if (!(value instanceof File)) continue; if (!value.type.startsWith("image/") || value.size > 10 * 1024 * 1024) throw new HTTPException(422, { message: "Images only, maximum 10MB each" }); const path = `${prefix}/${crypto.randomUUID()}-${value.name.replace(/[^a-zA-Z0-9._-]/g, "")}`; const { error } = await supabase.storage.from("vehicle-photos").upload(path, await value.arrayBuffer(), { contentType: value.type, upsert: false }); if (error) throw new HTTPException(400, { message: error.message }); paths.push(path); } return c.json({ paths }, 201); });
app.post("/storage/vehicle-photos/resolve", async (c) => {
  const input = await body(c, z.object({ paths: z.array(z.string().max(300)).max(30) }));
  const urls = input.paths.map((path) => supabase.storage.from("vehicle-photos").getPublicUrl(path).data.publicUrl);
  return c.json({ urls });
});
app.delete("/storage/vehicle-photos", async (c) => { await requireAdmin(c); const input = await body(c, z.object({ paths: z.array(z.string().max(300)).max(30) })); const { error } = await supabase.storage.from("vehicle-photos").remove(input.paths); if (error) throw new HTTPException(400, { message: error.message }); return c.body(null, 204); });
app.post("/notifications/submission", async (c) => { await requireAdmin(c); const input = await body(c, z.object({ type: z.enum(["buyer_submission", "seller_submission"]), submission: z.record(z.unknown()) })); void notify(input.type, input.submission); return c.body(null, 204); });
app.onError((error, c) => { if (error instanceof HTTPException) return error.getResponse(); console.error(error); return c.json({ message: "Internal server error" }, 500); });
serve({ fetch: app.fetch, port, hostname: process.env.HOST ?? "0.0.0.0" });
console.info(`AutoAce backend listening on port ${port}`);
