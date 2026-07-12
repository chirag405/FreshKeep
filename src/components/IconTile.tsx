import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii } from '@/theme/tokens';

export function IconTile({
  icon,
  selected,
  onPress,
}: {
  icon: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tile, selected && styles.tileSelected]} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
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
});
