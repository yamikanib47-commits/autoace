-- Run this in Supabase SQL Editor to enable public buyer/seller submissions and photo uploads.
-- This fixes the live error: new row violates row-level security policy.

drop policy if exists buyer_requests_public_insert on public.buyer_requests;
create policy buyer_requests_public_insert
on public.buyer_requests
for insert to anon, authenticated
with check (true);

drop policy if exists vehicle_listings_public_insert on public.vehicle_listings;
create policy vehicle_listings_public_insert
on public.vehicle_listings
for insert to anon, authenticated
with check (true);

drop policy if exists vehicle_interests_public_insert on public.vehicle_interests;
create policy vehicle_interests_public_insert
on public.vehicle_interests
for insert to anon, authenticated
with check (true);

grant insert on public.buyer_requests to anon, authenticated;
grant insert on public.vehicle_listings to anon, authenticated;
grant insert on public.vehicle_interests to anon, authenticated;

drop policy if exists vehicle_photos_public_read on storage.objects;
create policy vehicle_photos_public_read
on storage.objects
for select to anon, authenticated
using (bucket_id = 'vehicle-photos');

drop policy if exists vehicle_photos_public_insert on storage.objects;
create policy vehicle_photos_public_insert
on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'vehicle-photos');

grant select, insert on storage.objects to anon, authenticated;

-- The buyer-request view intentionally exposes no name, phone, or notes.
-- It must not inherit the base table's admin-only SELECT policy.
alter view public.public_buyer_requests set (security_invoker = false);
grant select on public.public_buyer_requests to anon, authenticated;
