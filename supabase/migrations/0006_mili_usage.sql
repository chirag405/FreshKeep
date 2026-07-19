-- Usage log for the "Mili" voice agent (Premium-only). The mili-parse Edge
-- Function inserts one row per request (service role) and rate-limits by
-- counting a user's rows in the trailing hour. RLS is enabled with NO
-- policies on purpose: regular clients can neither read nor forge usage —
-- only the service role (which bypasses RLS) touches this table.

create table if not exists public.mili_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists mili_usage_user_time_idx on public.mili_usage (user_id, created_at desc);

alter table public.mili_usage enable row level security;
