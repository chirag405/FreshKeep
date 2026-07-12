import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.chipTrackBg,
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radii.sm + 1,
  },
  segmentActive: {
    backgroundColor: colors.chipActiveBg,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textFaint2,
  },
  labelActive: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
