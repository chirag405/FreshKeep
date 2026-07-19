-- Shared households (Splitwise-style): one list shared by several people.
-- Design doc: docs/features/2026-07-17-shared-households-and-mili-voice-agent.md
-- Run after 0004. Free tier: max 3 members per household (owner included);
-- Premium owner: max 10. Caps and invite redemption are enforced HERE, in
-- security-definer functions — never client-side (same lesson as the
-- is_premium RLS fix in 0001).

-- ── Tables ─────────────────────────────────────────────────────────────

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.invites (
  token uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  contact text not null, -- phone or email; display-only (the token link is what joins)
  invited_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days'
);

create index if not exists household_members_user_id_idx on public.household_members (user_id);
create index if not exists invites_household_id_idx on public.invites (household_id);

-- Items gain an optional household + creator attribution.
alter table public.expiry_items add column if not exists household_id uuid references public.households (id) on delete set null;
alter table public.expiry_items add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table public.last_time_tasks add column if not exists household_id uuid references public.households (id) on delete set null;
alter table public.last_time_tasks add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists expiry_items_household_id_idx on public.expiry_items (household_id) where household_id is not null;
create index if not exists last_time_tasks_household_id_idx on public.last_time_tasks (household_id) where household_id is not null;

-- Display names for member lists / "added by" bylines. Backfill from the
-- Google profile metadata; keep in sync for new signups via the trigger.
alter table public.profiles add column if not exists display_name text;

update public.profiles p
set display_name = coalesce(u.raw_user_meta_data ->> 'full_name', u.email)
from auth.users u
where u.id = p.user_id and p.display_name is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (user_id) do update set display_name = excluded.display_name;
  return new;
end;
$$;

-- ── Membership helper (security definer so RLS policies can call it
--    without recursing into household_members' own policies) ────────────

create or replace function public.is_household_member(h uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

-- ── RLS ────────────────────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.invites enable row level security;

-- Read-only for members; all writes go through the RPCs below.
drop policy if exists "Members can read their household" on public.households;
create policy "Members can read their household" on public.households
  for select using (public.is_household_member(id));

drop policy if exists "Members can read co-members" on public.household_members;
create policy "Members can read co-members" on public.household_members
  for select using (public.is_household_member(household_id));

drop policy if exists "Members can read household invites" on public.invites;
create policy "Members can read household invites" on public.invites
  for select using (public.is_household_member(household_id));

-- Items: personal rows stay owner-only; household rows open to all members.
drop policy if exists "Users manage their own expiry items" on public.expiry_items;
create policy "Users manage their own expiry items" on public.expiry_items
  for all
  using (auth.uid() = user_id or (household_id is not null and public.is_household_member(household_id)))
  with check (auth.uid() = user_id or (household_id is not null and public.is_household_member(household_id)));

drop policy if exists "Users manage their own last-time tasks" on public.last_time_tasks;
create policy "Users manage their own last-time tasks" on public.last_time_tasks
  for all
  using (auth.uid() = user_id or (household_id is not null and public.is_household_member(household_id)))
  with check (auth.uid() = user_id or (household_id is not null and public.is_household_member(household_id)));

-- ── RPCs (the only write path; all security definer) ───────────────────

-- One household per user in v1: both create and join enforce it.

create or replace function public.create_household(p_name text)
returns public.households
language plpgsql security definer set search_path = public
as $$
declare
  v_household public.households;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;
  insert into households (name, owner_id)
  values (coalesce(nullif(trim(p_name), ''), 'My household'), auth.uid())
  returning * into v_household;
  insert into household_members (household_id, user_id, role)
  values (v_household.id, auth.uid(), 'owner');
  return v_household;
end;
$$;

create or replace function public.create_invite(p_household uuid, p_contact text)
returns public.invites
language plpgsql security definer set search_path = public
as $$
declare
  v_invite public.invites;
begin
  if not is_household_member(p_household) then
    raise exception 'not_a_member';
  end if;
  insert into invites (household_id, contact, invited_by)
  values (p_household, coalesce(trim(p_contact), ''), auth.uid())
  returning * into v_invite;
  return v_invite;
end;
$$;

create or replace function public.redeem_invite(p_token uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_invite public.invites;
  v_owner uuid;
  v_owner_premium boolean;
  v_cap integer;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;

  select * into v_invite from invites where token = p_token;
  if not found or v_invite.expires_at < now() then
    raise exception 'invite_invalid_or_expired';
  end if;

  -- Lock the household row so two simultaneous redemptions can't both pass
  -- the cap check and push a free household past its member limit.
  select owner_id into v_owner from households where id = v_invite.household_id for update;
  select coalesce(is_premium, false) into v_owner_premium from profiles where user_id = v_owner;
  v_cap := case when v_owner_premium then 10 else 3 end;

  select count(*) into v_count from household_members where household_id = v_invite.household_id;
  if v_count >= v_cap then
    raise exception 'household_full';
  end if;

  insert into household_members (household_id, user_id, role)
  values (v_invite.household_id, auth.uid(), 'member');
  delete from invites where token = p_token;
  return v_invite.household_id;
end;
$$;

create or replace function public.leave_household(p_household uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_next uuid;
begin
  select role into v_role from household_members
  where household_id = p_household and user_id = auth.uid();
  if not found then
    raise exception 'not_a_member';
  end if;

  delete from household_members where household_id = p_household and user_id = auth.uid();

  if v_role = 'owner' then
    -- Ownership transfers to the longest-standing remaining member; an
    -- empty household is deleted (cascades to invites and nulls item refs).
    select user_id into v_next from household_members
    where household_id = p_household
    order by joined_at asc limit 1;
    if v_next is null then
      delete from households where id = p_household;
    else
      update households set owner_id = v_next where id = p_household;
      update household_members set role = 'owner'
      where household_id = p_household and user_id = v_next;
    end if;
  end if;
end;
$$;

-- Member list with display names (profiles RLS is select-own-only, so this
-- is the sanctioned way to see co-members' names — membership-gated).
create or replace function public.get_household_members(p_household uuid)
returns table (user_id uuid, display_name text, role text, joined_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.user_id, coalesce(p.display_name, 'Member') as display_name, m.role, m.joined_at
  from household_members m
  left join profiles p on p.user_id = m.user_id
  where m.household_id = p_household and is_household_member(p_household);
$$;

-- ── Realtime ───────────────────────────────────────────────────────────
-- Members should see each other's edits live. Adding tables to the
-- publication errors if they're already in it, hence the guarded DO block.

do $$
begin
  alter publication supabase_realtime add table public.expiry_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.last_time_tasks;
exception when duplicate_object then null;
end $$;
