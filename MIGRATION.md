# Migration log — Lovable/Supabase → standalone

This document is the audit trail for the migration. Source project:
"AutoAce Journey" (Lovable project `autoacezed`), TanStack Start +
Supabase template.

## What was removed

**Lovable:**
- `.lovable/` (project metadata, plan notes)
- `AGENTS.md` (Lovable git-sync warning banner)
- `@lovable.dev/vite-tanstack-config`, `@lovable.dev/mcp-js`,
  `@lovable.dev/vite-plugin-dev-server-bridge`,
  `@lovable.dev/vite-plugin-hmr-gate` and their `bunfig.toml`
  supply-chain-guard exclusions
- `src/lib/lovable-error-reporting.ts` and its wiring into the Cloudflare
  Workers `src/server.ts` entry point
- The Cloudflare Workers/`nitro` SSR server entry itself (see "Framework
  change" below)

**Supabase:**
- `src/integrations/supabase/` in full (`client.ts`, `client.server.ts`,
  `types.ts`, `auth-attacher.ts`, `auth-middleware.ts`)
- `@supabase/supabase-js` dependency
- All 14 files under `supabase/migrations/` and `supabase/config.toml`
- Every `supabase.from(...)`, `supabase.rpc(...)`,
  `supabase.storage.from(...)`, and `supabase.auth.*` call across
  `src/routes/*` — replaced with calls into `src/application/services/*`

## What was replaced

| Old (Lovable/Supabase) | New |
| --- | --- |
| `supabase.auth.*` | `AuthService` port + `HttpAuthService` adapter |
| `supabase.from("buyer_submissions")` / `seller_submissions` | `DatabaseService` port + `HttpDatabaseService` adapter |
| `supabase.rpc("get_active_buyer_requests")` | `GET /buyer-requests/public` |
| `supabase.rpc("get_available_vehicles")` | `GET /vehicles/available` |
| `supabase.storage.from("vehicle-photos")` (upload + signed URLs) | `StorageService` port + `HttpStorageService` adapter |
| `create_match_on_seller_submission` Postgres trigger | Explicit call in `sellerService.submitListing()` — see `docs/ARCHITECTURE.md` |
| `has_role()` Postgres function / `user_roles` table | `AuthService.hasRole()` — backend's responsibility to implement |
| TanStack Start server function calling a `WEBHOOK_URL` | `NotificationService` port + `HttpNotificationService` adapter → `POST /notifications/submission` |
| Postgres RLS policies (length/shape checks) | Mirrored in `src/application/validation/schemas.ts` (UX only — backend must re-validate) |

### Framework change: TanStack Start (SSR) → Vite SPA

The original app used `@tanstack/react-start` with a Cloudflare
Workers-flavored server entry (`src/server.ts`), server functions
(`createServerFn`), and SSR-rendered route `head()` metadata. That
server layer existed mainly to (a) attach the Supabase bearer token to
RPCs and (b) call the webhook server-side.

Both needs are now met by the `backend/adapters/http` layer running
entirely client-side, so the SSR server was dropped in favor of a plain
Vite SPA using `@tanstack/react-router` (client-side only, still
file-based routing via `@tanstack/router-plugin`). This is a deliberate
simplification, not a requirement of removing Lovable/Supabase — TanStack
Start itself is open-source and could be reintroduced if you need SSR for
SEO. If you do, reintroduce `src/server.ts` and move the notification
call back into a server function.

### Admin seeding

The original migrations included one `INSERT INTO user_roles (...)
VALUES ('<a real user UUID>', 'admin')`. That row is user-account-specific
and was **intentionally not carried over** — seed your first admin
through whatever mechanism your new backend provides for role
assignment.

## Remaining TODOs

1. **Build the actual backend.** This repo ships only the client-side
   adapter; nothing implements the REST contract in
   `docs/ARCHITECTURE.md` yet. Until it exists, forms will fail to
   submit and lists will fail to load — this is expected.
2. **Re-add the real hero image.** `src/assets/hero-sedan.png` is a
   generated placeholder (the original binary asset couldn't be
   transcribed through the text-based migration path). Swap in the
   original photo.
3. **Decide where auto-matching lives.** Currently client-triggered
   (see Architecture doc); consider moving server-side once the backend
   exists, for atomicity with the listing insert.
4. **Decide on SSR.** If SEO/social-preview metadata per route matters,
   reintroduce a server (see "Framework change" above) or add a
   client-side `<head>` manager (e.g. `react-helmet-async`).
5. **Wire `hasRole`/roles model** into whatever auth Zo Computer provides
   — the port assumes a `roles: AppRole[]` array on the session user;
   adjust `Session`/`AuthenticatedUser` in `src/domain/types.ts` if Zo
   Computer's role model differs.
6. **Rate limiting / abuse protection** on public POST endpoints
   (buyer-requests, vehicles, vehicle-interests) — previously partially
   covered by Supabase RLS `CHECK` constraints; the backend must own this
   now.
7. Confirm `npm install && npm run build` cleanly in your environment —
   see "Known issues" below for what has and hasn't been verified here.

## Known issues

- This migration was performed by reading each source file from the
  Lovable project and hand-porting it; it was **not** run through a real
  npm install / build in this environment beyond a static review. Run
  `npm install && npm run typecheck && npm run build` before deploying
  and fix any dependency-version drift.
- A handful of shadcn/ui primitives that existed in the original project
  (`accordion`, `avatar`, `calendar`, `carousel`, `chart`, `command`,
  `sidebar`, etc.) were **not** carried over because nothing under
  `src/routes` actually imports them — they were unused. If you add
  features that need them, re-generate via `npx shadcn@latest add
  <component>`.

## Testing checklist

- [ ] `npm install` completes cleanly
- [ ] `npm run typecheck` passes
- [ ] `npm run build` produces a `dist/` bundle
- [ ] Backend implements every endpoint in `docs/ARCHITECTURE.md`
- [ ] Buyer request form submits and appears in admin "Buyers" tab
- [ ] Seller listing form submits (with photos) and appears in admin
      "Sellers" tab, and photos render on `/marketplace` and the detail page
- [ ] Submitting a seller listing via a `/sell?request=<id>` link creates
      a `Match` visible in admin "Matches" tab
- [ ] `/requests` and `/marketplace` never expose buyer/seller
      name/phone/notes in the network payload
- [ ] Admin sign-in redirects non-admin accounts away from `/admin`
- [ ] Vehicle status changes (available/reserved/sold) reflect on the
      public marketplace
- [ ] "I'm interested" on a vehicle detail page creates a
      `VehicleInterest` visible under the matching seller card in admin
- [ ] WhatsApp links (buyer, seller, interest follow-up, shareable post)
      open with correctly pre-filled text
- [ ] Deleting a buyer/seller submission in admin removes it immediately
