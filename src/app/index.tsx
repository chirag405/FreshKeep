import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Fab } from '@/components/Fab';
import { EmptyState } from '@/components/EmptyState';
import { ExpiryItemCard } from '@/components/ExpiryItemCard';
import { LastTimeTaskCard } from '@/components/LastTimeTaskCard';
import { useExpiryStore, getExpiryBuckets } from '@/store/expiryStore';
import { useLastTimeStore, getLastTimeBuckets } from '@/store/lastTimeStore';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';
import { daysBetween, todayISODate } from '@/lib/dateMath';

function weekdayMonth(): string {
  const d = new Date();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

const EXPIRING_GROUPS = [
  { key: 'needsAttention', label: 'Needs attention', tone: 'danger' as const },
  { key: 'thisWeek', label: 'This week', tone: 'warning' as const },
  { key: 'fineForNow', label: 'Fine for now', tone: 'success' as const },
];

const LAST_TIME_GROUPS = [
  { key: 'overdue', label: 'Overdue', tone: 'danger' as const },
  { key: 'dueSoon', label: 'Due soon', tone: 'warning' as const },
  { key: 'onTrack', label: 'On track', tone: 'success' as const },
];

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const expiryBuckets = getExpiryBuckets(expiryItems);
  const lastTimeBuckets = getLastTimeBuckets(lastTimeItems);

  const myUserId = useAuthStore((s) => s.user?.id ?? null);
  const isPremium = useAuthStore((s) => s.isPremium);
  const memberName = useHouseholdStore((s) => s.memberName);
  // "added by X" byline for shared items someone else added.
  const byline = (householdId: string | null, createdBy: string | null): string | null => {
    if (!householdId || !createdBy || createdBy === myUserId) return null;
    const who = memberName(createdBy);
    return who ? `added by ${who.split(' ')[0]}` : null;
  };
  const expiryGroupsWithRows = EXPIRING_GROUPS.filter((g) => expiryBuckets[g.key as keyof typeof expiryBuckets].length > 0);
  const lastTimeGroupsWithRows = LAST_TIME_GROUPS.filter((g) => lastTimeBuckets[g.key as keyof typeof lastTimeBuckets].length > 0);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateLabel}>{weekdayMonth()}</Text>
            <Text style={styles.title}>FreshKeep</Text>
          </View>
          <View style={styles.headerActions}>
            <Text
              style={styles.settingsIcon}
              onPress={() => {
                // Mili is Premium-only; the Edge Function enforces it too.
                if (!myUserId) router.push('/login');
                else if (!isPremium) router.push('/premium');
                else router.push('/mili');
              }}
            >
              🎤
            </Text>
            <Text style={styles.settingsIcon} onPress={() => router.push('/settings')}>⚙️</Text>
          </View>
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
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110, flexGrow: 1 }]}
          data={expiryGroupsWithRows}
          keyExtractor={(g) => g.key}
          ListEmptyComponent={
            <EmptyState
              icon="🥛"
              title="Nothing expiring yet"
              subtitle="Add milk, leftovers, or medicine and FreshKeep will watch the dates for you."
            />
          }
          renderItem={({ item: group }) => {
            const rows = expiryBuckets[group.key as keyof typeof expiryBuckets];
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
                        subtitle={byline(row.household_id, row.created_by) ?? (row.opened_date ? 'opened' : row.added_date ? 'added' : ' ')}
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
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110, flexGrow: 1 }]}
          data={lastTimeGroupsWithRows}
          keyExtractor={(g) => g.key}
          ListEmptyComponent={
            <EmptyState
              icon="🛏️"
              title="No tasks yet"
              subtitle={'Track things you do on a schedule — like changing filters or bedsheets — and never wonder when you last did it.'}
            />
          }
          renderItem={({ item: group }) => {
            const rows = lastTimeBuckets[group.key as keyof typeof lastTimeBuckets];
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
  header: { paddingHorizontal: spacing.xl, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: { fontSize: 13, fontWeight: '600', color: colors.primary, letterSpacing: 0.2 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 2, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  settingsIcon: { fontSize: 22 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
});
