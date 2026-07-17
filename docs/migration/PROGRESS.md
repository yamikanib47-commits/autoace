# AutoAce serverless migration progress

Status: Phase 1 audit in progress. Production is unchanged. The existing Bun/Hono backend remains the rollback implementation.

## Branch

`migration/serverless-supabase`

## Completed

- [x] Created migration branch from `main` at `16614db`.
- [x] Audited current frontend adapters, application services, backend routes, Supabase schema, and deployment configuration.
- [x] Written the route and dependency audit in `docs/migration/AUDIT.md`.

## In progress

- [ ] Add Supabase browser client and typed CRUD/storage adapters.
- [ ] Replace auth flow with direct Supabase Auth.
- [ ] Replace CRUD calls incrementally.
- [ ] Replace photo storage calls incrementally.
- [ ] Decide notification Edge Function/RPC boundary.
- [ ] Add local verification harness.

## Not started intentionally

- [ ] Production deployment.
- [ ] Removal of `backend/`.
- [ ] Removal of the current HTTP adapter.
- [ ] Any production environment changes.

## Verification gate

No merge or deployment recommendation until buyer, seller, marketplace, photo, auth, admin, role, match, interest, search, and CRUD tests pass against the serverless implementation.
