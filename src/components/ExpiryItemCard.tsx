import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';
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
        <Text style={[styles.big, { color: palette.bar }]}>{big}</Text>
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
    padding: 14,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  iconWrap: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 23 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rightCol: { alignItems: 'flex-end' },
  big: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  small: { fontSize: 11, marginTop: 3 },
});
