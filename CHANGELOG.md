# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — Migration off Lovable + Supabase

### Removed
- Lovable Cloud, Lovable auth wrappers, Lovable deployment/build plumbing
  (`.lovable/`, `AGENTS.md`, `@lovable.dev/*` packages, Cloudflare
  Workers server entry).
- Supabase client, Supabase Auth, Supabase Storage, Supabase RPC
  functions, Postgres migrations, and all RLS-dependent behavior.
- TanStack Start (SSR server functions) — replaced with a plain Vite SPA;
  TanStack Router is retained client-side only.

### Added
- Clean layered architecture: `domain/` → `backend/ports` (interfaces) →
  `backend/adapters/http` (default REST implementation) →
  `application/services` (business logic) → `routes/` + `components/` (UI).
- Explicit `matchService`/`sellerService` logic replacing the old
  `create_match_on_seller_submission` Postgres trigger.
- `.env.example`, `docs/ARCHITECTURE.md`, `MIGRATION.md`.

### Changed
- All Supabase table/RPC calls in route components replaced with calls
  into `src/application/services/*`.
- Vehicle photo URLs are now resolved via `StorageService.resolveUrls`
  (backend-mediated) instead of client-side Supabase signed URLs.

See `MIGRATION.md` for the full audit trail and outstanding TODOs.
