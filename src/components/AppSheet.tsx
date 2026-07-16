/* eslint-disable react-hooks/refs -- `close` only reads ref.current inside
   its own callback body, invoked later from an event handler (Cancel/Save/
   pick), never synchronously during render. The lint rule can't see that
   distinction and flags passing `close` itself to the header/children render
   props as if it dereferenced the ref right here. */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { colors } from '@/theme/tokens';

const DEFAULT_SNAP_POINTS = ['92%'];

/**
 * Backdrop matching the Claude Design handoff (S5/S6): the screen behind the
 * sheet stays visible but blurred and dimmed (mock uses blur(1px) +
 * rgba(10,20,15,.34)), instead of a plain dark scrim. Fades with the sheet's
 * own animated position; tapping it dismisses.
 */
function BlurBackdrop({
  animatedIndex,
  style,
  onPress,
}: BottomSheetBackdropProps & { onPress: () => void }) {
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIndex.get(), [-1, 0], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[style, fadeStyle]}>
      <BlurView
        intensity={18}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
    </Animated.View>
  );
}

/**
 * Thin routing glue around @gorhom/bottom-sheet's BottomSheetModal — the
 * library owns the actual drag/backdrop/animation behavior; this just
 * presents it the moment the host route mounts and calls router.back() when
 * it's dismissed (swipe-down, backdrop tap, or via the `close` callback
 * handed to `header`/`children`), so a route like /add (rendered with
 * presentation: 'transparentModal', animation: 'none' — see _layout.tsx)
 * reads as a normal expo-router screen while looking and behaving like a
 * native bottom sheet.
 *
 * `header`/`children` are render props (not plain nodes) that receive
 * `close` so callers can dismiss the sheet correctly. Routing back must stay
 * solely owned by BottomSheetModal's onDismiss below — a caller navigating
 * with router.back() directly, in addition to onDismiss also firing,
 * double-pops the route (the second pop lands on an already-popped screen
 * and throws "GO_BACK was not handled by any navigator").
 */
export function AppSheet({
  header,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
}: {
  header?: (close: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  snapPoints?: (string | number)[];
}) {
  const router = useRouter();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    ref.current?.present();
  }, []);

  const close = useCallback(() => {
    ref.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BlurBackdrop {...props} onPress={close} />,
    [close],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={() => router.back()}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      {header ? <BottomSheetView style={styles.headerWrap}>{header(close)}</BottomSheetView> : null}
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children(close)}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(10,20,15,0.34)' },
  sheetBackground: { backgroundColor: colors.screenBg, borderRadius: 26 },
  handle: { backgroundColor: colors.dashedBorder, width: 38, height: 5 },
  headerWrap: { paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
});
