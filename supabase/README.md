# Supabase setup

1. Open the Supabase SQL Editor for the AutoAce project.
2. Run `schema.sql` once. It creates the tables, RLS policies, safe public views, and the `vehicle-photos` storage bucket.
3. Create the first account from the AutoAce app.
4. Copy that account's UUID from **Authentication → Users**, replace the placeholder in `promote-admin.sql`, and run it.
5. Configure the backend with `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`.

The service role key must never be placed in the Vite frontend `.env` or committed to git.
