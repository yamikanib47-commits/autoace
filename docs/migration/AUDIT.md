# AutoAce serverless migration audit

Date: 2026-07-17
Branch: `migration/serverless-supabase`
Baseline: `main` / commit `16614db`
Production status: unchanged

## Current architecture

```text
Vercel React/Vite SPA
  -> browser HTTP adapter (`src/backend/adapters/http`)
  -> always-on Bun/Hono API (`backend/src/server.ts`)
  -> Supabase Auth, Postgres, Storage
  -> optional Telegram Bot API
```

Target architecture:

```text
Vercel React/Vite SPA
  -> browser Supabase client + CRUD/storage abstraction
  -> Supabase Auth, Postgres, Storage
  -> selected Supabase Edge Function(s) for privileged/provider work
```

The current backend remains intact until feature-by-feature verification is complete.

## Phase 1 migration checklist

- [x] List every current backend route.
- [x] List every frontend fetch/API call.
- [x] List authentication flows and token persistence.
- [x] List photo upload, URL resolution, and deletion paths.
- [x] List notification paths and provider dependencies.
- [x] List database tables, views, SQL functions, RLS policies, and storage bucket.
- [x] List Bun/Hono runtime dependencies and environment variables.
- [x] Identify direct-Supabase versus Edge Function candidates.
- [x] Record known contract mismatches and risks.

## Backend routes and replacement decisions

| Current route | Current caller | Current implementation | Target replacement | Migration status |
|---|---|---|---|---|
| `GET /health` | Monitoring/manual | Hono only | Vercel/Supabase health check; not needed by frontend | Preserve until cutover |
| `POST /auth/sign-up` | `HttpAuthService.signUp` | Supabase Admin Auth via Bun service-role key | Direct browser `supabase.auth.signUp`; role insert handled by DB/default or controlled function | Not started |
| `POST /auth/sign-in` | `HttpAuthService.signIn` | Supabase password auth via Bun | Direct browser `supabase.auth.signInWithPassword` | Not started |
| `POST /auth/sign-out` | `HttpAuthService.signOut` | Bun validates/signs out token | Direct browser `supabase.auth.signOut` | Not started |
| `GET /auth/session` | `HttpAuthService.getSession` | Bun validates bearer and reads role | Direct browser `supabase.auth.getSession` + role query | Not started |
| `GET /buyer-requests/public` | Requests page | Supabase view through Bun | Direct read from `public_buyer_requests` | Not started |
| `GET /buyer-requests` | Admin dashboard | Bun service-role query | Direct authenticated read under admin RLS | Not started |
| `POST /buyer-requests` | Buy form | Bun validates and inserts | Direct insert through CRUD adapter under insert RLS; notification decoupled | Not started |
| `DELETE /buyer-requests/:id` | Admin dashboard | Bun admin check then delete | Direct delete under admin RLS | Not started |
| `GET /vehicles/available` | Marketplace/detail page | Supabase view through Bun | Direct read from `public_vehicle_listings` | Not started |
| `GET /vehicles` | Admin dashboard | Bun service-role query | Direct authenticated read under admin RLS | Not started |
| `POST /vehicles` | Sell form | Bun validates/inserts and auto-creates match | Direct insert; match creation moved to idempotent DB RPC/trigger or one controlled Edge Function | Not started |
| `PATCH /vehicles/:id/status` | Admin dashboard | Bun admin check then update | Direct update under admin RLS | Not started |
| `DELETE /vehicles/:id` | Admin dashboard | Bun admin check then delete | Direct delete under admin RLS; photo cleanup separately | Not started |
| `GET /matches` | Admin dashboard | Bun join query | Direct admin read with relational select or RPC | Not started |
| `POST /matches` | Seller service | Bun upsert | Direct admin-only upsert is currently a contract mismatch; replace with idempotent DB RPC/Edge Function callable by the seller workflow | Not started |
| `PATCH /matches/:id/status` | Admin dashboard | Bun admin check then update | Direct update under admin RLS | Not started |
| `POST /vehicle-interests` | Vehicle detail page | Bun validates/inserts | Direct insert under insert RLS | Not started |
| `GET /vehicle-interests` | Admin dashboard | Bun admin check then read | Direct admin read under RLS | Not started |
| `POST /storage/vehicle-photos/:prefix` | Seller form | Bun multipart proxy to Supabase Storage | Direct browser Storage upload with client-generated prefix/path | Not started |
| `POST /storage/vehicle-photos/resolve` | Marketplace/detail/admin | Bun returns public Storage URLs | Direct `getPublicUrl` in storage adapter | Not started |
| `DELETE /storage/vehicle-photos` | Admin dashboard | Bun admin check then Storage remove | Direct Storage removal under storage RLS or controlled Edge Function | Not started |
| `POST /notifications/submission` | Browser notification adapter | Bun Telegram proxy | Remove duplicate browser call; use one Edge Function/database webhook boundary if Telegram remains enabled | Not started |

