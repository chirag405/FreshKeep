# FreshKeep — End-to-End Setup

This is the single place to go from a clean clone to a fully working app —
local dev, cloud sync, Google sign-in, billing, shared households, and the
Mili voice agent. Steps that touch your own Supabase / Google / LemonSqueezy
/ Anthropic accounts can't be automated — do those once, by hand, as
described below.

## 1. Prerequisites

- **Node.js 20+** (developed against Node 22).
- **npm** (the repo is npm-based — `package-lock.json` is committed).
- **Git**.
- **Android Studio** (for an Android emulator + SDK) and/or **Xcode on
  macOS** (for iOS Simulator). A physical device works too, over USB or the
  same Wi-Fi network.
- A **Supabase** account (free tier is enough) — [supabase.com](https://supabase.com).
- A **Google Cloud** account, for the Google sign-in OAuth client.
- Optional, only if you want billing/voice working locally:
  - A **LemonSqueezy** account (billing).
  - An **Anthropic** API key (Mili voice agent).

This app uses several native modules (camera, on-device ML text recognition,
speech recognition, SQLite, local authentication) that don't run inside Expo
Go. You'll build a **custom dev client** instead (steps below) — this is a
one-time build per platform, after which `expo start` reloads instantly like
normal.

## 2. Clone and install

```bash
git clone <this-repo-url>
cd freshkeep
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local`. You'll fill in the Supabase values in step 4 and the
LemonSqueezy values in step 6 (billing). Leaving billing values as
placeholders is fine — everything else works without them.

`.env.local` is gitignored — never commit real keys.

## 4. Set up Supabase (cloud sync + auth)

1. Create a project at [supabase.com](https://supabase.com) (any region).
   Copy the **Project URL** and **anon public key** from
   Project Settings → API into `.env.local`:

   ```text
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log
   in:

   ```bash
   npx supabase login
   npx supabase link --project-ref your-project-ref
   ```

3. Run the schema migrations, in order, either via `supabase db push` or by
   pasting each file into the SQL Editor in the Supabase dashboard:

   | Migration | What it does |
   |---|---|
   | `0001_init.sql` | Core `expiry_items`, `last_time_tasks`, `profiles` tables + RLS |
   | `0002_billing.sql` | LemonSqueezy subscription columns on `profiles` |
   | `0003_last_time_task_notes.sql` | Optional `note` column on `last_time_tasks` |
   | `0004_expiry_item_notes.sql` | Optional `note` column on `expiry_items` |
   | `0005_households.sql` | Shared households (Splitwise-style): tables, RLS, invite/redeem RPCs with server-enforced member caps (3 free / 10 Premium), realtime publication, `profiles.display_name` |
   | `0006_mili_usage.sql` | Usage log the Mili voice agent's rate limiter counts against |

   ```bash
   npx supabase db push
   ```

   If the realtime publication statements at the end of `0005` error out in
   the SQL editor, enable realtime for `expiry_items` and `last_time_tasks`
   from Database → Replication in the dashboard instead.

4. **Enable Google sign-in**: Authentication → Providers → Google → enable
   it, and add an OAuth Client ID + secret (create one in
   [Google Cloud Console](https://console.cloud.google.com/) under APIs &
   Services → Credentials → OAuth client ID → Web application). Under
   Authentication → URL Configuration, add this app's redirect URIs:
   - `freshkeep://` (dev client / standalone builds, from `scheme` in
     `app.json`)
   - the `exp://<host>` URL Expo prints when you run `expo start` (Expo Go /
     Metro dev sessions)

## 5. Build the dev client and run the app

```bash
npx expo prebuild        # generates the native android/ (and ios/) projects
npx expo run:android     # or: npx expo run:ios (macOS only)
```

This builds and installs a custom dev client on an emulator/device — it
takes a few minutes the first time. After that, for day-to-day development:

```bash
npx expo start
```

and open the app from the dev client already installed on your
emulator/device (scan the QR code or press `a`/`i` in the terminal).

> `android/` and `ios/` are gitignored generated output — re-run
> `expo prebuild` any time you change native config in `app.json` (icons,
> permissions, plugins) or after pulling changes that touch it.

## 6. Set up LemonSqueezy billing (optional, for Premium checkout)

**⚠️ Before shipping to the iOS App Store:** Apple generally requires native
In-App Purchase for unlocking in-app features; an external checkout like
LemonSqueezy carries real rejection risk on iOS. See
`docs/superpowers/plans/2026-07-12-freshkeep-ocr-billing.md` for the
tradeoffs — that's a business decision to make deliberately, not skip past.
The integration works the same regardless of which storefront you ship
through.

1. Create a LemonSqueezy account + Store.
2. Create a product "FreshKeep Premium" with two variants — **Monthly
   ($1.99)** and **Yearly ($14.99)** — matching the app's paywall exactly.
   Note each variant's ID and your store's slug.
3. Deploy the webhook handler (anonymous invocation — the function verifies
   the LemonSqueezy HMAC signature itself):

   ```bash
   npx supabase functions deploy lemonsqueezy-webhook --no-verify-jwt
   ```

4. In LemonSqueezy: Settings → Webhooks → add an endpoint pointing at the
   deployed function's URL, subscribed to `subscription_created`,
   `subscription_updated`, `subscription_cancelled`, and
   `subscription_expired`. Copy the signing secret.
5. Set the webhook secret (server-only, never in `.env.local`):

   ```bash
   npx supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=whsec_...
   ```

6. Add the (non-secret) IDs to `.env.local`:

   ```text
   EXPO_PUBLIC_LEMONSQUEEZY_STORE_SLUG=your-store-slug
   EXPO_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID=your-monthly-variant-id
   EXPO_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID=your-yearly-variant-id
   ```

To test Premium without a real card, flip it by hand in the Supabase Table
Editor:

```sql
update public.profiles set is_premium = true where user_id = '<your-user-id>';
```

## 7. Set up the Mili voice agent (optional, Premium feature)

Mili turns "add eggs with 6 days of expiry" into a saved item. Speech-to-text
runs on-device; only the transcript reaches the `mili-parse` Supabase Edge
Function, which uses LangChain/LangGraph with Claude to produce a typed
intent.

```bash
npx supabase functions deploy mili-parse
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional — defaults to claude-haiku-4-5:
npx supabase secrets set MILI_MODEL=claude-haiku-4-5
```

Shared households need no extra setup beyond migration `0005` — invites are
`freshkeep://join/<token>` deep links shared through the OS share sheet, so
there's nothing else to configure and no SMS cost.

## 8. Verify everything

```bash
npx tsc --noEmit   # type-check
npx jest           # unit tests
npx expo lint      # lint
```

## 9. What you get once all of the above is done

- Sign-in (Google), offline-first local storage, and cloud sync for Premium
  users.
- Shared households: up to 3 people free / 10 on Premium sharing one list,
  invited via deep link.
- Mili: push-to-talk voice input for Premium users.
- Real billing via LemonSqueezy, with `is_premium` flipping automatically
  (via Supabase Realtime) the moment a subscription webhook lands.

Nothing else needs to change in the app code — it already expects all of the
above to exist.

## Troubleshooting

- **A new route (e.g. under `src/app/`) shows a TypeScript error like
  `Argument of type '"/my-route"' is not assignable...`** — expo-router's
  typed routes (`.expo/types/router.d.ts`) regenerate when its file watcher
  sees a change to a file under `src/app/`, which only happens while
  `npx expo start` is running. Start the dev server, save any file under
  `src/app/` (or touch it), and re-run `npx tsc --noEmit`.
- **Native module errors in Expo Go** — this app requires a custom dev
  client (step 5); Expo Go doesn't include the native modules this project
  uses (camera OCR, on-device speech recognition, etc.).
