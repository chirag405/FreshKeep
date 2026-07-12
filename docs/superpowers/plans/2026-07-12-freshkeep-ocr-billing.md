# FreshKeep — OCR + LemonSqueezy Billing Plan

Status: Draft — implementing now; flagging risks below before they bite.
Date: 2026-07-12

## Scope

Two remaining pieces of work while Supabase project credentials are pending:

1. **On-device OCR** for the "Scan" button in the Add sheet (currently disabled).
2. **Real Premium billing via LemonSqueezy**, replacing native App Store/Play IAP
   (which needs store developer accounts this project doesn't have).

Both follow the same pattern already used for Supabase: write all the code now
against environment variables / IDs, document the external account setup the
user has to do themselves, and leave it wired up so it works the moment those
values are filled in.

## ⚠️ Read this before building on top of the billing piece

**Apple's App Store Review Guideline 3.1.1** requires apps to use native
In-App Purchase to unlock features/content *within* the app, with narrow
exceptions (reader apps, physical goods, B2B tools, person-to-person
services). "Pay to sync your data to the cloud" does not clearly qualify for
an exception — Apple has rejected/pulled comparable consumer apps for
selling this kind of upgrade through an external checkout instead of IAP.
Google Play is more permissive (and getting more so under regional
User Choice Billing / DMA rules), but is not blanket-safe either.

This plan builds the LemonSqueezy checkout anyway, because that's what was
asked for and it's genuinely the fastest path to *a working payment system*
today. But before this ships to the iOS App Store, you (not me) need to
decide one of:
- Launch Android + web first, add native IAP for iOS later, or
- Accept the rejection risk and see what Apple says, or
- Treat the LemonSqueezy flow as a "manage my subscription on the web"
  path only reachable from a browser/marketing site, never linked from
  inside the iOS binary.

Nothing below is blocked on that decision — it's a business/legal call, not
a technical one — but don't submit to the App Store without making it.

## Part A — On-device OCR

### Why this needs more than app code

ML Kit text recognition is a native module. It does **not** run in Expo Go —
Expo Go only bundles Expo's own SDK modules, not arbitrary third-party native
code. Testing this feature for real requires:

1. `expo-dev-client` (installed below) and a **custom development build**,
   via `eas build --profile development --platform ios` (and/or `android`).
   That needs an Expo account and an EAS project — free tier is fine, but
   it's an account you'll need to create/link (`eas login`, `eas init`).
2. A physical device or a simulator/emulator with camera support to actually
   point at a package and test recognition (the iOS Simulator has no real
   camera; Android emulators can fake one from a webcam, imperfectly).

The plan below writes all the code so it's ready the moment you have a dev
client build to run it on.

### Architecture

- `src/lib/ocr/dateParser.ts` — **pure, no native dependency, fully unit
  testable today.** Takes raw recognized text (a string with newlines) and
  returns candidate dates ranked by confidence, handling the messy formats
  the product spec calls out: `EXP 09/26`, `12 JUL 2026`, `2026-07-14`,
  `BEST BEFORE 14/07/26`, etc.
- `src/lib/ocr/textRecognition.ts` — the *only* file that imports the native
  ML Kit module. Thin wrapper: `recognizeText(photoUri: string): Promise<string>`.
  Isolating the native call here means `dateParser.ts` stays testable without
  mocking a native module.
- `src/app/scan.tsx` — new modal route: camera view (`expo-camera`) → capture
  → `recognizeText` → `extractDateCandidates` → confirmation UI ("We found
  **14 July 2026** — Use it? / Retake / Enter manually"). Reuses the same
  pub/sub pattern as `iconSelectionChannel.ts` (a `scanResultChannel.ts`) to
  hand the chosen date back to `add.tsx` without prop-drilling through the
  router.
- `src/app/add.tsx` — enable the "Scan" button, navigate to `/scan`.

### New dependencies

- `expo-camera` — capture the photo.
- `expo-dev-client` — required so the app can run custom native code at all
  outside of a full standalone build.
- `@react-native-ml-kit/text-recognition` — on-device OCR (Android + iOS,
  offline, free). If this package turns out to be unmaintained at
  implementation time, `react-native-mlkit-ocr` is the fallback with the
  same shape.

### Tasks

1. Install deps, add `expo-dev-client` + camera permission strings to
   `app.json` (`NSCameraUsageDescription` / Android `CAMERA` permission).
2. Write `dateParser.ts` + full unit test suite (TDD) — this is the part
   that's valuable and testable *right now*, independent of everything else.
3. Write `textRecognition.ts` wrapper (untestable under Jest — native
   module — verified only by manual on-device run per the constraint above).
4. Write `scan.tsx` + `scanResultChannel.ts`.
5. Wire into `add.tsx`.
6. Manual verification note in the final report: this feature cannot be
   confirmed working without a dev-client build on a real device/emulator —
   say so plainly rather than claiming it works.

## Part B — LemonSqueezy billing

### What LemonSqueezy actually does here

LemonSqueezy is a merchant-of-record with a **hosted checkout page** — the
app never touches card details. Flow: app opens a checkout URL in a browser
→ user pays → LemonSqueezy sends a **webhook** to a server you control →
that server marks the user Premium. This means billing state changes
server-side, not via anything the app can directly verify — the app just
opens a URL and later re-checks status.

### Account setup (external, only you can do this — documented in
`supabase/README.md`, extended)

1. Create a LemonSqueezy account + Store.
2. Create a Product "FreshKeep Premium" with two Variants: Monthly ($1.99),
   Yearly ($14.99) — matching the design's pricing exactly.
3. Settings → Webhooks → add an endpoint pointing at the Supabase Edge
   Function URL from Task 3 below, subscribed to `subscription_created`,
   `subscription_updated`, `subscription_cancelled`, `subscription_expired`.
   Copy the **signing secret**.
4. Settings → API → create an API key (only needed if we later add
   server-initiated actions like cancellation; not required for the
   webhook-only flow below).
5. Give me: Store ID, Monthly Variant ID, Yearly Variant ID (safe to put in
   `.env.local` as `EXPO_PUBLIC_*` — they're not secrets), and set the
   webhook signing secret as a Supabase Edge Function secret (`supabase
   secrets set LEMONSQUEEZY_WEBHOOK_SECRET=...`) — never in the app bundle.

### Architecture

- **Schema** (`supabase/migrations/0002_billing.sql`): extend `profiles`
  with `lemonsqueezy_customer_id text`, `subscription_id text`,
  `subscription_status text`, `plan text`, `renews_at timestamptz`.
  `is_premium` stays the single source of truth the app reads; it's derived
  from `subscription_status` (`active`/`on_trial` → true, everything else →
  false) by the webhook handler, not computed client-side.
- **Supabase Edge Function** (`supabase/functions/lemonsqueezy-webhook/index.ts`,
  Deno): verifies `X-Signature` (HMAC-SHA256 over the raw body using the
  webhook secret — timing-safe compare), reads
  `meta.custom_data.user_id` (passed through from the checkout URL) and
  `meta.event_name`, upserts the `profiles` row accordingly. Rejects
  unverified requests with 401 before touching the database.
- **App-side checkout** (`src/lib/lemonsqueezy.ts`): builds the hosted
  checkout URL —
  `https://{store}.lemonsqueezy.com/buy/{variantId}?checkout[custom][user_id]={userId}&checkout[email]={email}` —
  and opens it with `expo-web-browser`'s `openBrowserAsync` (simple
  external browser; no token needs to come back to the app, unlike the
  Google OAuth flow, because the webhook updates state server-side).
- **Status refresh**: `premium.tsx` calls `refreshPremiumStatus()` when the
  browser closes, and additionally subscribes to Supabase Realtime on the
  user's own `profiles` row (`supabase.channel(...).on('postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'profiles', filter:
  \`user_id=eq.${userId}\` }, ...)`) so the UI flips to Premium automatically
  within seconds of the webhook landing, without the user needing to
  background/foreground the app.

### Tasks

1. `supabase/migrations/0002_billing.sql` — schema extension.
2. `supabase/functions/lemonsqueezy-webhook/index.ts` — webhook handler
   with signature verification.
3. `src/lib/lemonsqueezy.ts` — checkout URL builder.
4. Update `src/app/premium.tsx` — real Monthly/Yearly buttons open checkout;
   realtime subscription flips the screen to "You're already on Premium"
   the moment the webhook confirms.
5. Update `src/store/authStore.ts` if needed to expose the realtime
   subscription helper cleanly.
6. Extend `supabase/README.md` with the LemonSqueezy setup steps above.

## What ships today vs. what's blocked on you

**Ships now (this session, no external input needed):** the entire OCR date
parser + its tests, the OCR native-wrapper and scan screen (code-complete,
manual-test-pending), the full LemonSqueezy webhook function, the schema
migration, and the app-side checkout + realtime wiring — all against env
vars / IDs you fill in later, same pattern as Supabase.

**Blocked on you:** actually configuring Supabase (6 steps, already
documented), creating the LemonSqueezy store/products/webhook (5 steps
above), and creating an Expo/EAS account for the dev-client build needed to
test OCR on a real device. None of this blocks writing the code; all of it
blocks *running* the finished features for real.
