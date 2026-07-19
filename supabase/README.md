# FreshKeep Supabase setup

This app uses Supabase for Premium cloud sync and Google sign-in, plus a
Supabase Edge Function that receives LemonSqueezy billing webhooks. (Phone/SMS
OTP was deliberately left out — Supabase doesn't provide free SMS sending the
way Firebase does; it just relays through a third-party provider like Twilio
that you pay per message, plus India requires DLT registration for production
SMS. Google sign-in has no such cost.) The code is complete, but a few things
can only be done from your own Supabase / LemonSqueezy / Google accounts — an
AI agent can't create accounts or configure third-party OAuth/payment
providers on your behalf. Do these once:

## 1. Create a project

Create a project at supabase.com (any region). Copy the **Project URL** and
**anon public key** from Project Settings → API.

## 2. Configure the app to use it

Copy `.env.example` to `.env.local` in the project root and fill in the two
values from step 1 (the LemonSqueezy variables are filled in during the
billing setup further down):

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env.local` is gitignored — never commit real keys.

## 3. Run the schema migrations

Open the SQL Editor in your Supabase project dashboard and run, in order:

1. `supabase/migrations/0001_init.sql` — creates `expiry_items`,
   `last_time_tasks`, and `profiles` tables with row-level security so each
   signed-in user can only see their own rows.
2. `supabase/migrations/0002_billing.sql` — adds LemonSqueezy subscription
   columns to `profiles`.
3. `supabase/migrations/0003_last_time_task_notes.sql` — adds an optional
   `note` column to `last_time_tasks`.
4. `supabase/migrations/0004_expiry_item_notes.sql` — adds an optional
   `note` column to `expiry_items`.
5. `supabase/migrations/0005_households.sql` — shared households
   (Splitwise-style): tables, RLS, invite/redeem RPCs with server-enforced
   member caps (3 free / 10 Premium), and realtime publication for live
   multiplayer. Also adds `profiles.display_name`.
6. `supabase/migrations/0006_mili_usage.sql` — usage log the Mili voice
   agent's rate limiter counts against.

If the realtime blocks at the end of 0005 error in the SQL editor, enable
realtime for `expiry_items` and `last_time_tasks` from Database →
Replication in the dashboard instead.

## 4. Enable Google sign-in

Authentication → Providers → Google → enable it, and add an OAuth Client ID
and secret from the Google Cloud Console. Under Authentication → URL
Configuration, add this app's redirect URI (Expo's `makeRedirectUri()` — for
a dev client / standalone build with `scheme: "freshkeep"` in `app.json`,
that's `freshkeep://`; for Expo Go during development it's the
`exp://<host>` URL Expo prints when you start the dev server — add both).

## 5. Set up LemonSqueezy billing

**⚠️ Before you launch this on the iOS App Store:** Apple's guidelines
generally require native In-App Purchase for unlocking features/content
inside an app; using an external checkout like LemonSqueezy for this on iOS
carries real rejection risk. See
`docs/superpowers/plans/2026-07-12-freshkeep-ocr-billing.md` for the tradeoffs
— that's a business decision for you to make, not something to skip past.
The integration below works regardless of which storefront you ultimately
ship it through.

1. Create a LemonSqueezy account + Store.
2. Create a Product "FreshKeep Premium" with two Variants: **Monthly ($1.99)**
   and **Yearly ($14.99)** — matching the app's paywall screen exactly. Note
   each Variant's ID (visible in its URL/settings) and your Store's slug
   (from its public URL, `https://{slug}.lemonsqueezy.com`).
3. Deploy the webhook handler:
   ```bash
   supabase functions deploy lemonsqueezy-webhook --no-verify-jwt
   ```
   (`--no-verify-jwt` because LemonSqueezy calls this anonymously — the HMAC
   signature check inside the function is what actually authenticates the
   request.) Note the function's URL from the deploy output.
4. In LemonSqueezy: Settings → Webhooks → add an endpoint pointing at that
   URL, subscribed to `subscription_created`, `subscription_updated`,
   `subscription_cancelled`, and `subscription_expired`. Copy the **signing
   secret** it gives you.
5. Set the webhook secret (never put this in `.env.local` — it's server-only):
   ```bash
   supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=whsec_...
   ```
6. Add the (non-secret) IDs from step 2 to `.env.local`:
   ```
   EXPO_PUBLIC_LEMONSQUEEZY_STORE_SLUG=your-store-slug
   EXPO_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID=your-monthly-variant-id
   EXPO_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID=your-yearly-variant-id
   ```

Once deployed and configured, the in-app paywall (`/premium`) opens a real
LemonSqueezy checkout, and `is_premium` flips automatically (via Supabase
Realtime, near-instantly) the moment a subscription webhook lands — no app
code changes needed.

### Testing without waiting on a real card

Flip yourself to Premium by hand in the Supabase Table Editor any time (this
bypasses LemonSqueezy entirely, useful before the webhook is deployed or for
quick UI testing):

```sql
update public.profiles set is_premium = true where user_id = '<your-user-id>';
```

## 6. Set up the Mili voice agent (Premium feature)

Mili turns "add eggs with 6 days of expiry" into a saved item. Speech-to-text
runs on the phone; only the transcript reaches the `mili-parse` Edge Function,
which uses LangChain/LangGraph with Claude to produce a typed intent.

1. Deploy the function (JWT verification stays ON — only signed-in users may
   call it, and the function additionally checks `is_premium` + rate limits):

   ```bash
   supabase functions deploy mili-parse
   ```

2. Set the Anthropic API key (server-only — never in `.env.local`):

   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   # optional — defaults to claude-haiku-4-5:
   supabase secrets set MILI_MODEL=claude-haiku-4-5
   ```

Households need no extra setup beyond migration 0005 — invites are
`freshkeep://join/<token>` deep links shared through the OS share sheet, so
there's nothing to configure and no SMS cost.

Once all of the above is done, sign-in, sync, billing, households, and Mili
all work exactly as the app code expects — nothing else needs to change.
