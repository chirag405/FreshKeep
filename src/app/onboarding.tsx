import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { markOnboardingSeen } from '@/lib/onboardingFlag';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🥛',
    title: 'Track what expires',
    body: 'Add groceries, medicine, or leftovers with a date — FreshKeep sorts them into Needs attention, This week, and Fine for now.',
  },
  {
    icon: '🛏️',
    title: 'Remember what you last did',
    body: 'Changed the bedsheets? Cleaned the AC filter? Log it once, set a repeat interval, and FreshKeep tells you when it’s due again.',
  },
  {
    icon: '🔔',
    title: 'Reminders, only if you ask',
    body: 'Turn on a reminder for any item or task and get a notification right when it matters — nothing fires unless you switch it on.',
  },
  {
    icon: '☁️',
    title: 'Free on-device, or sync with Premium',
    body: 'Everything works fully offline for free. Upgrade any time to back up and sync your list across every device you own.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={[styles.skip, { top: insets.top + 8 }]} onPress={finish}>Skip</Text>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconWrap}>
              <Text style={{ fontSize: 44 }}>{item.icon}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dotsRow}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <Pressable style={[styles.cta, { marginBottom: insets.bottom + 20 }]} onPress={next}>
        <Text style={styles.ctaText}>{isLast ? 'Get started' : 'Next'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  skip: { position: 'absolute', right: 20, fontSize: 15, fontWeight: '600', color: colors.textMuted, zIndex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary, textAlign: 'center' },
  body: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.dashedBorder },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  cta: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginHorizontal: 24 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
