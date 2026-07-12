import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';

export function IconTile({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: string;
  label?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <View style={[styles.tile, selected && styles.tileSelected]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  tile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md + 1,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
