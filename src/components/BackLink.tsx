import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';

/**
 * Back affordance from the Claude Design handoff (S7/S8): a thick 11×18
 * chevron stroke next to a 16px label, not a small text glyph.
 */
export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row} hitSlop={10}>
      <Svg width={13} height={20} viewBox="0 0 11 18" fill="none">
        <Path d="M9 2L2 9l7 7" stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  label: { fontSize: 16, color: colors.primary },
});
