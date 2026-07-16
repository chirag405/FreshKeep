import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { colors } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { buildCheckoutUrl, isLemonSqueezyConfigured, type BillingPlan } from '@/lib/lemonsqueezy';

const BENEFITS = [
  'Sync across iPhone, iPad & web',
  'Automatic encrypted cloud backup',
  'Restore instantly on a new phone',
  'Unlimited items & custom icons',
];

export default function Premium() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPremium = useAuthStore((s) => s.isPremium);
  const user = useAuthStore((s) => s.user);
  const refreshPremiumStatus = useAuthStore((s) => s.refreshPremiumStatus);
  const subscribeToPremiumChanges = useAuthStore((s) => s.subscribeToPremiumChanges);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('yearly');
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPremiumChanges();
    return unsubscribe;
  }, [subscribeToPremiumChanges]);

  const onUpgrade = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    const redirectUrl = AuthSession.makeRedirectUri({ path: 'premium' });
    const checkoutUrl = buildCheckoutUrl(selectedPlan, user.id, user.email ?? null, redirectUrl);
    if (!checkoutUrl) {
      Alert.alert(
        'Billing not configured yet',
        "LemonSqueezy store/variant IDs aren't set — see supabase/README.md. For now, cloud sync can be enabled for testing directly in the Supabase dashboard.",
      );
      return;
    }
    setCheckingOut(true);
    try {
      // openAuthSessionAsync (not openBrowserAsync) so the browser
      // auto-dismisses when LemonSqueezy redirects back to redirectUrl after
      // a successful purchase, instead of stranding the user on
      // LemonSqueezy's page with no way back into the app.
      await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUrl);
      // The webhook updates profiles server-side; the realtime subscription
      // above will pick it up automatically, but refresh once too in case it
      // landed just before the subscription connected.
      await refreshPremiumStatus();
    } catch (error) {
      console.error('[premium] checkout failed', error);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <Text style={[styles.close, { marginTop: insets.top + 16 }]} onPress={() => router.back()}>✕</Text>
      <View style={styles.heroWrap}>
        <View style={styles.iconWrap}><Text style={{ fontSize: 36 }}>☁️</Text></View>
        <Text style={styles.eyebrow}>FRESHKEEP PREMIUM</Text>
        <Text style={styles.title}>Your dates, on every{'\n'}device you own</Text>
      </View>
      <View style={{ gap: 14, marginTop: 26 }}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <View style={styles.checkWrap}><Text style={{ color: '#2FBB84' }}>✓</Text></View>
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 40 }} />
      {isPremium ? (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>You&apos;re already on Premium ✓</Text>
        </View>
      ) : (
        <>
          <View style={styles.plansRow}>
            <Pressable
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardHighlight]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={styles.planLabel}>Monthly</Text>
              <Text style={styles.planPrice}>$1.99</Text>
              <Text style={styles.planSub}>per month</Text>
            </Pressable>
            <Pressable
              style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardHighlight]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <Text style={styles.saveBadge}>SAVE 37%</Text>
              <Text style={styles.planLabel}>Yearly</Text>
              <Text style={styles.planPrice}>$14.99</Text>
              <Text style={styles.planSub}>$1.25 / month</Text>
            </Pressable>
          </View>
          <Pressable style={styles.cta} onPress={onUpgrade} disabled={checkingOut}>
            <Text style={styles.ctaText}>{checkingOut ? 'Opening checkout…' : 'Continue to checkout'}</Text>
          </Pressable>
          {!isLemonSqueezyConfigured && (
            <Text style={styles.configNote}>Billing isn&apos;t configured yet — see supabase/README.md.</Text>
          )}
        </>
      )}
      <Text style={styles.footnote}>Cancel anytime.{'\n'}The free plan keeps everything on-device forever.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06110D', paddingHorizontal: 24 },
  close: { color: 'rgba(255,255,255,0.5)', fontSize: 22, textAlign: 'right' },
  heroWrap: { alignItems: 'center', paddingTop: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#E8C15A', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 8, textAlign: 'center', lineHeight: 30 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  checkWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(47,187,132,0.18)', alignItems: 'center', justifyContent: 'center' },
  benefitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  plansRow: { flexDirection: 'row', gap: 10 },
  planCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 15, padding: 14 },
  planCardHighlight: { backgroundColor: 'rgba(47,187,132,0.14)', borderColor: '#2FBB84', borderWidth: 1.5 },
  saveBadge: { position: 'absolute', top: -9, right: 12, fontSize: 10, fontWeight: '800', backgroundColor: colors.gold, color: colors.goldText, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, overflow: 'hidden' },
  planLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  planPrice: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  planSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  cta: { backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  configNote: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 10 },
  footnote: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
