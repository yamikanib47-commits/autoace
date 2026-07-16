# Architecture

## Layers

```
┌─────────────────────────────────────────────────────────┐
│  Presentation  (src/routes, src/components)              │
│  React components, forms, navigation. Zero backend        │
│  imports — only calls into src/application/services.      │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│  Application  (src/application)                            │
│  services/    business logic, orchestration, side-effect   │
│               sequencing (e.g. "create listing, then      │
│               create the match, then notify")              │
│  validation/  Zod schemas shared by every form             │
│  utils/       pure helpers (currency formatting, WhatsApp  │
│               message building)                            │
│  Depends only on src/backend/ports (interfaces) and        │
│  src/domain (types) — never on a concrete adapter.          │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│  Backend ports  (src/backend/ports)                         │
│  AuthService, DatabaseService, StorageService,               │
│  NotificationService — plain TypeScript interfaces, no      │
│  vendor types, no SQL, no HTTP.                              │
└───────────────────────────┬───────────────────────────────┘
                             │ implemented by
┌───────────────────────────▼───────────────────────────────┐
│  Backend adapters  (src/backend/adapters/http)               │
│  The ONLY layer allowed to know about transport (fetch),    │
│  auth-token storage, and the wire format. Swappable.         │
└─────────────────────────────────────────────────────────────┘
```

**Rule of thumb:** if a file needs to import `fetch`, a vendor SDK, or
know a URL path, it belongs in `src/backend/adapters/*`. Everything else
should be adapter-agnostic.

## Why a REST adapter, and not a hardcoded database client

The migration brief calls for avoiding any hardcoded database engine and
preparing the app to connect to **Zo Computer** as its backend. Since Zo
Computer's exact client SDK/API wasn't available at migration time, the
default adapter (`src/backend/adapters/http`) speaks a documented,
generic REST contract (below) over `fetch`. This means:

- The app is immediately runnable against any backend that implements
  the contract (a small Express/Fastify/Zo Computer service, a BFF, etc).
- Connecting the real Zo Computer backend is a matter of either (a)
  implementing that REST contract server-side, or (b) writing a new
  adapter under `src/backend/adapters/zo-computer/` that implements the
  same four ports directly against Zo Computer's SDK, then swapping the
  instances created in `src/backend/index.ts`. **No other file changes.**

## Backend contract (for the default HTTP adapter)

See the JSDoc block at the top of each file in
`src/backend/adapters/http/` for the authoritative, up-to-date list.
Summary:

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/sign-in` | `{email,password}` → `Session` |
| POST | `/auth/sign-up` | `{email,password}` → `{requiresEmailConfirmation}` |
| POST | `/auth/sign-out` | 204 |
| GET | `/auth/session` | → `Session` or 204 |
| GET | `/buyer-requests/public` | PII-stripped, public |
| GET | `/buyer-requests` | full records, admin |
| POST | `/buyer-requests` | public create |
| DELETE | `/buyer-requests/:id` | admin |
| GET | `/vehicles/available` | PII-stripped, public |
| GET | `/vehicles` | full records, admin |
| POST | `/vehicles` | public create |
| PATCH | `/vehicles/:id/status` | admin |
| DELETE | `/vehicles/:id` | admin |
| GET / POST | `/matches`, PATCH `/matches/:id/status` | admin |
| POST | `/vehicle-interests` | public |
| GET | `/vehicle-interests` | admin |
| POST | `/storage/vehicle-photos/:prefix` | multipart upload → `{paths}` |
| POST | `/storage/vehicle-photos/resolve` | `{paths}` → `{urls}` |
| DELETE | `/storage/vehicle-photos` | admin |
| POST | `/notifications/submission` | fire-and-forget |

The backend is responsible for: authorization on admin-only routes,
input length/shape validation (mirrored client-side in
`src/application/validation/schemas.ts` for UX, but not to be trusted as
the security boundary), and rate limiting.

## Business rules that moved out of the database

The old Supabase schema encoded two pieces of logic that don't belong in
application code by convention but did belong there for migration
purposes, since Zo Computer's trigger/function story is unknown:

1. **Auto-matching.** A Postgres trigger
   (`create_match_on_seller_submission`) used to create a `Match` row
   whenever a seller submitted a listing with a `buyer_request_id`. This
   is now explicit in `sellerService.submitListing()` — it calls
   `databaseService.createMatch()` right after the listing is created,
   and swallows duplicate-match errors the same way the old
   `ON CONFLICT DO NOTHING` did.
2. **PII stripping for public reads.** `get_active_buyer_requests()` and
   `get_available_vehicles()` were `SECURITY DEFINER` Postgres functions
   that returned a safe column subset. The equivalent now lives in the
   `PublicBuyerRequest` / `PublicVehicleListing` domain types and the
   corresponding `/buyer-requests/public` and `/vehicles/available`
   endpoints — the backend must never include `name`/`phone`/`notes` in
   those responses.

If you'd rather keep either rule server-side and outside the client
entirely, that's compatible with this architecture — just have the
`/vehicles` POST endpoint create the match itself and make
`sellerService`'s explicit call a no-op/idempotent duplicate.
