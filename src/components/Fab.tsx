import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow } from '@/theme/tokens';

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.button} onPress={onPress}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: radii.pill,
    ...shadow.primaryButton,
  },
  plus: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
