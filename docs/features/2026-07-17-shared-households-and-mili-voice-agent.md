# FreshKeep roadmap features: Shared households & "Mili" voice agent

Status: **specced, not implemented**. Two features planned on top of the
current architecture (Expo + local SQLite, Supabase for auth/sync,
LemonSqueezy for Premium billing). This doc records the product decisions,
data-model changes, and open questions so implementation can start without
re-deriving them.

---

## Feature 1 — Shared households (Splitwise-style)

### What it is

One FreshKeep list shared by several people — a family fridge, a flat's
chore rota. Any member can add/edit items and everyone sees the same list,
exactly like a Splitwise group. Members are invited by **phone number or
email (Gmail)**, like Splitwise's add-by-contact flow.

### Tier limits

| Tier | Household size |
|---|---|
| Free | **max 3 members** (including the owner) |
| Premium | up to 10 members (cap to keep Realtime fan-out + abuse bounded; raise later if needed) |

Sharing inherently requires the cloud, so this is the one place free-tier
data leaves the device: **items in a shared household sync via Supabase even
on the free plan** (that's the freemium hook — you feel the product's
multiplayer value before paying). Personal, non-household items keep the
current behavior: on-device for free, cloud backup for Premium. The
Settings privacy footnote ("everything stays on this device") must be
updated to say "…except items in a shared household".

### Invite flow (how Splitwise-style contacts work with Google-only auth)

We deliberately have **no phone/SMS auth** (see supabase/README.md), so
"invite by phone number" cannot mean "they log in with that number". Instead
invites are **token links**, matched to whatever account the invitee signs
in with:

1. Owner taps *Invite* → enters a phone number or email (or picks from the
   share sheet).
2. App creates an `invites` row `{ token, household_id, contact,
   invited_by, expires_at }` and opens the OS share sheet with a deep link
   `freshkeep://join/<token>` (sent via SMS/WhatsApp if a phone number was
   entered, via email otherwise — the app never sends SMS itself, the user's
   own messaging app does, so there's no Twilio/DLT cost).
3. Invitee installs the app, opens the link, signs in with Google, and the
   token is redeemed → `household_members` row created.
4. Email invites additionally auto-match: if a user signs in with a Google
   account whose email equals a pending invite's `contact`, offer to join
   immediately (no link needed) — this is the closest to Splitwise's "they
   already appear in the group as pending".

Redemption is atomic and enforces the member cap server-side (Postgres
function, `security definer`), so two simultaneous redemptions can't push a
free household past 3.

### Data model (Supabase migration sketch)

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',       -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table invites (
  token uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  contact text not null,                     -- phone or email, display only
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days'
);

