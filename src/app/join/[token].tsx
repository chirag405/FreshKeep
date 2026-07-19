import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/theme/tokens';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';

/**
 * Landing screen for `freshkeep://join/<token>` invite deep links. The token
 * is redeemed server-side (supabase/migrations/0005 → redeem_invite), which
 * enforces expiry and the member cap; this screen just drives the UX around
 * it — including the "sign in with Google first" gate.
 */
export default function JoinHousehold() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();

  const user = useAuthStore((s) => s.user);
  const redeemInvite = useHouseholdStore((s) => s.redeemInvite);
  const household = useHouseholdStore((s) => s.household);

  const [state, setState] = useState<'idle' | 'joining' | 'joined' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function join() {
      if (!user || !token || state !== 'idle') return;
      setState('joining');
      const { error } = await redeemInvite(token);
      if (cancelled) return;
      if (error) {
        setErrorMessage(error);
        setState('error');
      } else {
        setState('joined');
      }
    }
    join();
    return () => {
      cancelled = true;
    };
  }, [user, token, state, redeemInvite]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconWrap}><Text style={{ fontSize: 40 }}>🏠</Text></View>
      {!user ? (
        <>
          <Text style={styles.title}>Join a household</Text>
          <Text style={styles.subtitle}>Sign in with Google first, then open this invite link again.</Text>
          <Pressable style={styles.cta} onPress={() => router.push('/login')}>
            <Text style={styles.ctaText}>Sign in</Text>
          </Pressable>
        </>
      ) : state === 'joining' || state === 'idle' ? (
        <>
          <Text style={styles.title}>Joining…</Text>
          <ActivityIndicator color={colors.primary} style={{ marginTop: 18 }} />
        </>
      ) : state === 'joined' ? (
        <>
          <Text style={styles.title}>You&apos;re in! 🎉</Text>
          <Text style={styles.subtitle}>
            You joined {household?.name ?? 'the household'}. Everything the household tracks is now on your list too.
          </Text>
          <Pressable style={styles.cta} onPress={() => router.replace('/')}>
            <Text style={styles.ctaText}>Go to my list</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>Couldn&apos;t join</Text>
          <Text style={styles.subtitle}>{errorMessage}</Text>
          <Pressable style={styles.cta} onPress={() => router.replace('/')}>
            <Text style={styles.ctaText}>Back to FreshKeep</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', paddingHorizontal: 28 },
  iconWrap: { width: 88, height: 88, borderRadius: 26, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 21 },
  cta: { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 15, paddingHorizontal: 40, marginTop: 26 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
