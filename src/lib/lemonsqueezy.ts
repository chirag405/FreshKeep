const storeSlug = process.env.EXPO_PUBLIC_LEMONSQUEEZY_STORE_SLUG;
const monthlyVariantId = process.env.EXPO_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID;
const yearlyVariantId = process.env.EXPO_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID;

export const isLemonSqueezyConfigured = Boolean(storeSlug && monthlyVariantId && yearlyVariantId);

export type BillingPlan = 'monthly' | 'yearly';

/**
 * Builds a LemonSqueezy hosted-checkout URL. The app never touches card
 * details — LemonSqueezy's webhook (see supabase/functions/lemonsqueezy-webhook)
 * is what actually confirms payment and flips `profiles.is_premium` server-side.
 * `checkout[custom][user_id]` round-trips through the webhook payload as
 * `meta.custom_data.user_id` so the handler knows which profile to update.
 */
export function buildCheckoutUrl(plan: BillingPlan, userId: string, email?: string | null): string | null {
  if (!isLemonSqueezyConfigured) return null;
  const variantId = plan === 'monthly' ? monthlyVariantId : yearlyVariantId;
  const params = new URLSearchParams({ 'checkout[custom][user_id]': userId });
  if (email) params.set('checkout[email]', email);
  return `https://${storeSlug}.lemonsqueezy.com/buy/${variantId}?${params.toString()}`;
}
