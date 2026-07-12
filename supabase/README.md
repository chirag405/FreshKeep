# FreshKeep Supabase setup

This app uses Supabase for Premium cloud sync and sign-in (phone OTP + Google),
plus a Supabase Edge Function that receives LemonSqueezy billing webhooks. The
code is complete, but a few things can only be done from your own Supabase /
LemonSqueezy accounts — an AI agent can't create accounts or configure
third-party SMS/OAuth/payment providers on your behalf. Do these once:

## 1. Create a project

Create a project at supabase.com (any region). Copy the **Project URL** and
**anon public key** from Project Settings → API.

## 2. Configure the app to use it

Copy `.env.example` to `.env.local` in the project root and fill in the two
values from step 1 (the LemonSqueezy variables are filled in during the
billing setup further down):

```
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

## 4. Enable phone (OTP) sign-in

Authentication → Providers → Phone → enable it, and connect an SMS provider
(Twilio, MessageBird, or Vonage — Supabase needs your credentials for one of
these; the free tier of any of them is enough for testing). Without this
step, `sendPhoneOtp` in the app will fail with a clear Supabase error rather
than silently doing nothing.

## 5. Enable Google sign-in

Authentication → Providers → Google → enable it, and add an OAuth Client ID
and secret from the Google Cloud Console. Under Authentication → URL
Configuration, add this app's redirect URI (Expo's `makeRedirectUri()` — for
a dev client / standalone build with `scheme: "freshkeep"` in `app.json`,
that's `freshkeep://`; for Expo Go during development it's the
`exp://<host>` URL Expo prints when you start the dev server — add both).

## 6. Set up LemonSqueezy billing

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

Once all of the above is done, sign-in, sync, and billing all work exactly
as the app code expects — nothing else needs to change.
