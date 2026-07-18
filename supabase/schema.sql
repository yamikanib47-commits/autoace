create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

create table if not exists public.buyer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (char_length(phone) between 7 and 20),
  budget text not null,
  preferred_make text,
  preferred_model text,
  preferred_year text,
  city text,
  transmission text,
  fuel_type text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_listings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (char_length(phone) between 7 and 20),
  make text not null,
  model text not null,
  year integer not null check (year between 1886 and 2030),
  price text not null,
  mileage text not null,
  transmission text,
  fuel_type text,
  city text,
  description text,
  condition text,
  notes text,
  photo_paths jsonb not null default '[]'::jsonb,
  status text not null default 'available' check (status in ('available','reserved','sold')),
  buyer_request_id uuid references public.buyer_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  buyer_request_id uuid not null references public.buyer_requests(id) on delete cascade,
  vehicle_listing_id uuid not null references public.vehicle_listings(id) on delete cascade,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_request_id, vehicle_listing_id)
);

create table if not exists public.vehicle_interests (
  id uuid primary key default gen_random_uuid(),
  vehicle_listing_id uuid not null references public.vehicle_listings(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (char_length(phone) between 7 and 20),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists buyer_requests_created_at_idx on public.buyer_requests(created_at desc);
create index if not exists vehicle_listings_status_created_at_idx on public.vehicle_listings(status, created_at desc);
create index if not exists matches_created_at_idx on public.matches(created_at desc);
create index if not exists vehicle_interests_vehicle_created_at_idx on public.vehicle_interests(vehicle_listing_id, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'); $$;

alter table public.user_roles enable row level security;
alter table public.buyer_requests enable row level security;
alter table public.vehicle_listings enable row level security;
alter table public.matches enable row level security;
alter table public.vehicle_interests enable row level security;

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists buyer_requests_public_insert on public.buyer_requests;
create policy buyer_requests_public_insert on public.buyer_requests for insert to anon, authenticated with check (true);
grant insert on public.buyer_requests to anon, authenticated;
drop policy if exists buyer_requests_admin_read on public.buyer_requests;
create policy buyer_requests_admin_read on public.buyer_requests for select to authenticated using (public.is_admin());
drop policy if exists buyer_requests_admin_delete on public.buyer_requests;
create policy buyer_requests_admin_delete on public.buyer_requests for delete to authenticated using (public.is_admin());

drop policy if exists vehicle_listings_public_read on public.vehicle_listings;
create policy vehicle_listings_public_read on public.vehicle_listings for select to anon, authenticated using (status = 'available');
drop policy if exists vehicle_listings_public_insert on public.vehicle_listings;
create policy vehicle_listings_public_insert on public.vehicle_listings for insert to anon, authenticated with check (true);
grant insert on public.vehicle_listings to anon, authenticated;
drop policy if exists vehicle_listings_admin_all on public.vehicle_listings;
create policy vehicle_listings_admin_all on public.vehicle_listings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists matches_admin_all on public.matches;
create policy matches_admin_all on public.matches for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists vehicle_interests_public_insert on public.vehicle_interests;
create policy vehicle_interests_public_insert on public.vehicle_interests for insert to anon, authenticated with check (true);
grant insert on public.vehicle_interests to anon, authenticated;
drop policy if exists vehicle_interests_admin_read on public.vehicle_interests;
create policy vehicle_interests_admin_read on public.vehicle_interests for select to authenticated using (public.is_admin());

create or replace view public.public_buyer_requests as
select id, budget, preferred_make, preferred_model, preferred_year, city, transmission, fuel_type, created_at
from public.buyer_requests;

grant select on public.public_buyer_requests to anon, authenticated;

create or replace view public.public_vehicle_listings as
select id, make, model, year, price, mileage, transmission, fuel_type, city, description, condition, photo_paths, status, buyer_request_id, created_at
from public.vehicle_listings where status = 'available';

grant select on public.public_vehicle_listings to anon, authenticated;

alter view public.public_buyer_requests set (security_invoker = false);
alter view public.public_vehicle_listings set (security_invoker = false);


insert into storage.buckets (id, name, public) values ('vehicle-photos', 'vehicle-photos', true) on conflict (id) do update set public = true;

drop policy if exists vehicle_photos_public_read on storage.objects;
create policy vehicle_photos_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'vehicle-photos');

grant select on storage.objects to anon, authenticated;

drop policy if exists vehicle_photos_public_insert on storage.objects;
create policy vehicle_photos_public_insert on storage.objects for insert to anon, authenticated with check (bucket_id = 'vehicle-photos');

grant insert on storage.objects to anon, authenticated;
