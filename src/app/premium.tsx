import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';

const BENEFITS = [
  'Sync across iPhone, iPad & web',
  'Automatic encrypted cloud backup',
  'Restore instantly on a new phone',
  'Unlimited items & custom icons',
];

export default function Premium() {
  const router = useRouter();
  const isPremium = useAuthStore((s) => s.isPremium);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.close} onPress={() => router.back()}>✕</Text>
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
          <Text style={styles.ctaText}>You're already on Premium ✓</Text>
        </View>
      ) : (
        <>
          <View style={styles.plansRow}>
            <View style={styles.planCard}>
              <Text style={styles.planLabel}>Monthly</Text>
              <Text style={styles.planPrice}>$1.99</Text>
              <Text style={styles.planSub}>per month</Text>
            </View>
            <View style={[styles.planCard, styles.planCardHighlight]}>
              <Text style={styles.planLabel}>Yearly</Text>
              <Text style={styles.planPrice}>$14.99</Text>
              <Text style={styles.planSub}>$1.25 / month</Text>
            </View>
          </View>
          <Pressable
            style={styles.cta}
            onPress={() =>
              Alert.alert(
                'Billing coming soon',
                'In-app purchases need App Store/Play Console accounts that aren’t set up yet. For now, cloud sync can be enabled for testing directly in the Supabase dashboard — see supabase/README.md.',
              )
            }
          >
            <Text style={styles.ctaText}>Start 7-day free trial</Text>
          </Pressable>
        </>
      )}
      <Text style={styles.footnote}>The free plan keeps everything on-device forever.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06110D', paddingHorizontal: 24 },
  close: { color: 'rgba(255,255,255,0.5)', fontSize: 22, textAlign: 'right', marginTop: 58 },
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
  planLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  planPrice: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  planSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  cta: { backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  footnote: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
