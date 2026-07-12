import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.toggleOn : '#D8D5CB', justifyContent: value ? 'flex-end' : 'flex-start' }]}
    >
      <View style={styles.thumb} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 51,
    height: 31,
    borderRadius: 999,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 999,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
