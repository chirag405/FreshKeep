import { Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' }}>
      <Text>FreshKeep — Home (Task 11 builds this)</Text>
    </View>
  );
}
