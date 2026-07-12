import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

import { colors, radii } from '@/theme/tokens';
import { Toggle } from '@/components/Toggle';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { pullAndMergeAll } from '@/sync';

export default function Settings() {
  const router = useRouter();
  const {
    loaded, load, defaultReminderDaysBefore, setDefaultReminderDaysBefore,
    notificationSoundEnabled, setNotificationSoundEnabled,
    appLockEnabled, setAppLockEnabled,
  } = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const isPremium = useAuthStore((s) => s.isPremium);
  const signOut = useAuthStore((s) => s.signOut);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const onToggleAppLock = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        Alert.alert('No biometrics set up', 'Set up Face ID / fingerprint in your device settings first.');
        return;
      }
    }
    await setAppLockEnabled(value);
  };

  const accountLabel = user?.phone ? `+${user.phone}` : user?.email ?? null;
  // A phone number has no meaningful "initial" letter — show a generic
  // avatar glyph for phone accounts, and the first letter for email ones.
  const avatarGlyph = user?.email ? user.email[0].toUpperCase() : '👤';

  const onSyncNow = async () => {
    setSyncing(true);
    try {
      await pullAndMergeAll();
    } catch (error) {
      console.error('[settings] manual sync failed', error);
      Alert.alert('Sync failed', 'Check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.headerRow}>
        <Text style={styles.backLink} onPress={() => router.back()}>‹ FreshKeep</Text>
      </View>
      <Text style={styles.title}>Settings</Text>

      <View style={[styles.card, styles.rowCard]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{accountLabel ? avatarGlyph : '—'}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{accountLabel ?? 'Not signed in'}</Text>
          <Text style={styles.rowSubtitle}>{user ? `Signed in · ${isPremium ? 'Premium' : 'Free plan'}` : 'Sign in to save your list and sync'}</Text>
        </View>
        {user ? (
          <Text style={styles.signOutLink} onPress={signOut}>Sign out</Text>
        ) : (
          <Text style={styles.signOutLink} onPress={() => router.push('/login')}>Sign in</Text>
        )}
      </View>

      {user && isPremium ? (
        <View style={styles.syncedBanner}>
          <Text style={styles.syncedTitle}>☁️  Synced</Text>
          <Text style={styles.syncedSubtitle}>Your list follows you across devices.</Text>
          <Text style={styles.syncNowLink} onPress={onSyncNow}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
        </View>
      ) : (
        <View style={styles.premiumBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Text style={{ fontSize: 20 }}>☁️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>Sync across devices</Text>
              <Text style={styles.premiumSubtitle}>Cloud backup + web access</Text>
            </View>
            <Text style={styles.premiumBadge}>PREMIUM</Text>
          </View>
          <Text style={styles.premiumCta} onPress={() => router.push(user ? '/premium' : '/login')}>
            {user ? 'Upgrade' : 'Sign in to upgrade'}
          </Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>REMINDERS</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.rowTitle}>Default lead time</Text>
            <Text style={styles.rowSubtitle}>Applied to new items</Text>
          </View>
          <Text
            style={styles.rowValue}
            onPress={() => setDefaultReminderDaysBefore(defaultReminderDaysBefore >= 7 ? 1 : defaultReminderDaysBefore + 1)}
          >
            {defaultReminderDaysBefore} days before ›
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.rowTitle}>Notification sound</Text>
          <Toggle value={notificationSoundEnabled} onValueChange={setNotificationSoundEnabled} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>PRIVACY &amp; LOCK</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.rowTitle}>🔒  Require biometrics to open</Text>
          <Toggle value={appLockEnabled} onValueChange={onToggleAppLock} />
        </View>
      </View>
      <Text style={styles.footnote}>
        On the free plan everything stays on this device. Premium encrypts a copy to the cloud so you can restore it on any device.
      </Text>

      <Text style={styles.version}>FreshKeep · Version 1.0{'\n'}Remembers your dates, so you don&apos;t have to.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 16 },
  headerRow: { paddingTop: 56, paddingBottom: 6 },
  backLink: { fontSize: 16, color: colors.primary },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: colors.textPrimary, marginBottom: 14 },
  card: { backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 46, height: 46, borderRadius: 999, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  rowSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  signOutLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  premiumBanner: { backgroundColor: colors.primaryDark, borderRadius: radii.md + 4, padding: 16, marginTop: 14 },
  premiumTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  premiumSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, marginTop: 2 },
  premiumBadge: { fontSize: 11, fontWeight: '700', backgroundColor: colors.gold, color: colors.goldText, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7 },
  premiumCta: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 11, textAlign: 'center', color: '#fff', fontWeight: '700', fontSize: 14, paddingVertical: 11, marginTop: 13 },
  syncedBanner: { backgroundColor: colors.successBg, borderRadius: radii.md + 4, padding: 16, marginTop: 14 },
  syncedTitle: { color: colors.successText, fontSize: 16, fontWeight: '700' },
  syncedSubtitle: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  syncNowLink: { color: colors.successText, fontWeight: '700', fontSize: 14, marginTop: 10 },
  sectionLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginTop: 22, marginBottom: 8, marginLeft: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowValue: { fontSize: 16, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 13 },
  footnote: { fontSize: 12.5, color: colors.textFaint, lineHeight: 18, marginTop: 8, paddingHorizontal: 2 },
  version: { textAlign: 'center', color: colors.textFaint, fontSize: 12.5, marginTop: 26, lineHeight: 18 },
});
