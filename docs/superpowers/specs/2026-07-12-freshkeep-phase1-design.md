# FreshKeep — Phase 1 Design: Core Offline App

Status: Approved
Date: 2026-07-12

## Scope

FreshKeep is being built in phases. This spec covers **Phase 1 only**: a fully
working, offline, single-device Expo app matching the visual design in
`FreshKeep product specification-handoff/freshkeep-product-specification/project/FreshKeep.dc.html`
(screens S3–S8). Later phases (not designed yet) will add:

- Phase 2: Supabase auth (phone OTP + Google) — screens S1/S2
- Phase 3: on-device OCR expiry-date scanning
- Phase 4: Supabase cloud sync for Premium tier + real billing — screen S9

## Project setup

- Expo (TypeScript) project scaffolded directly in this folder (`freshkeep/`),
  alongside the existing product-spec and design-handoff docs.
- Git repo initialized at the folder root.
- Targets both iOS and Android from the start. The design is iOS-styled; keep
  it as the single visual source of truth and only adapt what the OS forces
  (biometric naming, back gesture vs. hardware back, safe-area handling).

## Architecture

- **Navigation:** Expo Router (file-based).
  - `app/(tabs)/expiring.tsx`, `app/(tabs)/last-time.tsx` — S3/S4
  - `app/item/[id].tsx` — S7 (detail/edit)
  - `app/settings.tsx` — S8
  - `app/add.tsx` (modal) — S5
  - `app/choose-icon.tsx` (modal) — S6
  - `app/login.tsx`, `app/verify.tsx`, `app/premium.tsx` — route stubs only
    (S1/S2/S9). No auth/billing logic in this phase; they exist so navigation
    paths and Settings entry points are wired for Phase 2/4 to fill in.
- **Styling:** plain React Native `StyleSheet` + a shared `src/theme/tokens.ts`
  with colors/spacing/radii lifted directly from the mockup (`#157A5B` green,
  `#F4F2EC` background, `#12211B` text, card shadows, pill radii, etc.). No
  Tailwind/NativeWind dependency.
- **State:** Zustand stores (`useExpiryStore`, `useLastTimeStore`) hydrate from
  SQLite on launch and expose derived, sorted/bucketed lists via selectors.
  Mutations call the repository layer, then refresh store state. This is more
  setup than "refetch from SQLite after every mutation," but it gives Phase 2
  a single place to reconcile local vs. Supabase data later instead of a
  rewrite.
- **Local persistence:** `expo-sqlite`, with a schema that mirrors the shape
  the future Supabase Postgres tables will have, so Phase 2 sync is closer to
  a 1:1 mapping.

```
expiry_items(
  id, name, icon, expiry_date, added_date, opened_date,
  location, reminder_enabled, reminder_days_before
)
last_time_tasks(
  id, name, icon, last_done_date, repeat_interval_days, reminder_enabled
)
```

(`location`, `added_date`, `opened_date` go beyond the product spec's minimal
data model because the mockup's card subtitles need them, e.g. "Fridge ·
added 6 days ago".)

- **Folder layout:**
  - `src/db/` — SQLite schema + repository functions (CRUD)
  - `src/store/` — Zustand stores
  - `src/theme/` — design tokens
  - `src/components/` — shared UI (item card, task card, icon grid, etc.)
  - `src/lib/` — urgency bucketing, "days ago"/"days left" formatting,
    name→icon suggestion dictionary
  - `src/notifications/` — expo-notifications wrapper

## Screens in scope

1. **Home – Expiring (S3):** list bucketed into *Needs attention* (expired or
   due today/tomorrow) / *This week* / *Fine for now*, computed from
   `expiry_date` vs. today. Card shows icon, name, subtitle, days-left/urgency
   color.
2. **Home – Last time (S4):** list bucketed into *Overdue* / *Due soon* /
   *On track*, computed from `last_done_date` + `repeat_interval_days`.
   Progress bar toward the repeat interval; tasks with no interval show a
   plain "done" state instead of a bar.
3. **Add sheet (S5):** segmented Expires/Last-time control, name field with
   recent-chip suggestions (Milk, Bread, Eggs, Paracetamol / templates for
   Last-time), auto-icon suggestion from name via keyword dictionary
   (editable by tapping through to Choose Icon), quick-date buttons (+1 week
   / +1 month / Pick a date), reminder toggle with lead-time. The **Scan**
   button is present but disabled with a "Coming soon" affordance — real OCR
   arrives in Phase 3.
4. **Choose icon (S6):** grouped emoji grid (Food & Drink / Health / Home &
   Chores) with a text search/filter box. The **Photo** custom-icon tile is
   shown but disabled in this phase.
5. **Item/Task detail (S7):** view + edit date/location/reminder; action
   buttons (Used it / Threw away for items, Did it just now for tasks);
   delete.
6. **Settings (S8):** default reminder lead time, notification-sound toggle,
   and Face-ID/biometric app-lock via `expo-local-authentication` — all real
   and fully local (no backend dependency). The account row and Premium
   banner render as static, visually-complete but inert placeholders (no tap
   action) — Phase 2/4 wire them up.

## Reminders

`expo-notifications`, local-only. Scheduled on save when `reminder_enabled` is
true, rescheduled on edit, cancelled on delete/complete. Copy matches the spec
verbatim ("🥛 Milk expires tomorrow", "🛏️ 14 days since you changed the
bedsheets"). If notification permission is denied, the reminder toggle simply
has no effect — no crash, small inline note explaining why.

## Error handling

- SQLite calls wrapped in try/catch; failures surface as small inline UI
  feedback (not crashes).
- Defensive date parsing/formatting (guard against malformed stored dates).
- No network calls exist in this phase, so no network error handling is
  needed yet.

## Testing

Jest + React Native Testing Library covering the pure logic:
- urgency bucketing (expiry and last-time)
- "days ago" / "days left" formatting
- name→icon suggestion dictionary
- repository functions against a test/in-memory SQLite db

No E2E in this phase.

## Explicitly deferred

Real auth (S1/S2), on-device OCR scan, Supabase cloud sync, Premium
billing/paywall functionality, photo-based custom icons.
