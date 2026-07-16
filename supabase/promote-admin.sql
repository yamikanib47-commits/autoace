-- Replace the UUID, then run this in Supabase SQL Editor.
insert into public.user_roles (user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;
