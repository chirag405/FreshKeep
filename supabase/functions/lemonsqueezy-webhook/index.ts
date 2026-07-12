// Supabase Edge Function: receives LemonSqueezy subscription webhooks and
// flips the corresponding user's `profiles.is_premium` flag. Deploy with:
//   supabase functions deploy lemonsqueezy-webhook --no-verify-jwt
// (--no-verify-jwt because LemonSqueezy calls this anonymously; the HMAC
// signature check below is what actually authenticates the request.)
//
// Required secrets (supabase secrets set ...):
//   LEMONSQUEEZY_WEBHOOK_SECRET  — from LemonSqueezy dashboard → Webhooks
//   SUPABASE_URL                 — auto-provided by the Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY    — auto-provided by the Supabase runtime
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ACTIVE_STATUSES = new Set(['active', 'on_trial']);
// Every status LemonSqueezy documents for a subscription object. Used to
// fail closed: if `status` is missing or something we don't recognize, we
// reject the request instead of defaulting to "not premium" — silently
// revoking a paying customer's access on ambiguous/malformed input would be
// far worse than a rejected webhook LemonSqueezy will retry.
const KNOWN_STATUSES = new Set(['active', 'on_trial', 'past_due', 'unpaid', 'cancelled', 'expired', 'paused']);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type LemonSqueezyPayload = {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    attributes: {
      status: string;
      customer_id: number;
      renews_at: string | null;
      variant_name: string;
    };
    id: string;
  };
};

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') ?? '';
  const expectedSignature = await hmacHex(webhookSecret, rawBody);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: LemonSqueezyPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Malformed JSON body', { status: 400 });
  }

  const userId = payload?.meta?.custom_data?.user_id;
  if (!userId) {
    return new Response('Missing custom_data.user_id', { status: 400 });
  }

  const attributes = payload?.data?.attributes;
  const subscriptionId = payload?.data?.id;
  if (!attributes || !subscriptionId) {
    return new Response('Missing data.id or data.attributes', { status: 400 });
  }

  const { status, customer_id, renews_at, variant_name } = attributes;
  if (!status || !KNOWN_STATUSES.has(status)) {
    console.error('Unrecognized subscription status, rejecting webhook', status);
    return new Response(`Unrecognized status: ${status}`, { status: 400 });
  }
  const isPremium = ACTIVE_STATUSES.has(status);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { error } = await supabase
    .from('profiles')
    .update({
      is_premium: isPremium,
      lemonsqueezy_customer_id: String(customer_id),
      subscription_id: subscriptionId,
      subscription_status: status,
      plan: variant_name,
      renews_at,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update profile from LemonSqueezy webhook', error);
    return new Response('Database update failed', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
