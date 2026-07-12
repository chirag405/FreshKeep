-- LemonSqueezy billing metadata. `is_premium` remains the single source of
-- truth the app reads for gating cloud sync; it is derived from
-- `subscription_status` by the webhook handler (see
-- supabase/functions/lemonsqueezy-webhook), never computed client-side.

alter table public.profiles
  add column if not exists lemonsqueezy_customer_id text,
  add column if not exists subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists plan text,
  add column if not exists renews_at timestamptz;

create index if not exists profiles_subscription_id_idx on public.profiles (subscription_id);
