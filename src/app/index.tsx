import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, spacing } from '@/theme/tokens';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Fab } from '@/components/Fab';
import { ExpiryItemCard } from '@/components/ExpiryItemCard';
import { LastTimeTaskCard } from '@/components/LastTimeTaskCard';
import { useExpiryStore, getExpiryBuckets } from '@/store/expiryStore';
import { useLastTimeStore, getLastTimeBuckets } from '@/store/lastTimeStore';
import { daysBetween, todayISODate } from '@/lib/dateMath';

function weekdayMonth(): string {
  const d = new Date();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

export default function Home() {
  const router = useRouter();
  const [section, setSection] = useState<'expiring' | 'lastTime'>('expiring');

  const expiryItems = useExpiryStore((s) => s.items);
  const hydrateExpiry = useExpiryStore((s) => s.hydrate);
  const lastTimeItems = useLastTimeStore((s) => s.items);
  const hydrateLastTime = useLastTimeStore((s) => s.hydrate);

  useEffect(() => {
    hydrateExpiry();
    hydrateLastTime();
  }, [hydrateExpiry, hydrateLastTime]);

  const today = new Date(`${todayISODate()}T00:00:00`);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateLabel}>{weekdayMonth()}</Text>
            <Text style={styles.title}>FreshKeep</Text>
          </View>
          <Text style={styles.settingsIcon} onPress={() => router.push('/settings')}>⚙️</Text>
        </View>
        <View style={{ marginTop: 16 }}>
          <SegmentedControl
            value={section}
            onChange={setSection}
            options={[
              { label: '🥛 Expiring', value: 'expiring' },
              { label: '🛏️ Last time', value: 'lastTime' },
            ]}
          />
        </View>
      </View>

      {section === 'expiring' ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={[
            { key: 'needsAttention', label: 'Needs attention', tone: 'danger' as const },
            { key: 'thisWeek', label: 'This week', tone: 'warning' as const },
            { key: 'fineForNow', label: 'Fine for now', tone: 'success' as const },
          ]}
          keyExtractor={(g) => g.key}
          renderItem={({ item: group }) => {
            const buckets = getExpiryBuckets(expiryItems);
            const rows = buckets[group.key as keyof typeof buckets];
            if (rows.length === 0) return null;
            return (
              <View>
                <SectionHeader label={group.label} tone={group.tone} />
                <View style={{ gap: 10 }}>
                  {rows.map((row) => {
                    const daysLeft = daysBetween(today, new Date(`${row.expiry_date}T00:00:00`));
                    return (
                      <ExpiryItemCard
                        key={row.id}
                        icon={row.icon}
                        name={row.name}
                        subtitle={[row.location, row.opened_date ? 'opened' : row.added_date ? 'added' : null].filter(Boolean).join(' · ') || ' '}
                        daysLeft={daysLeft}
                        tone={group.key as 'needsAttention' | 'thisWeek' | 'fineForNow'}
                        onPress={() => router.push({ pathname: '/item/[id]', params: { id: row.id, type: 'expiry' } })}
                      />
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={[
            { key: 'overdue', label: 'Overdue', tone: 'danger' as const },
            { key: 'dueSoon', label: 'Due soon', tone: 'warning' as const },
            { key: 'onTrack', label: 'On track', tone: 'success' as const },
          ]}
          keyExtractor={(g) => g.key}
          renderItem={({ item: group }) => {
            const buckets = getLastTimeBuckets(lastTimeItems);
            const rows = buckets[group.key as keyof typeof buckets];
            if (rows.length === 0) return null;
            return (
              <View>
                <SectionHeader label={group.label} tone={group.tone} />
                <View style={{ gap: 10 }}>
                  {rows.map((row) => {
                    const daysSince = daysBetween(new Date(`${row.last_done_date}T00:00:00`), today);
                    return (
                      <LastTimeTaskCard
                        key={row.id}
                        icon={row.icon}
                        name={row.name}
                        daysSince={daysSince}
                        repeatIntervalDays={row.repeat_interval_days}
                        tone={group.key as 'overdue' | 'dueSoon' | 'onTrack'}
                        onPress={() => router.push({ pathname: '/item/[id]', params: { id: row.id, type: 'task' } })}
                      />
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      )}

      <Fab
        label={section === 'expiring' ? 'Add item' : 'Add task'}
        onPress={() => router.push({ pathname: '/add', params: { type: section === 'expiring' ? 'expiry' : 'lastTime' } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: { fontSize: 13, fontWeight: '600', color: colors.primary, letterSpacing: 0.2 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 2, color: colors.textPrimary },
  settingsIcon: { fontSize: 22 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 118 },
});
