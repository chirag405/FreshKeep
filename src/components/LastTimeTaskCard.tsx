import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow } from '@/theme/tokens';
import { formatDaysAgo } from '@/lib/dateMath';
import { lastTimeProgress, type LastTimeBucketKey } from '@/lib/urgency';

const TONE = {
  overdue: { bar: colors.danger, badgeBg: colors.dangerBg, badgeText: colors.danger, iconBg: colors.dangerBg },
  dueSoon: { bar: colors.warning, badgeBg: colors.warningBg, badgeText: colors.warningText, iconBg: colors.iconTilePurple },
  onTrack: { bar: colors.success, badgeBg: colors.successBg, badgeText: colors.successText, iconBg: colors.successBg },
} as const;

export function LastTimeTaskCard({
  icon,
  name,
  daysSince,
  repeatIntervalDays,
  tone,
  onPress,
}: {
  icon: string;
  name: string;
  daysSince: number;
  repeatIntervalDays: number | null;
  tone: LastTimeBucketKey;
  onPress: () => void;
}) {
  const palette = TONE[tone];
  const badgeLabel =
    repeatIntervalDays == null
      ? null
      : tone === 'overdue'
        ? `${daysSince - repeatIntervalDays}d over`
        : `${repeatIntervalDays - daysSince}d left`;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.subtitle}>
            Last done{' '}
            <Text style={[styles.subtitleStrong, tone === 'overdue' && styles.subtitleOverdue]}>
              {formatDaysAgo(daysSince)}
            </Text>
          </Text>
        </View>
        {badgeLabel ? (
          <Text style={[styles.badge, { backgroundColor: palette.badgeBg, color: palette.badgeText }]}>
            {badgeLabel}
          </Text>
        ) : (
          <Text style={styles.check}>✔️</Text>
        )}
      </View>
      {repeatIntervalDays != null ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${lastTimeProgress(daysSince, repeatIntervalDays)}%`, backgroundColor: palette.bar }]} />
          </View>
          <Text style={styles.interval}>Every {repeatIntervalDays} days</Text>
        </>
      ) : (
        <Text style={[styles.interval, { marginTop: 10 }]}>No reminder set · tap to add one</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.xl, paddingVertical: 13, paddingHorizontal: 15, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  iconWrap: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 23 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  subtitleStrong: { fontWeight: '700', color: colors.textPrimary },
  subtitleOverdue: { color: colors.danger },
  badge: { fontSize: 12, fontWeight: '700', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, overflow: 'hidden' },
  check: { fontSize: 20 },
  track: { height: 6, borderRadius: 999, backgroundColor: colors.divider, marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  interval: { fontSize: 11, color: colors.textFaint, marginTop: 6 },
});
