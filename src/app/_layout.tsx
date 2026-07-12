import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { migrate } from '@/db/client';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    migrate();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="choose-icon" options={{ presentation: 'modal' }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="verify" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
