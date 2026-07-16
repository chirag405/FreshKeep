import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadow } from '@/theme/tokens';
import { BackLink } from '@/components/BackLink';

const SECTIONS = [
  {
    icon: '🥛',
    title: 'Expiring items',
    body: 'Add anything with a date — groceries, medicine, leftovers. FreshKeep sorts your list into Needs attention, This week, and Fine for now, so you always know what to use first.',
  },
  {
    icon: '🛏️',
    title: 'Last-time tasks',
    body: 'For things you do on a schedule instead of a fixed date — changing bedsheets, cleaning a filter — log when you last did it and how often it repeats. Tap “Did it just now” to reset the clock, and add a note (like which filter size) that shows up again next time.',
  },
  {
    icon: '🎨',
    title: 'Icons',
    body: 'Tap the icon next to any item’s name to browse a big searchable catalog, grouped by category, so you can find the right one in a couple of taps.',
  },
  {
    icon: '📷',
    title: 'Scan a date',
    body: 'When adding an expiring item, tap Scan to point your camera at a printed date — FreshKeep reads it automatically and lets you confirm before saving.',
  },
  {
    icon: '🔔',
    title: 'Reminders',
    body: 'Reminders are opt-in per item. Turn one on and you’ll get a notification exactly when it matters — nothing fires unless you switch it on.',
  },
  {
    icon: '🔒',
    title: 'Privacy & app lock',
    body: 'Everything stays on this device by default. Turn on “Require biometrics to open” in Settings to lock FreshKeep behind Face ID or your fingerprint.',
  },
  {
    icon: '☁️',
    title: 'Premium sync',
    body: 'Free keeps everything local forever. Premium backs your list up to the cloud and keeps it in sync across every device you sign in on.',
  },
];

export default function HowTo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <BackLink label="Settings" onPress={() => router.back()} />
      </View>
      <Text style={styles.title}>How FreshKeep works</Text>

      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}><Text style={{ fontSize: 22 }}>{s.icon}</Text></View>
            <Text style={styles.cardTitle}>{s.title}</Text>
          </View>
          <Text style={styles.cardBody}>{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 16 },
  headerRow: { paddingBottom: 6 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: colors.textPrimary, marginBottom: 16 },
  card: { backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16, marginBottom: 12, ...shadow.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
});
