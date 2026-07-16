import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

/**
 * Design-exact segmented pill from the Claude Design handoff (S3/S5): tan
 * track, 3px inset, white active segment with a soft shadow. Deliberately
 * plain StyleSheet (no NativeWind classes) so it renders identically
 * everywhere — including inside the bottom sheet — with zero dependency on
 * the Tailwind compile pipeline.
 */
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
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: colors.chipActiveBg,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
