-- Run once in Supabase: SQL Editor -> New query -> Run

create table if not exists public.rankings (
  id text primary key,
  name text not null,
  workshop_order int4[] not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.result (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rankings enable row level security;
alter table public.result enable row level security;

-- Small trusted group, anonymous access via the anon key.
drop policy if exists "rankings read" on public.rankings;
drop policy if exists "rankings write" on public.rankings;
drop policy if exists "result read" on public.result;
drop policy if exists "result write" on public.result;

create policy "rankings read"  on public.rankings for select to anon using (true);
create policy "rankings write" on public.rankings for all    to anon using (true) with check (true);
create policy "result read"    on public.result   for select to anon using (true);
create policy "result write"   on public.result   for all    to anon using (true) with check (true);
