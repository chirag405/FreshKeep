-- FreshKeep Premium cloud sync schema.
-- Run this in the Supabase SQL Editor (or via `supabase db push` if you use the CLI)
-- against the Supabase project you create for this app. See supabase/README.md.

create table if not exists public.expiry_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null,
  expiry_date date not null,
  added_date date not null,
  opened_date date,
  location text,
  reminder_enabled boolean not null default false,
  reminder_days_before integer not null default 2,
  updated_at timestamptz not null default now()
);

create table if not exists public.last_time_tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null,
  last_done_date date not null,
  repeat_interval_days integer,
  reminder_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists expiry_items_user_id_idx on public.expiry_items (user_id);
create index if not exists last_time_tasks_user_id_idx on public.last_time_tasks (user_id);

alter table public.expiry_items enable row level security;
alter table public.last_time_tasks enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users manage their own expiry items" on public.expiry_items;
create policy "Users manage their own expiry items" on public.expiry_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own last-time tasks" on public.last_time_tasks;
create policy "Users manage their own last-time tasks" on public.last_time_tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create a profile row (defaulting to non-premium) whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
