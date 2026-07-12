import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/tokens';

const TONE_COLOR = {
  danger: colors.dangerLabel,
  warning: colors.warningLabel,
  success: colors.successText,
} as const;

export function SectionHeader({ label, tone }: { label: string; tone: keyof typeof TONE_COLOR }) {
  return <Text style={[styles.text, { color: TONE_COLOR[tone] }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
});
