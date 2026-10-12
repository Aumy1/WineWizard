-- Run in your own Supabase SQL editor. Only the server's service role can access
-- this table. Firebase token verification and owner filters run in backend/server.js.
create table if not exists public.bottles (
  id uuid primary key,
  owner_id text not null check (length(owner_id) between 1 and 128),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists bottles_owner_created on public.bottles (owner_id, created_at desc);
alter table public.bottles enable row level security;
revoke all on public.bottles from anon, authenticated;
grant select, insert, delete on public.bottles to service_role;
