import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { migrate } from '@/db/client';
import { colors } from '@/theme/tokens';
import { initNotifications } from '@/notifications';
import { useAuthStore } from '@/store/authStore';
import { pullAndMergeAll } from '@/sync';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    migrate();
    initNotifications();
    initAuth().then(async () => {
      // No-op for free/unauthenticated users (see src/sync) — awaited so the
      // Stack only renders once auth state is actually known, avoiding a
      // flash of "not signed in" for an already-signed-in Premium user.
      await pullAndMergeAll();
      setReady(true);
    });
  }, [initAuth]);

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
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="verify" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
