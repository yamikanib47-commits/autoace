# AutoAce

A car marketplace connecting buyers and sellers in Zambia — buyers post
what they're looking for, sellers list vehicles, and admins manage
matching, moderation, and outreach.

This is a **standalone** codebase: it has no dependency on Lovable or
Supabase. See `MIGRATION.md` for what changed and why, and
`docs/ARCHITECTURE.md` for how the layers fit together.

## Features

- Buyer requests (name, budget, preferred make/model/year, city, etc.)
- Seller listings with photo upload
- Public marketplace with search, filtering, and sorting
- Public buyer-request board so sellers can respond to specific requests
- Buyer/seller matching (automatic on submission + admin review)
- Vehicle detail page with an "I'm interested" flow
- Admin dashboard: review buyers/sellers/matches/interests, update
  statuses, one-tap WhatsApp outreach, generate anonymized WhatsApp posts
- Auth-gated admin area

## Tech stack

- React 19 + TypeScript, strict mode
- Vite (SPA — no SSR server)
- TanStack Router (client-side, file-based routes)
- Tailwind CSS v4 + shadcn/ui-style primitives
- Zod for validation

The app talks to its backend **only** through the service interfaces in
`src/backend/ports`. The default implementation is a REST adapter
(`src/backend/adapters/http`); see `docs/ARCHITECTURE.md` for how to wire
up a different backend (e.g. Zo Computer) without touching UI code.

## Getting started

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your backend
npm run dev
```

The app expects a backend implementing the REST contract documented in
`docs/ARCHITECTURE.md` ("Backend contract") and in the JSDoc comments at
the top of each file under `src/backend/adapters/http/`. Until that
backend exists, the app will build and render, but data-fetching routes
will fail — this is expected (see `MIGRATION.md` → "Remaining TODOs").

## Scripts

| Command            | Description                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the Vite dev server             |
| `npm run build`     | Type-check and build for production   |
| `npm run preview`   | Preview the production build          |
| `npm run typecheck` | Type-check only                       |
| `npm run lint`      | Lint with ESLint                      |

## Project structure

```
src/
  domain/            Framework/backend-agnostic types (Vehicle, BuyerRequest, ...)
  backend/
    ports/           Interfaces: AuthService, DatabaseService, StorageService, NotificationService
    adapters/http/   Default REST implementation of the ports
    index.ts         Composition root — wires ports to adapters
  application/
    services/        Business logic (buyerService, sellerService, matchService, ...)
    validation/       Zod schemas
    utils/            Pure helpers (currency, WhatsApp link building)
  components/         Presentation: UI primitives + app components
  routes/             Pages (file-based routing via TanStack Router)
```

See `docs/ARCHITECTURE.md` for the full rationale and data-flow diagram.
