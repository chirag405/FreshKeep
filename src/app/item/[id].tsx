import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radii } from '@/theme/tokens';
import { Toggle } from '@/components/Toggle';
import { daysBetween, formatDate, formatDaysAgo, formatExpiryCountdown, todayISODate } from '@/lib/dateMath';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { scheduleReminder, cancelReminder } from '@/notifications';

export default function ItemDetail() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: 'expiry' | 'task' }>();

  const expiryItems = useExpiryStore((s) => s.items);
  const updateExpiryItem = useExpiryStore((s) => s.updateItem);
  const removeExpiryItem = useExpiryStore((s) => s.removeItem);

  const tasks = useLastTimeStore((s) => s.items);
  const updateTask = useLastTimeStore((s) => s.updateTask);
  const markDoneNow = useLastTimeStore((s) => s.markDoneNow);
  const removeTask = useLastTimeStore((s) => s.removeTask);

  const today = new Date(`${todayISODate()}T00:00:00`);

  const item = useMemo(() => expiryItems.find((i) => i.id === id), [expiryItems, id]);
  const task = useMemo(() => tasks.find((t) => t.id === id), [tasks, id]);

  if (type === 'expiry') {
    if (!item) return <View style={styles.screen} />;
    const daysLeft = daysBetween(today, new Date(`${item.expiry_date}T00:00:00`));
    const { big } = formatExpiryCountdown(daysLeft);

    const toggleReminder = async (value: boolean) => {
      await updateExpiryItem(item.id, { reminderEnabled: value });
      if (value) {
        const triggerDate = new Date(`${item.expiry_date}T09:00:00`);
        triggerDate.setDate(triggerDate.getDate() - item.reminder_days_before);
        const scheduledId = await scheduleReminder({ id: `expiry-${item.id}`, title: 'FreshKeep', body: `${item.icon} ${item.name} expires soon`, date: triggerDate });
        if (!scheduledId) {
          Alert.alert('Reminder not set', "That reminder date is already in the past (or notifications aren't allowed), so no alert will fire.");
        }
      } else {
        await cancelReminder(`expiry-${item.id}`);
      }
    };

    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.headerRow}>
          <Text style={styles.backLink} onPress={() => router.back()}>‹ Expiring</Text>
        </View>
        <View style={styles.heroBlock}>
          <View style={styles.heroIcon}><Text style={{ fontSize: 40 }}>{item.icon}</Text></View>
          <Text style={styles.heroTitle}>{item.name}</Text>
          <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Expires today' : `Expires in ${big}`}</Text></View>
        </View>
        <View style={styles.card}>
          <Row label="Expiry date" value={formatDate(item.expiry_date)} />
          <Divider />
          <Row label="Location" value={item.location ?? '—'} />
          <Divider />
          <Row label="Added" value={formatDate(item.added_date)} />
        </View>
        <Text style={styles.sectionLabel}>REMINDER</Text>
        <View style={styles.card}>
          <View style={styles.reminderHeaderRow}>
            <Text style={styles.reminderTitle}>🔔  Remind me before</Text>
            <Toggle value={!!item.reminder_enabled} onValueChange={toggleReminder} />
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={styles.primaryAction} onPress={async () => { await removeExpiryItem(item.id); router.back(); }}>
            <Text style={styles.primaryActionText}>✅  Used it</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={async () => { await removeExpiryItem(item.id); router.back(); }}>
            <Text style={styles.secondaryActionText}>🗑️  Threw away</Text>
          </Pressable>
        </View>
        <Text
          style={styles.removeLink}
          onPress={() =>
            Alert.alert('Remove item', `Remove ${item.name}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: async () => { await removeExpiryItem(item.id); router.back(); } },
            ])
          }
        >
          Remove item
        </Text>
      </ScrollView>
    );
  }

  if (!task) return <View style={styles.screen} />;
  const daysSince = daysBetween(new Date(`${task.last_done_date}T00:00:00`), today);

  const toggleTaskReminder = async (value: boolean) => {
    await updateTask(task.id, { reminderEnabled: value });
    if (value && task.repeat_interval_days) {
      const triggerDate = new Date(`${task.last_done_date}T09:00:00`);
      triggerDate.setDate(triggerDate.getDate() + task.repeat_interval_days);
      const scheduledId = await scheduleReminder({
        id: `lasttime-${task.id}`,
        title: 'FreshKeep',
        body: `${task.icon} ${task.repeat_interval_days} days since you ${task.name.toLowerCase()}`,
        date: triggerDate,
      });
      if (!scheduledId) {
        Alert.alert('Reminder not set', "That reminder date is already in the past (or notifications aren't allowed), so no alert will fire.");
      }
    } else if (!value) {
      await cancelReminder(`lasttime-${task.id}`);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.headerRow}>
        <Text style={styles.backLink} onPress={() => router.back()}>‹ Last time</Text>
      </View>
      <View style={styles.heroBlock}>
        <View style={styles.heroIcon}><Text style={{ fontSize: 40 }}>{task.icon}</Text></View>
        <Text style={styles.heroTitle}>{task.name}</Text>
        <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Last done {formatDaysAgo(daysSince)}</Text></View>
      </View>
      <View style={styles.card}>
        <Row label="Last done" value={formatDate(task.last_done_date)} />
        <Divider />
        <Row label="Repeat every" value={task.repeat_interval_days ? `${task.repeat_interval_days} days` : 'Not set'} />
      </View>
      <Text style={styles.sectionLabel}>REMINDER</Text>
      <View style={styles.card}>
        <View style={styles.reminderHeaderRow}>
          <Text style={styles.reminderTitle}>🔔  Remind me</Text>
          <Toggle value={!!task.reminder_enabled} onValueChange={toggleTaskReminder} />
        </View>
      </View>
      <Pressable style={styles.primaryAction} onPress={() => markDoneNow(task.id)}>
        <Text style={styles.primaryActionText}>✔️  Did it just now</Text>
      </Pressable>
      <Text
        style={styles.removeLink}
        onPress={() =>
          Alert.alert('Remove task', `Remove ${task.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: async () => { await removeTask(task.id); router.back(); } },
          ])
        }
      >
        Remove task
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 15, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 13 }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 16 },
  headerRow: { paddingTop: 56, paddingBottom: 6 },
  backLink: { fontSize: 16, color: colors.primary },
  heroBlock: { alignItems: 'center', paddingVertical: 20 },
  heroIcon: { width: 78, height: 78, borderRadius: 22, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 14, color: colors.textPrimary },
  heroBadge: { backgroundColor: colors.dangerBg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, marginTop: 10 },
  heroBadgeText: { color: colors.dangerText, fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16 },
  sectionLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginTop: 22, marginBottom: 8, marginLeft: 6 },
  reminderHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  primaryAction: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryAction: { flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryActionText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  removeLink: { textAlign: 'center', color: colors.dangerText, fontSize: 15, fontWeight: '600', marginTop: 20 },
});
