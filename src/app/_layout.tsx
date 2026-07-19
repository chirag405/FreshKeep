import '../global.css';

import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme } from 'nativewind';
import { PortalHost } from '@rn-primitives/portal';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrate } from '@/db/client';
import { initNotifications } from '@/notifications';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';
import { pullAndMergeAll } from '@/sync';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { hasSeenOnboarding } from '@/lib/onboardingFlag';
import { NAV_THEME } from '@/lib/theme';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'/onboarding' | '/' | null>(null);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    async function boot() {
      migrate();
      initNotifications();
      try {
        // Awaited so the Stack only renders once auth state is actually
        // known, avoiding a flash of "not signed in" for an already-signed-in
        // Premium user. `pullAndMergeAll` is a no-op for free/unauthenticated
        // users (see src/sync) and never throws (internally isolated
        // per-row) — the try/catch here is defense-in-depth so a genuinely
        // unexpected failure (e.g. initAuth's own network call) still can't
        // strand the app on the loading spinner forever.
        await initAuth();
        // Household membership must be known before the first sync — it
        // decides whether a free user syncs at all (household rows only).
        await useHouseholdStore.getState().refresh();
        await pullAndMergeAll();
      } catch (error) {
        console.error('[boot] auth/sync init failed, continuing anyway', error);
      } finally {
        const seen = await hasSeenOnboarding();
        setInitialRoute(seen ? '/' : '/onboarding');
        setReady(true);
      }
    }
    boot();
  }, [initAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <BottomSheetModalProvider>
            {!ready ? (
              <AnimatedSplash />
            ) : (
              <Stack screenOptions={{ headerShown: false }} initialRouteName={initialRoute === '/onboarding' ? 'onboarding' : 'index'}>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="index" />
                <Stack.Screen name="item/[id]" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="how-to" />
                <Stack.Screen name="join/[token]" />
                <Stack.Screen
                  name="add"
                  options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
                />
                <Stack.Screen
                  name="mili"
                  options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
                />
                <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
              </Stack>
            )}
          </BottomSheetModalProvider>
          <PortalHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