## Every frontend fetch/API call

All current browser network calls go through `src/backend/adapters/http/httpClient.ts`. The base URL is `import.meta.env.VITE_API_BASE_URL`.

### Auth adapter

- `GET /auth/session`
- `POST /auth/sign-in`
- `POST /auth/sign-up`
- `POST /auth/sign-out`

### Database adapter

- `GET /buyer-requests/public`
- `GET /buyer-requests`
- `POST /buyer-requests`
- `DELETE /buyer-requests/:id`
- `GET /vehicles/available`
- `GET /vehicles`
- `POST /vehicles`
- `PATCH /vehicles/:id/status`
- `DELETE /vehicles/:id`
- `GET /matches`
- `POST /matches`
- `PATCH /matches/:id/status`
- `POST /vehicle-interests`
- `GET /vehicle-interests`

### Storage adapter

- `POST /storage/vehicle-photos/:prefix` with multipart field `files`
- `POST /storage/vehicle-photos/resolve` with `{ paths }`
- `DELETE /storage/vehicle-photos` with `{ paths }`

### Notification adapter

- `POST /notifications/submission` with `{ type, submission }`

### Non-API browser operations

- `window.localStorage` key `autoace.session`
- `crypto.randomUUID()` for seller photo prefixes
- `URL.createObjectURL()` for local photo previews
- `navigator.clipboard.writeText()` for admin post copying
- WhatsApp `wa.me` links generated client-side

## Authentication audit

### Current flow

1. Browser submits email/password to Bun `/auth/sign-in`.
2. Bun calls Supabase password auth using the service-role key.
3. Bun reads `user_roles` and returns `{ user, accessToken }`.
4. Browser stores the complete session in `localStorage['autoace.session']`.
5. HTTP adapter attaches `Authorization: Bearer <accessToken>` to protected calls.
6. Bun calls `supabase.auth.getUser(token)` for every protected request.
7. Bun reads `user_roles` and enforces `admin` on admin routes.

### Target flow

1. Browser calls `supabase.auth.signUp`.
2. Browser calls `supabase.auth.signInWithPassword`.
3. Supabase JS manages the session and refresh token in browser storage.
4. Application role adapter reads `user_roles` through RLS.
5. Admin UI remains protected by both client role gating and database RLS.
6. No service-role key enters the browser.

### Authentication risks to resolve

- Public sign-up currently inserts a `user` role from the Bun API. Direct sign-up needs a safe default-role trigger or a narrowly scoped RPC.
- The current `user_roles` policy calls `is_admin()` from its own policy; this must be checked for recursion before direct client reads.
- `user_roles` currently has one row per user because `user_id` is the primary key; this is sufficient for current `admin/user` roles but differs from the earlier composite-key design.

## Database and storage audit

### Tables

- `user_roles`
- `buyer_requests`
- `vehicle_listings`
- `matches`
- `vehicle_interests`

### Views

- `public_buyer_requests`
- `public_vehicle_listings`

### SQL function

- `public.is_admin()` — checks `auth.uid()` against `user_roles`.

### Storage bucket

- `vehicle-photos`
- Public read enabled.
- Backend currently performs uploads/removal using the service-role key.
- Direct client migration needs insert/delete Storage policies and path restrictions.

### RLS behaviour currently defined

- Buyer requests: anonymous insert; admin read/delete.
- Vehicle listings: anonymous available read and insert; admin all.
- Matches: admin all.
- Vehicle interests: anonymous insert; admin read.
- User roles: self/admin read.
- Storage: public read policy only; write/delete policies are not yet defined for direct browser access.

