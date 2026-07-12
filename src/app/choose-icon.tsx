import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radii, spacing } from '@/theme/tokens';
import { ICON_CATEGORIES } from '@/lib/iconCatalog';
import { IconTile } from '@/components/IconTile';
import { emitIconSelected } from '@/lib/iconSelectionChannel';

export default function ChooseIcon() {
  const router = useRouter();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(selected ?? '🥫');

  const pick = (icon: string) => {
    setCurrent(icon);
    emitIconSelected(icon);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.link} onPress={() => router.back()}>Cancel</Text>
        <Text style={styles.title}>Choose an icon</Text>
        <Text style={[styles.link, styles.linkStrong]} onPress={() => router.back()}>Done</Text>
      </View>
      <View style={styles.search}>
        <Text style={{ color: colors.textFaint }}>🔍  Search icons</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder=""
          style={StyleSheet.absoluteFill}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
        <View style={styles.selectedRow}>
          <View style={styles.selectedCard}>
            <View style={styles.selectedIconWrap}>
              <Text style={{ fontSize: 24 }}>{current}</Text>
            </View>
            <View>
              <Text style={styles.selectedLabel}>SELECTED</Text>
              <Text style={styles.selectedName}>Current icon</Text>
            </View>
          </View>
          <View style={styles.photoTile}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textFaint2 }}>Photo</Text>
          </View>
        </View>

        {ICON_CATEGORIES.map((cat) => {
          if (query && !cat.label.toLowerCase().includes(query.toLowerCase())) return null;
          return (
            <View key={cat.label} style={{ marginBottom: 18 }}>
              <Text style={styles.categoryLabel}>{cat.label.toUpperCase()}</Text>
              <View style={styles.grid}>
                {cat.icons.map((icon) => (
                  <View key={icon} style={styles.gridItem}>
                    <IconTile icon={icon} selected={icon === current} onPress={() => pick(icon)} />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingTop: 60, paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  link: { fontSize: 15, color: colors.primary },
  linkStrong: { fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  search: { backgroundColor: colors.searchBg, borderRadius: radii.md, height: 38, justifyContent: 'center', paddingHorizontal: 13, marginBottom: 8 },
  selectedRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  selectedCard: { flex: 1, backgroundColor: colors.card, borderRadius: radii.md + 2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  selectedIconWrap: { width: 42, height: 42, borderRadius: 11, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  selectedLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '600' },
  selectedName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  photoTile: { width: 96, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.dashedBorder, borderStyle: 'dashed', borderRadius: radii.md + 2, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: 0.55 },
  categoryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  gridItem: { width: '14%' },
});
