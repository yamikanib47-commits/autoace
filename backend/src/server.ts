import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { Database } from "bun:sqlite";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { z } from "zod";
import type { Context, Next } from "hono";

const root = resolve(import.meta.dir, "..");
const databasePath = resolve(process.env.DATABASE_PATH ?? join(root, "data", "autoace.sqlite"));
const storagePath = resolve(process.env.STORAGE_PATH ?? join(root, "storage"));
const port = Number(process.env.PORT ?? 8787);
const sessionTtlDays = Number(process.env.SESSION_TTL_DAYS ?? 30);
const appOrigin = process.env.APP_ORIGIN ?? "http://localhost:5173";

await mkdir(resolve(databasePath, ".."), { recursive: true });
await mkdir(storagePath, { recursive: true });
const db = new Database(databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    PRIMARY KEY (user_id, role)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS buyer_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    budget TEXT NOT NULL,
    preferred_make TEXT,
    preferred_model TEXT,
    preferred_year TEXT,
    city TEXT,
    transmission TEXT,
    fuel_type TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS vehicle_listings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    price TEXT NOT NULL,
    mileage TEXT NOT NULL,
    transmission TEXT,
    fuel_type TEXT,
    city TEXT,
    description TEXT,
    condition TEXT,
    notes TEXT,
    photo_paths TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    buyer_request_id TEXT REFERENCES buyer_requests(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    buyer_request_id TEXT NOT NULL REFERENCES buyer_requests(id) ON DELETE CASCADE,
    vehicle_listing_id TEXT NOT NULL REFERENCES vehicle_listings(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'new',
    admin_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (buyer_request_id, vehicle_listing_id)
  );
  CREATE TABLE IF NOT EXISTS vehicle_interests (
    id TEXT PRIMARY KEY,
    vehicle_listing_id TEXT NOT NULL REFERENCES vehicle_listings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    created_at TEXT NOT NULL
  );
`);

const now = () => new Date().toISOString();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const clean = (value: string | null | undefined) => value?.trim() || null;
const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

const buyerSchema = z.object({
  name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), budget: z.string().trim().min(1),
  preferredMake: z.string().trim().max(60).nullable().optional(), preferredModel: z.string().trim().max(60).nullable().optional(),
  preferredYear: z.string().trim().max(20).nullable().optional(), city: z.string().trim().max(60).nullable().optional(),
  transmission: z.string().max(30).nullable().optional(), fuelType: z.string().max(30).nullable().optional(), notes: z.string().max(500).nullable().optional(),
});
const vehicleSchema = z.object({
  name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), make: z.string().trim().min(1).max(60), model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1886).max(new Date().getFullYear() + 2), price: z.string().trim().min(1), mileage: z.string().trim().min(1),
  transmission: z.string().max(30).nullable().optional(), fuelType: z.string().max(30).nullable().optional(), city: z.string().max(80).nullable().optional(),
  description: z.string().max(1000).nullable().optional(), condition: z.string().max(60).nullable().optional(), notes: z.string().max(500).nullable().optional(),
  photoPaths: z.array(z.string().max(300)).max(30).optional(), buyerRequestId: z.string().uuid().nullable().optional(),
});
const interestSchema = z.object({ vehicleListingId: z.string().uuid(), name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), message: z.string().max(500).nullable().optional() });
const credentialsSchema = z.object({ email: z.string().trim().email(), password: z.string().min(6).max(200) });
const matchStatusSchema = z.enum(["new", "reviewing", "sent_to_buyer", "buyer_interested", "viewing_scheduled", "completed", "rejected"]);
const vehicleStatusSchema = z.enum(["available", "reserved", "sold"]);

function userFromId(id: string) {
  const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(id) as { id: string; email: string } | undefined;
  if (!user) return null;
  const roles = db.prepare("SELECT role FROM user_roles WHERE user_id = ? ORDER BY role").all(id) as { role: "admin" | "user" }[];
  return { id: user.id, email: user.email, roles: roles.map((row) => row.role) };
}
function sessionFromRequest(c: Context) {
  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const row = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(hashToken(token)) as { user_id: string; expires_at: string } | undefined;
  if (!row || new Date(row.expires_at) <= new Date()) return null;
  const user = userFromId(row.user_id);
  return user ? { user, accessToken: token } : null;
}
function requireUser(c: Context) {
  const session = sessionFromRequest(c);
  if (!session) throw new HTTPException(401, { message: "Authentication required" });
  return session;
}
function requireAdmin(c: Context) {
  const session = requireUser(c);
  if (!session.user.roles.includes("admin")) throw new HTTPException(403, { message: "Admin role required" });
  return session;
}
async function jsonBody<T>(c: Context, schema: z.ZodType<T>) {
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new HTTPException(400, { message: "Invalid JSON body" }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HTTPException(422, { message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
  return parsed.data;
}
function issueToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionTtlDays * 86400000).toISOString();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(hashToken(token), userId, expiresAt, now());
  return token;
}
function asBuyer(row: Record<string, unknown>) {
  return { id: row.id, name: row.name, phone: row.phone, budget: row.budget, preferredMake: row.preferred_make, preferredModel: row.preferred_model, preferredYear: row.preferred_year, city: row.city, transmission: row.transmission, fuelType: row.fuel_type, notes: row.notes, createdAt: row.created_at };
}
function asPublicBuyer(row: Record<string, unknown>) {
  const buyer = asBuyer(row); const { name: _name, phone: _phone, ...safe } = buyer; return safe;
}
function asVehicle(row: Record<string, unknown>) {
  return { id: row.id, name: row.name, phone: row.phone, make: row.make, model: row.model, year: row.year, price: row.price, mileage: row.mileage, transmission: row.transmission, fuelType: row.fuel_type, city: row.city, description: row.description, condition: row.condition, notes: row.notes, photoPaths: JSON.parse(String(row.photo_paths)), status: row.status, buyerRequestId: row.buyer_request_id, createdAt: row.created_at };
}
function asPublicVehicle(row: Record<string, unknown>) {
  const vehicle = asVehicle(row); const { name: _name, phone: _phone, notes: _notes, buyerRequestId: _request, ...safe } = vehicle; return safe;
}
function asMatch(row: Record<string, unknown>) {
  return { id: row.id, status: row.status, adminNotes: row.admin_notes, buyerRequest: asBuyer(row), vehicleListing: asVehicle(row), createdAt: row.match_created_at, updatedAt: row.match_updated_at };
}
async function notify(payload: { type: string; submission: unknown }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.info("[notifications] Telegram not configured"); return; }
  const submission = payload.submission as Record<string, unknown>;
  const text = `AutoAce ${payload.type === "buyer_submission" ? "buyer request" : "vehicle listing"}\n\n${Object.entries(submission).filter(([key]) => !["photoPaths"].includes(key)).map(([key, value]) => `${key}: ${String(value ?? "")}`).join("\n")}`;
  try { await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) }); } catch (error) { console.error("[notifications] Telegram delivery failed", error); }
}

const app = new Hono();
app.use("*", cors({ origin: appOrigin === "*" ? "*" : [appOrigin], allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] }));
app.get("/health", (c) => c.json({ ok: true, service: "autoace-backend" }));

app.post("/auth/sign-up", async (c) => {
  const input = await jsonBody(c, credentialsSchema);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(input.email.toLowerCase());
  if (existing) throw new HTTPException(409, { message: "An account with that email already exists" });
  const id = randomUUID(); const createdAt = now();
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(id, input.email.toLowerCase(), await bcrypt.hash(input.password, 12), createdAt);
  db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'user')").run(id);
  return c.json({ requiresEmailConfirmation: false }, 201);
});
app.post("/auth/sign-in", async (c) => {
  const input = await jsonBody(c, credentialsSchema);
  const row = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(input.email.toLowerCase()) as { id: string; email: string; password_hash: string } | undefined;
  if (!row || !(await bcrypt.compare(input.password, row.password_hash))) throw new HTTPException(401, { message: "Invalid email or password" });
  return c.json({ user: userFromId(row.id), accessToken: issueToken(row.id) });
});
app.post("/auth/sign-out", (c) => { const auth = c.req.header("authorization"); if (auth?.startsWith("Bearer ")) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(auth.slice(7))); return c.body(null, 204); });
app.get("/auth/session", (c) => { const session = sessionFromRequest(c); return session ? c.json(session) : c.body(null, 204); });

const rateBuckets = new Map<string, { count: number; reset: number }>();
app.use("/buyer-requests", async (c, next) => { if (c.req.method === "POST") { const key = c.req.header("x-forwarded-for") ?? "unknown"; const current = rateBuckets.get(key) ?? { count: 0, reset: Date.now() + 3600000 }; if (Date.now() > current.reset) { current.count = 0; current.reset = Date.now() + 3600000; } current.count++; rateBuckets.set(key, current); if (current.count > 20) throw new HTTPException(429, { message: "Too many submissions" }); } await next(); });
app.get("/buyer-requests/public", (c) => { const rows = db.prepare("SELECT * FROM buyer_requests ORDER BY created_at DESC").all() as Record<string, unknown>[]; return c.json(rows.map(asPublicBuyer)); });
app.get("/buyer-requests", (c) => { requireAdmin(c); const rows = db.prepare("SELECT * FROM buyer_requests ORDER BY created_at DESC").all() as Record<string, unknown>[]; return c.json(rows.map(asBuyer)); });
app.post("/buyer-requests", async (c) => { const input = await jsonBody(c, buyerSchema); const id = randomUUID(); const createdAt = now(); db.prepare("INSERT INTO buyer_requests (id,name,phone,budget,preferred_make,preferred_model,preferred_year,city,transmission,fuel_type,notes,created_at) VALUES (@id,@name,@phone,@budget,@preferredMake,@preferredModel,@preferredYear,@city,@transmission,@fuelType,@notes,@createdAt)").run({ id, name: input.name, phone: input.phone, budget: input.budget, preferredMake: clean(input.preferredMake), preferredModel: clean(input.preferredModel), preferredYear: clean(input.preferredYear), city: clean(input.city), transmission: clean(input.transmission), fuelType: clean(input.fuelType), notes: clean(input.notes), createdAt }); const result = asBuyer(db.prepare("SELECT * FROM buyer_requests WHERE id = ?").get(id) as Record<string, unknown>); void notify({ type: "buyer_submission", submission: result }); return c.json(result, 201); });
app.delete("/buyer-requests/:id", (c) => { requireAdmin(c); const result = db.prepare("DELETE FROM buyer_requests WHERE id = ?").run(c.req.param("id")); if (!result.changes) throw new HTTPException(404, { message: "Buyer request not found" }); return c.body(null, 204); });

app.get("/vehicles/available", (c) => { const rows = db.prepare("SELECT * FROM vehicle_listings WHERE status = 'available' ORDER BY created_at DESC").all() as Record<string, unknown>[]; return c.json(rows.map(asPublicVehicle)); });
app.get("/vehicles", (c) => { requireAdmin(c); const rows = db.prepare("SELECT * FROM vehicle_listings ORDER BY created_at DESC").all() as Record<string, unknown>[]; return c.json(rows.map(asVehicle)); });
app.post("/vehicles", async (c) => { const input = await jsonBody(c, vehicleSchema); if (input.buyerRequestId && !db.prepare("SELECT id FROM buyer_requests WHERE id = ?").get(input.buyerRequestId)) throw new HTTPException(422, { message: "Buyer request not found" }); const id = randomUUID(); const createdAt = now(); const paths = (input.photoPaths ?? []).filter((path) => path.startsWith(`${id}/`) || path.startsWith("pending/")); db.prepare("INSERT INTO vehicle_listings (id,name,phone,make,model,year,price,mileage,transmission,fuel_type,city,description,condition,notes,photo_paths,status,buyer_request_id,created_at) VALUES (@id,@name,@phone,@make,@model,@year,@price,@mileage,@transmission,@fuelType,@city,@description,@condition,@notes,@photoPaths,'available',@buyerRequestId,@createdAt)").run({ id, ...input, transmission: clean(input.transmission), fuelType: clean(input.fuelType), city: clean(input.city), description: clean(input.description), condition: clean(input.condition), notes: clean(input.notes), photoPaths: JSON.stringify(paths), buyerRequestId: input.buyerRequestId ?? null, createdAt }); const result = asVehicle(db.prepare("SELECT * FROM vehicle_listings WHERE id = ?").get(id) as Record<string, unknown>); void notify({ type: "seller_submission", submission: result }); return c.json(result, 201); });
app.patch("/vehicles/:id/status", async (c) => { requireAdmin(c); const input = await jsonBody(c, z.object({ status: vehicleStatusSchema })); const result = db.prepare("UPDATE vehicle_listings SET status = ? WHERE id = ?").run(input.status, c.req.param("id")); if (!result.changes) throw new HTTPException(404, { message: "Vehicle not found" }); return c.body(null, 204); });
app.delete("/vehicles/:id", (c) => { requireAdmin(c); const result = db.prepare("DELETE FROM vehicle_listings WHERE id = ?").run(c.req.param("id")); if (!result.changes) throw new HTTPException(404, { message: "Vehicle not found" }); return c.body(null, 204); });

app.get("/matches", (c) => { requireAdmin(c); const rows = db.prepare("SELECT m.id,m.status,m.admin_notes,m.created_at AS match_created_at,m.updated_at AS match_updated_at,b.*,v.* FROM matches m JOIN buyer_requests b ON b.id = m.buyer_request_id JOIN vehicle_listings v ON v.id = m.vehicle_listing_id ORDER BY m.created_at DESC").all() as Record<string, unknown>[]; return c.json(rows.map(asMatch)); });
app.post("/matches", async (c) => { const input = await jsonBody(c, z.object({ buyerRequestId: z.string().uuid(), vehicleListingId: z.string().uuid() })); const buyer = db.prepare("SELECT id FROM buyer_requests WHERE id = ?").get(input.buyerRequestId); const vehicle = db.prepare("SELECT id FROM vehicle_listings WHERE id = ?").get(input.vehicleListingId); if (!buyer || !vehicle) throw new HTTPException(404, { message: "Buyer request or vehicle not found" }); const id = randomUUID(); try { db.prepare("INSERT INTO matches (id,buyer_request_id,vehicle_listing_id,status,created_at,updated_at) VALUES (?,?,?,'new',?,?)").run(id, input.buyerRequestId, input.vehicleListingId, now(), now()); } catch (error) { if (!(error instanceof Error && error.message.includes("UNIQUE"))) throw error; } const row = db.prepare("SELECT m.id,m.status,m.admin_notes,m.created_at AS match_created_at,m.updated_at AS match_updated_at,b.*,v.* FROM matches m JOIN buyer_requests b ON b.id = m.buyer_request_id JOIN vehicle_listings v ON v.id = m.vehicle_listing_id WHERE m.buyer_request_id = ? AND m.vehicle_listing_id = ?").get(input.buyerRequestId, input.vehicleListingId) as Record<string, unknown>; return c.json(asMatch(row), 201); });
app.patch("/matches/:id/status", async (c) => { requireAdmin(c); const input = await jsonBody(c, z.object({ status: matchStatusSchema })); const result = db.prepare("UPDATE matches SET status = ?, updated_at = ? WHERE id = ?").run(input.status, now(), c.req.param("id")); if (!result.changes) throw new HTTPException(404, { message: "Match not found" }); return c.body(null, 204); });

app.post("/vehicle-interests", async (c) => { const input = await jsonBody(c, interestSchema); if (!db.prepare("SELECT id FROM vehicle_listings WHERE id = ? AND status != 'sold'").get(input.vehicleListingId)) throw new HTTPException(404, { message: "Vehicle not found" }); const id = randomUUID(); const createdAt = now(); db.prepare("INSERT INTO vehicle_interests (id,vehicle_listing_id,name,phone,message,created_at) VALUES (?,?,?,?,?,?)").run(id, input.vehicleListingId, input.name, input.phone, clean(input.message), createdAt); const result = db.prepare("SELECT * FROM vehicle_interests WHERE id = ?").get(id) as Record<string, unknown>; return c.json({ id: result.id, vehicleListingId: result.vehicle_listing_id, name: result.name, phone: result.phone, message: result.message, createdAt: result.created_at }, 201); });
app.get("/vehicle-interests", (c) => { requireAdmin(c); const rows = db.prepare("SELECT * FROM vehicle_interests ORDER BY created_at DESC").all() as Record<string, unknown>[]; return c.json(rows.map((row) => ({ id: row.id, vehicleListingId: row.vehicle_listing_id, name: row.name, phone: row.phone, message: row.message, createdAt: row.created_at }))); });

app.post("/storage/vehicle-photos/:prefix", async (c) => { const prefix = c.req.param("prefix"); if (!/^[a-zA-Z0-9_-]{1,100}$/.test(prefix)) throw new HTTPException(400, { message: "Invalid photo prefix" }); const body = await c.req.parseBody({ all: true }); const values = Array.isArray(body.files) ? body.files : [body.files]; const paths: string[] = []; for (const value of values) { if (!(value instanceof File)) continue; if (!value.type.startsWith("image/")) throw new HTTPException(422, { message: "Only image files are allowed" }); if (value.size > 10 * 1024 * 1024) throw new HTTPException(422, { message: "Image files must be 10MB or smaller" }); const extension = extname(value.name).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".jpg"; const filename = `${randomUUID()}${extension}`; const relative = `${prefix}/${filename}`; const absolute = join(storagePath, relative); await mkdir(resolve(absolute, ".."), { recursive: true }); await writeFile(absolute, Buffer.from(await value.arrayBuffer())); paths.push(relative); } return c.json({ paths }, 201); });
app.post("/storage/vehicle-photos/resolve", async (c) => { const input = await jsonBody(c, z.object({ paths: z.array(z.string().max(300)).max(30) })); const urls = input.paths.map((path) => `/storage/vehicle-photos/${encodeURIComponent(path)}`); return c.json({ urls }); });
app.get("/storage/vehicle-photos/*", async (c) => { const relative = decodeURIComponent(c.req.path.replace("/storage/vehicle-photos/", "")); const absolute = resolve(storagePath, relative); if (!absolute.startsWith(storagePath + sep)) throw new HTTPException(400, { message: "Invalid storage path" }); try { const data = await readFile(absolute); return new Response(data, { headers: { "Cache-Control": "private, max-age=3600" } }); } catch { throw new HTTPException(404, { message: "Photo not found" }); } });
app.delete("/storage/vehicle-photos", async (c) => { requireAdmin(c); const input = await jsonBody(c, z.object({ paths: z.array(z.string().max(300)).max(30) })); for (const path of input.paths) { const absolute = resolve(storagePath, path); if (absolute.startsWith(storagePath + sep)) await unlink(absolute).catch(() => undefined); } return c.body(null, 204); });

app.post("/notifications/submission", async (c) => { const input = await jsonBody(c, z.object({ type: z.enum(["buyer_submission", "seller_submission"]), submission: z.record(z.unknown()) })); void notify(input); return c.body(null, 204); });

app.onError((error, c) => { if (error instanceof HTTPException) return error.getResponse(); console.error(error); return c.json({ message: "Internal server error" }, 500); });

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
if (adminEmail && adminPassword && !db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail)) {
  const id = randomUUID(); db.prepare("INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)").run(id, adminEmail, await bcrypt.hash(adminPassword, 12), now()); db.prepare("INSERT INTO user_roles (user_id,role) VALUES (?, 'admin')").run(id); console.info(`[auth] seeded admin ${adminEmail}`);
}

serve({ fetch: app.fetch, port, hostname: process.env.HOST ?? "127.0.0.1" });
console.info(`AutoAce backend listening on http://${process.env.HOST ?? "127.0.0.1"}:${port}`);