## Notification audit

Current notification paths:

1. `buyerService.submitRequest()` calls `notificationService.notifySubmission()` after the buyer insert.
2. `sellerService.submitListing()` calls `notificationService.notifySubmission()` after the seller insert.
3. The browser adapter posts to `/notifications/submission`.
4. Bun's `/notifications/submission` route calls Telegram.
5. Bun also independently calls Telegram inside `/buyer-requests` and `/vehicles` creation routes.

This is duplicated. The target should have one event path. Preferred design:

- Database insert succeeds.
- A Supabase Edge Function receives a deliberate notification event or a database webhook invokes it.
- Telegram is optional and provider-specific code stays inside the Edge Function.
- Frontend submission success never waits for Telegram.

## Bun/Hono dependency audit

### Runtime-only files

- `backend/src/server.ts`
- `backend/start.sh`
- `backend/package.json`
- `backend/bun.lock`
- `backend/tsconfig.json`
- `backend/.env`
- `backend/.env.example`
- `backend/README.md`

### Runtime dependencies

- Bun
- `@hono/node-server`
- `hono`
- `@supabase/supabase-js`
- `zod`
- Node built-in `fs`
- native `fetch`
- native `crypto.randomUUID`

`bcryptjs` is listed in the backend manifest but not used by the current Supabase implementation. It can be removed only after confirming no deployment cache or script requires it.

### Server-only environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`
- `HOST`
- `APP_ORIGIN`
- `AUTOACE_ENV_FILE`
- `TELEGRAM_BOT_TOKEN` optional
- `TELEGRAM_CHAT_ID` optional

## Direct Supabase versus Edge Function plan

### Direct browser Supabase calls

Suitable after RLS/policy verification:

- Auth sign-up/sign-in/sign-out/session
- Public buyer-request view read
- Public vehicle view read
- Public buyer-request insert
- Public vehicle insert
- Public vehicle-interest insert
- Admin buyer/vehicle/match/interest reads
- Admin vehicle status updates
- Admin deletes
- Admin match status updates
- Public Storage URL resolution
- Browser Storage upload once policies are added

### Edge Function or SQL RPC

Use a controlled server-side boundary for:

- Default user-role assignment if a database trigger is not preferred.
- Atomic vehicle insert + optional match creation.
- Idempotent match creation callable from the seller workflow.
- Telegram notifications.
- Storage deletion if direct Storage delete policy is too permissive.
- Rate limiting or abuse protection if database/API-level controls are added.

## Known contract mismatches found during audit

1. The frontend `Match` type expects `buyerRequest` and `vehicleListing`, and the current backend now maps those names. Any direct Supabase adapter must preserve that shape.
2. The current backend creates a match inside vehicle creation and the frontend also calls `POST /matches`; the unique constraint makes this idempotent, but the duplicate call should be removed during migration.
3. The current frontend photo prefix is generated before the listing UUID exists. Direct Storage can preserve this prefix and store it in `photoPaths`; the database does not require paths to start with the listing UUID.
4. The current storage bucket is public, while earlier migration notes described signed URLs. Preserve current public image behaviour unless a product decision changes it.
5. Documentation in `README.md` and `MIGRATION.md` still describes the pre-Supabase backend state and should be updated only after the migration is verified.

## Phase 9 verification matrix

- [ ] Buyer form inserts a row and returns success.
- [ ] Public buyer-request board reads safe fields only.
- [ ] Seller form inserts a row and returns success.
- [ ] Direct image upload succeeds with size/type/path restrictions.
- [ ] Marketplace reads available vehicles only.
- [ ] Vehicle detail loads and image URLs render.
- [ ] Vehicle interest inserts and appears in admin.
- [ ] Admin login, session refresh, and logout work.
- [ ] Non-admin cannot read or mutate admin resources.
- [ ] Admin can read/delete buyer and seller records.
- [ ] Admin can update vehicle and match status.
- [ ] Match creation is idempotent.
- [ ] Seller response to buyer request creates one match.
- [ ] Search/filter/sort still works on marketplace and requests.
- [ ] Telegram notification is non-blocking and provider failure does not fail submissions.
- [ ] Direct Vercel deep links work.
- [ ] Existing Bun backend remains available for rollback.
