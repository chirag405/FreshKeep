import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow } from '@/theme/tokens';
import { formatExpiryCountdown } from '@/lib/dateMath';

const URGENCY_COLOR = {
  needsAttention: { bar: colors.danger, text: colors.dangerTextAlt, iconBg: colors.dangerBg },
  thisWeek: { bar: colors.warning, text: colors.warningLabel, iconBg: colors.warningBg },
  fineForNow: { bar: colors.success, text: colors.successText, iconBg: colors.successBg },
} as const;

export function ExpiryItemCard({
  icon,
  name,
  subtitle,
  daysLeft,
  tone,
  onPress,
}: {
  icon: string;
  name: string;
  subtitle: string;
  daysLeft: number;
  tone: keyof typeof URGENCY_COLOR;
  onPress: () => void;
}) {
  const { big, small } = formatExpiryCountdown(daysLeft);
  const palette = URGENCY_COLOR[tone];
  // The design (S3) renders "6 days" as a large 22px number with a smaller
  // inline " days" suffix — split numeric countdowns; word countdowns
  // ("Today", "Tomorrow", "Expired") stay one piece.
  const numericMatch = big.match(/^(\d+) (days?)$/);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.bar, { backgroundColor: palette.bar }]} />
      <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={styles.rightCol}>
        {numericMatch ? (
          <Text style={[styles.big, { color: palette.bar }]}>
            {numericMatch[1]}
            <Text style={styles.bigSuffix}> {numericMatch[2]}</Text>
          </Text>
        ) : (
          <Text style={[styles.big, { color: palette.bar }]}>{big}</Text>
        )}
        <Text style={[styles.small, { color: palette.text }]}>{small}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...shadow.card,
  },
  // Rounded on its outer corners instead of clipping via overflow:'hidden',
  // which would also clip the card's iOS shadow.
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: radii.xl, borderBottomLeftRadius: radii.xl },
  iconWrap: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 23 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rightCol: { alignItems: 'flex-end' },
  big: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, lineHeight: 24 },
  bigSuffix: { fontSize: 13, fontWeight: '700' },
  small: { fontSize: 11, marginTop: 3 },
});
