# AutoAce backend

Bun + Hono REST API backed by Supabase Auth, Postgres, and Storage.

## Setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Add the values from `.env.example` to the backend environment. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Create the first user through the app or Supabase Auth, then run the admin promotion SQL in `supabase/promote-admin.sql` with that user's UUID.
4. Start with `bun install && bun run dev`.
