import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadow } from '@/theme/tokens';
import { BackLink } from '@/components/BackLink';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { daysBetween, formatDate, formatDaysAgo, formatExpiryCountdown, todayISODate } from '@/lib/dateMath';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { scheduleReminder, cancelReminder } from '@/notifications';

export default function ItemDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  if (type === 'expiry') {
    if (!item) return <View style={[styles.screen, { paddingTop: insets.top }]} />;
    const daysLeft = daysBetween(today, new Date(`${item.expiry_date}T00:00:00`));
    const { big } = formatExpiryCountdown(daysLeft);
    const noteValue = noteDraft ?? item.note ?? '';

    const saveNote = async () => {
      if (noteDraft === null) return;
      const trimmed = noteDraft.trim();
      if (trimmed === (item.note ?? '')) return;
      await updateExpiryItem(item.id, { note: trimmed || null });
    };

    const scheduleExpiryReminder = async (daysBefore: number): Promise<boolean> => {
      const triggerDate = new Date(`${item.expiry_date}T09:00:00`);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      const scheduledId = await scheduleReminder({
        id: `expiry-${item.id}`,
        title: 'FreshKeep',
        body: `${item.icon} ${item.name} expires in ${daysBefore} day${daysBefore === 1 ? '' : 's'}`,
        date: triggerDate,
      });
      return !!scheduledId;
    };

    const toggleReminder = async (value: boolean) => {
      await updateExpiryItem(item.id, { reminderEnabled: value });
      if (value) {
        const ok = await scheduleExpiryReminder(item.reminder_days_before);
        if (!ok) {
          Alert.alert('Reminder not set', "That reminder date is already in the past (or notifications aren't allowed), so no alert will fire.");
        }
      } else {
        await cancelReminder(`expiry-${item.id}`);
      }
    };

    const changeLeadTime = async (delta: number) => {
      const next = Math.min(14, Math.max(1, item.reminder_days_before + delta));
      if (next === item.reminder_days_before) return;
      await updateExpiryItem(item.id, { reminderDaysBefore: next });
      // Re-issue the scheduled notification with the new lead time — same
      // deterministic id, so this replaces the old one instead of stacking.
      if (item.reminder_enabled) {
        await cancelReminder(`expiry-${item.id}`);
        await scheduleExpiryReminder(next);
      }
    };

    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <BackLink label="Expiring" onPress={() => router.back()} />
        </View>
        <View style={styles.heroBlock}>
          <View style={styles.heroIcon}><Text style={{ fontSize: 40 }}>{item.icon}</Text></View>
          <Text style={styles.heroTitle}>{item.name}</Text>
          <View style={[styles.heroBadge, daysLeft > 7 && styles.heroBadgeCalm]}>
            <View style={[styles.heroBadgeDot, daysLeft > 7 && styles.heroBadgeDotCalm]} />
            <Text style={[styles.heroBadgeText, daysLeft > 7 && styles.heroBadgeTextCalm]}>
              {daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Expires today' : `Expires in ${big}`}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Row label="Expiry date" value={formatDate(item.expiry_date)} />
          <Divider />
          <Row label="Added" value={formatDate(item.added_date)} />
        </View>

        <Text style={styles.sectionLabel}>NOTE</Text>
        <View style={styles.card}>
          <Textarea
            value={noteValue}
            onChangeText={setNoteDraft}
            onBlur={saveNote}
            placeholder="e.g. opened Tuesday, smells fine so far"
            placeholderTextColor={colors.textFaint}
            className="border-0 bg-transparent px-0 py-0 shadow-none"
            style={styles.noteInput}
          />
        </View>

        <Text style={styles.sectionLabel}>REMINDER</Text>
        <View style={styles.card}>
          <View style={styles.reminderHeaderRow}>
            <Text style={styles.reminderTitle}>🔔  Remind me before</Text>
            <Switch checked={!!item.reminder_enabled} onCheckedChange={toggleReminder} />
          </View>
          {!!item.reminder_enabled && (
            <>
              <Divider />
              <View style={styles.reminderHeaderRow}>
                <Text style={styles.leadTimeLabel}>Lead time</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => changeLeadTime(-1)} hitSlop={8}>
                    <Text style={[styles.stepperButton, item.reminder_days_before <= 1 && styles.stepperButtonDisabled]}>–</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{item.reminder_days_before} day{item.reminder_days_before === 1 ? '' : 's'}</Text>
                  <Pressable onPress={() => changeLeadTime(1)} hitSlop={8}>
                    <Text style={styles.stepperButton}>+</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.reminderPreview}>
                You&apos;ll get one notification: &ldquo;{item.icon} {item.name} expires in {item.reminder_days_before} day{item.reminder_days_before === 1 ? '' : 's'}.&rdquo;
              </Text>
            </>
          )}
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={styles.primaryAction} onPress={async () => { await removeExpiryItem(item.id); router.back(); }}>
            <Text style={styles.actionEmoji}>✅</Text>
            <Text style={styles.primaryActionText}>Used it</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={async () => { await removeExpiryItem(item.id); router.back(); }}>
            <Text style={styles.actionEmoji}>🗑️</Text>
            <Text style={styles.secondaryActionText}>Threw away</Text>
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

  if (!task) return <View style={[styles.screen, { paddingTop: insets.top }]} />;
  const daysSince = daysBetween(new Date(`${task.last_done_date}T00:00:00`), today);
  const noteValue = noteDraft ?? task.note ?? '';

  const saveNote = async () => {
    if (noteDraft === null) return;
    const trimmed = noteDraft.trim();
    if (trimmed === (task.note ?? '')) return;
    await updateTask(task.id, { note: trimmed || null });
  };

  const toggleTaskReminder = async (value: boolean) => {
    await updateTask(task.id, { reminderEnabled: value });
    if (value && task.repeat_interval_days) {
      const triggerDate = new Date(`${task.last_done_date}T09:00:00`);
      triggerDate.setDate(triggerDate.getDate() + task.repeat_interval_days);
      const body = task.note
        ? `${task.icon} ${task.name} · ${task.note}`
        : `${task.icon} ${task.repeat_interval_days} days since you ${task.name.toLowerCase()}`;
      const scheduledId = await scheduleReminder({
        id: `lasttime-${task.id}`,
        title: 'FreshKeep',
        body,
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
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <BackLink label="Last time" onPress={() => router.back()} />
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

      <Text style={styles.sectionLabel}>NOTE</Text>
      <View style={styles.card}>
        <Textarea
          value={noteValue}
          onChangeText={setNoteDraft}
          onBlur={saveNote}
          placeholder="e.g. used the blue filter, spare is under the sink"
          placeholderTextColor={colors.textFaint}
          className="border-0 bg-transparent px-0 py-0 shadow-none"
          style={styles.noteInput}
        />
      </View>

      <Text style={styles.sectionLabel}>REMINDER</Text>
      <View style={styles.card}>
        <View style={styles.reminderHeaderRow}>
          <Text style={styles.reminderTitle}>🔔  Remind me</Text>
          <Switch checked={!!task.reminder_enabled} onCheckedChange={toggleTaskReminder} />
        </View>
      </View>
      <Pressable style={[styles.primaryAction, { marginTop: 22 }]} onPress={() => markDoneNow(task.id)}>
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
  headerRow: { paddingBottom: 6 },
  heroBlock: { alignItems: 'center', paddingVertical: 20 },
  heroIcon: { width: 78, height: 78, borderRadius: 22, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 14, color: colors.textPrimary },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerBg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, marginTop: 10 },
  heroBadgeCalm: { backgroundColor: colors.successBg },
  heroBadgeDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.danger },
  heroBadgeDotCalm: { backgroundColor: colors.success },
  heroBadgeText: { color: colors.dangerText, fontSize: 14, fontWeight: '700' },
  heroBadgeTextCalm: { color: colors.successText },
  card: { backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16, ...shadow.card },
  sectionLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginTop: 22, marginBottom: 8, marginLeft: 6 },
  reminderHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  leadTimeLabel: { fontSize: 15, color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.screenBg, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  stepperButton: { fontSize: 20, fontWeight: '700', color: colors.primary, paddingHorizontal: 2 },
  stepperButtonDisabled: { color: colors.dashedBorder },
  stepperValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, minWidth: 56, textAlign: 'center' },
  reminderPreview: { fontSize: 13, color: colors.textMuted, marginTop: 12 },
  noteInput: { fontSize: 15, color: colors.textPrimary, minHeight: 44, textAlignVertical: 'top' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  actionEmoji: { fontSize: 18, marginBottom: 4 },
  primaryAction: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryAction: { flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', ...shadow.card },
  secondaryActionText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  removeLink: { textAlign: 'center', color: colors.dangerText, fontSize: 15, fontWeight: '600', marginTop: 20 },
});