alter table expiry_items    add column household_id uuid references households(id);
alter table last_time_tasks add column household_id uuid references households(id);
alter table expiry_items    add column created_by uuid references auth.users(id);
alter table last_time_tasks add column created_by uuid references auth.users(id);
```

`household_id is null` = personal item (current behavior, unchanged).

**RLS**: replace the `auth.uid() = user_id` policies on both item tables
with: *(row is personal and mine) OR (row's household has a
household_members row for auth.uid())*. Membership checks go through a
`security definer` helper function to avoid recursive-RLS pitfalls. Member
caps and invite redemption are enforced in Postgres functions, never
client-side (same lesson as the `is_premium` RLS hole fixed in 0001).

### Sync & realtime changes

- `pullAndMergeAll()` pulls `user_id = me OR household_id in (my
  households)` instead of only `user_id`.
- Subscribe to Supabase Realtime on the household's item rows so edits from
  other members appear live (we already do this pattern for `profiles.is_premium`).
- Last-write-wins by `updated_at` already handles two members editing the
  same item; no new conflict machinery needed for v1.
- Deletes still don't propagate (no tombstones — known v1 simplification);
  this becomes *more* visible with multiple devices, so tombstones are the
  first follow-up if households ship.

### UX surface

- Settings → new **HOUSEHOLD** section: member list with avatars, Invite
  button, Leave/Remove.
- Item cards in a shared household show a tiny "added by {name}" byline
  (from `created_by`).
- Reminders: each member's device schedules its own local notification for
  items they have reminders enabled on — per-member preference, not global
  (open question below).

### Open questions

1. When member B enables a reminder on an item, does it enable for everyone
   or just B? (Proposed: reminder settings are per-member overlays, stored
   locally — server keeps only the item.)
2. What happens to a household's items when the owner deletes their
   account? (Proposed: ownership transfers to the oldest member.)
3. Does downgrading from Premium with a 6-member household lock it?
   (Proposed: read-only until pruned to 3, never silent data loss.)

---

## Feature 2 — "Mili" voice agent (Premium-only)

### What it is

A push-to-talk assistant: hold the mic button, say **"Hey Mili, add eggs
with 6 days of expiry"**, release — the item appears, icon auto-picked,
reminder per your default lead time. No typing, no date picker.

Not an always-listening wake word in v1 (battery, mic-permission optics,
and OS background-audio restrictions); the "hey Mili" phrasing works but the
activation is the button. Wake word is explicitly out of scope until v3.

### Why it's paid

Speech-to-text runs **on-device** (free), but robust natural-language
understanding uses an LLM (Claude Haiku) server-side, which costs real money
per request. Premium gates that cost. A request is tiny (~300–500 tokens
round trip ≈ well under a cent), so even heavy users cost pennies/month —
but ungated it's an abuse vector, so the Edge Function verifies
`is_premium` and rate-limits per user (e.g. 60 req/hour).

### Pipeline

```
mic (push-to-talk)
  → on-device STT (expo-speech-recognition / platform SpeechRecognizer)
  → transcript text only → Supabase Edge Function "mili-parse"
      - verifies JWT + is_premium (service role reads profiles)
      - calls Claude Haiku with a constrained tool schema
      - returns a typed intent JSON
  → app shows a confirmation card (parsed name/date/icon, editable)
  → auto-confirms after ~2s or on tap → normal addItem()/addTask() path
```

Privacy: **audio never leaves the device** — only the transcript string is
sent, and it's not stored server-side. Say this in the UI.

### v1 intents (deliberately small)

| Utterance shape | Intent |
|---|---|
| "add eggs with 6 days of expiry" / "…expiring next Friday" | `add_expiry_item {name, expiry_date}` |
| "I changed the bedsheets today, remind me every 14 days" | `add_last_time_task {name, repeat_days}` |
| "I just cleaned the AC filter" (existing task) | `mark_done {task}` |
| "what's expiring this week?" | `query_expiring {window}` → spoken/short list reply |

Anything else → "Sorry, I can add items, log tasks, or tell you what's
expiring." Relative dates resolve on the **device** (user's timezone) — the
LLM returns `{days: 6}` or `{weekday: 'friday'}`, never a computed ISO date,
to avoid the UTC-shift bug class we already fixed once in `dateMath.ts`.

The parsed name reuses `suggestIcon()` so "eggs" gets 🥚 exactly like typed
entry — one code path after the confirmation card.

### Fallback when parsing is weak

If Haiku's confidence is low or fields are missing, the confirmation card
opens the normal Add sheet pre-filled with whatever parsed (name at
minimum). Voice never dead-ends; worst case it saved you typing the name.

### Build phases

1. **v1**: mic button on Home, add-item + add-task intents, confirmation
   card, Edge Function with premium gate + rate limit.
2. **v2**: mark-done + query intents, spoken responses (expo-speech TTS),
   Hindi/Hinglish transcription (ML Kit supports hi-IN — important for the
   home market).
3. **v3 (research)**: wake word ("Hey Mili") via an on-device keyword
   spotter; only if v1 usage justifies it.

### Open questions

1. Model/vendor lock: Edge Function should read the model id from an env
   var so Haiku can be swapped without an app release.
2. Does a shared-household member's voice-add attribute to them as
   `created_by`? (Yes — same path as manual add.)

---

## Monetization summary after both features

| | Free | Premium |
|---|---|---|
| Personal items | on-device only | + encrypted cloud backup & multi-device sync |
| Shared household | ✅ up to **3 members** | up to 10 members |
| Mili voice agent | — | ✅ |
| OCR date scan | ✅ | ✅ |

Order of implementation: **households first** (it's the growth loop — every
invite is an install), Mili second (it's the upgrade driver once people are
in).
