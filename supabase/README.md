# FreshKeep Supabase setup

This app uses Supabase for Premium cloud sync and sign-in (phone OTP + Google).
The code is complete, but a few things can only be done from your own Supabase
account — an AI agent can't create accounts or configure third-party SMS/OAuth
providers on your behalf. Do these once:

## 1. Create a project

Create a project at supabase.com (any region). Copy the **Project URL** and
**anon public key** from Project Settings → API.

## 2. Configure the app to use it

Copy `.env.example` to `.env.local` in the project root and fill in the two
values from step 1:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env.local` is gitignored — never commit real keys.

## 3. Run the schema migration

Open the SQL Editor in your Supabase project dashboard and run the contents
of `supabase/migrations/0001_init.sql`. This creates `expiry_items`,
`last_time_tasks`, and `profiles` tables with row-level security so each
signed-in user can only see their own rows.

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

## 6. (Optional, for testing Premium before billing exists) mark yourself premium

Real in-app billing isn't wired up yet (needs App Store/Play Console
accounts). Until then, cloud sync is gated on a `profiles.is_premium` boolean
you can flip by hand in the Supabase Table Editor after you sign in once:

```sql
update public.profiles set is_premium = true where user_id = '<your-user-id>';
```

Once these six steps are done, sign-in and sync work exactly as the app code
expects — nothing else needs to change.
