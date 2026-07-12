import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, radii, spacing } from '@/theme/tokens';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Toggle } from '@/components/Toggle';
import { suggestIcon } from '@/lib/iconSuggest';
import { formatDate, todayISODate } from '@/lib/dateMath';
import { onIconSelected, clearIconListener } from '@/lib/iconSelectionChannel';
import { onDateScanned, clearScanListener } from '@/lib/ocr/scanResultChannel';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { scheduleReminder } from '@/notifications';

const RECENT_EXPIRY = ['Milk', 'Bread', 'Eggs', 'Paracetamol'];
const RECENT_TASKS = ['Changed bedsheets', 'Replaced toothbrush', 'Cleaned filter', 'Flipped mattress'];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Add() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [section, setSection] = useState<'expiry' | 'lastTime'>(params.type === 'lastTime' ? 'lastTime' : 'expiry');

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🥫');
  const [iconTouched, setIconTouched] = useState(false);
  const [expiryDate, setExpiryDate] = useState(addDays(todayISODate(), 7));
  const [repeatDays, setRepeatDays] = useState<number | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const addExpiryItem = useExpiryStore((s) => s.addItem);
  const addTask = useLastTimeStore((s) => s.addTask);

  useEffect(() => {
    onIconSelected((picked) => {
      setIcon(picked);
      setIconTouched(true);
    });
    return () => clearIconListener();
  }, []);

  useEffect(() => {
    onDateScanned((iso) => setExpiryDate(iso));
    return () => clearScanListener();
  }, []);

  const recentChips = section === 'expiry' ? RECENT_EXPIRY : RECENT_TASKS;
  const displayIcon = !iconTouched && name.trim().length > 0 ? suggestIcon(name, section) : icon;

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (section === 'expiry') {
      const row = await addExpiryItem({
        name: trimmed,
        icon: displayIcon,
        expiryDate,
        reminderEnabled,
        reminderDaysBefore: 2,
      });
      if (reminderEnabled) {
        const triggerDate = new Date(`${expiryDate}T09:00:00`);
        triggerDate.setDate(triggerDate.getDate() - 2);
        await scheduleReminder({
          id: `expiry-${row.id}`,
          title: 'FreshKeep',
          body: `${displayIcon} ${trimmed} expires soon`,
          date: triggerDate,
        });
      }
    } else {
      const row = await addTask({
        name: trimmed,
        icon: displayIcon,
        repeatIntervalDays: repeatDays,
        reminderEnabled,
      });
      if (reminderEnabled && row.repeat_interval_days) {
        const triggerDate = new Date(`${row.last_done_date}T09:00:00`);
        triggerDate.setDate(triggerDate.getDate() + row.repeat_interval_days);
        await scheduleReminder({
          id: `lasttime-${row.id}`,
          title: 'FreshKeep',
          body: `${displayIcon} ${row.repeat_interval_days} days since you ${trimmed.toLowerCase()}`,
          date: triggerDate,
        });
      }
    }
    router.back();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text style={styles.link} onPress={() => router.back()}>Cancel</Text>
          <Text style={styles.title}>{section === 'expiry' ? 'New item' : 'New task'}</Text>
          <Text style={[styles.link, styles.linkStrong]} onPress={save}>Save</Text>
        </View>

        <SegmentedControl
          value={section}
          onChange={setSection}
          options={[
            { label: '🥛 Expires', value: 'expiry' },
            { label: '🛏️ Last time', value: 'lastTime' },
          ]}
        />

        <ScrollView style={{ marginTop: 18 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>NAME &amp; ICON</Text>
          <View style={styles.nameRow}>
            <Pressable
              style={styles.iconButton}
              onPress={() => router.push({ pathname: '/choose-icon', params: { selected: displayIcon } })}
            >
              <Text style={{ fontSize: 28 }}>{displayIcon}</Text>
              <View style={styles.iconEditBadge}>
                <Text style={{ color: '#fff', fontSize: 10 }}>✎</Text>
              </View>
            </Pressable>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              style={styles.nameInput}
            />
          </View>
          <Text style={styles.hint}>Icon picked automatically — tap it to change</Text>

          <View style={styles.chipRow}>
            {recentChips.map((chip) => (
              <Pressable key={chip} style={styles.chip} onPress={() => setName(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>

          {section === 'expiry' ? (
            <>
              <Text style={styles.fieldLabel}>EXPIRES</Text>
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>{formatDate(expiryDate)}</Text>
              </View>
              <View style={styles.quickRow}>
                <Pressable style={styles.quickButton} onPress={() => setExpiryDate(addDays(todayISODate(), 7))}>
                  <Text style={styles.quickButtonText}>+1 week</Text>
                </Pressable>
                <Pressable style={styles.quickButton} onPress={() => setExpiryDate(addDays(todayISODate(), 30))}>
                  <Text style={styles.quickButtonText}>+1 month</Text>
                </Pressable>
                <Pressable style={styles.quickButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.quickButtonText}>Pick</Text>
                </Pressable>
                <Pressable style={[styles.quickButton, styles.scanButton]} onPress={() => router.push('/scan')}>
                  <Text style={[styles.quickButtonText, { color: '#fff' }]}>Scan</Text>
                </Pressable>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(`${expiryDate}T00:00:00`)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setExpiryDate(date.toISOString().slice(0, 10));
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>REPEAT EVERY (DAYS, OPTIONAL)</Text>
              <TextInput
                value={repeatDays ? String(repeatDays) : ''}
                onChangeText={(v) => setRepeatDays(v ? Number(v.replace(/[^0-9]/g, '')) : null)}
                keyboardType="number-pad"
                placeholder="e.g. 14"
                style={styles.dateRow}
              />
            </>
          )}

          <View style={styles.reminderRow}>
            <View>
              <Text style={styles.reminderTitle}>Remind me</Text>
              <Text style={styles.reminderSubtitle}>
                {section === 'expiry' ? '2 days before it expires' : 'when the repeat interval is reached'}
              </Text>
            </View>
            <Toggle value={reminderEnabled} onValueChange={setReminderEnabled} />
          </View>

          <Pressable style={styles.saveButton} onPress={save}>
            <Text style={styles.saveButtonText}>{section === 'expiry' ? 'Add to FreshKeep' : 'Add task'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,15,0.34)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.screenBg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.xl, paddingBottom: 34, maxHeight: '90%' },
  grabber: { width: 38, height: 5, borderRadius: 999, backgroundColor: colors.dashedBorder, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  link: { fontSize: 15, color: colors.primary },
  linkStrong: { fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginBottom: 8, marginTop: 20 },
  nameRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  iconButton: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  iconEditBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.screenBg },
  nameInput: { flex: 1, backgroundColor: colors.card, borderRadius: radii.md + 2, paddingHorizontal: 16, fontSize: 17, color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textFaint, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: colors.card, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  dateRow: { backgroundColor: colors.card, borderRadius: radii.md + 2, paddingHorizontal: 16, paddingVertical: 14 },
  dateText: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickButton: { flex: 1, alignItems: 'center', backgroundColor: colors.card, paddingVertical: 11, borderRadius: 11 },
  quickButtonText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  scanButton: { backgroundColor: colors.primary },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radii.md + 2, padding: 16, marginTop: 18 },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  reminderSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 16, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
