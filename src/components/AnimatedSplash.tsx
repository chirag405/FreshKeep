import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

/**
 * The native splash (app.json's expo-splash-screen config) shows instantly on
 * cold start with a static logo. This component takes over the moment JS is
 * running, while `boot()` in _layout.tsx does its async work, so the launch
 * feels like one continuous animated moment instead of static-image-then-app.
 */
export function AnimatedSplash() {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const tagTranslate = useSharedValue(8);

  useEffect(() => {
    scale.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.6)) }));
    opacity.set(withTiming(1, { duration: 380 }));
    tagOpacity.set(withDelay(280, withTiming(1, { duration: 420 })));
    tagTranslate.set(withDelay(280, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })));
  }, [opacity, scale, tagOpacity, tagTranslate]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.get(),
    transform: [{ translateY: tagTranslate.get() }],
  }));

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.logo, logoStyle]}>
        <Text style={{ fontSize: 40 }}>🌱</Text>
      </Animated.View>
      <Animated.Text style={[styles.tagline, tagStyle]}>FreshKeep</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 20 },
});
