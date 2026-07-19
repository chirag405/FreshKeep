import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { colors, radii } from '@/theme/tokens';
import { AppSheet } from '@/components/AppSheet';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Switch } from '@/components/ui/switch';
import { IconTile } from '@/components/IconTile';
import { ICON_CATEGORIES, DEFAULT_EXPIRY_ICON, DEFAULT_LAST_TIME_ICON } from '@/lib/iconCatalog';
import { suggestIcon } from '@/lib/iconSuggest';
import { daysBetween, formatDate, todayISODate, toLocalISODate } from '@/lib/dateMath';
import { onDateScanned, clearScanListener } from '@/lib/ocr/scanResultChannel';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';
import { scheduleReminder } from '@/notifications';

const ALL_ICONS = ICON_CATEGORIES.flatMap((cat) => cat.icons);
const SNAP_POINTS = ['96%'];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

export default function Add() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; name?: string; expiryDate?: string; repeatDays?: string }>();
  const [section, setSection] = useState<'expiry' | 'lastTime'>(params.type === 'lastTime' ? 'lastTime' : 'expiry');

  // `name`/`expiryDate`/`repeatDays` params let Mili (and future flows)
  // open this sheet pre-filled instead of dead-ending on a weak voice parse.
  const [name, setName] = useState(params.name ?? '');
  const [icon, setIcon] = useState(section === 'expiry' ? DEFAULT_EXPIRY_ICON : DEFAULT_LAST_TIME_ICON);
  const [iconTouched, setIconTouched] = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [iconQuery, setIconQuery] = useState('');
  const [expiryDate, setExpiryDate] = useState(params.expiryDate ?? addDays(todayISODate(), 7));
  const [repeatDays, setRepeatDays] = useState<number | null>(params.repeatDays ? Number(params.repeatDays) : null);
  const [note, setNote] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addExpiryItem = useExpiryStore((s) => s.addItem);
  const addTask = useLastTimeStore((s) => s.addTask);
  const defaultReminderDaysBefore = useSettingsStore((s) => s.defaultReminderDaysBefore);
  const user = useAuthStore((s) => s.user);
  const household = useHouseholdStore((s) => s.household);
  const [destination, setDestination] = useState<'household' | 'personal'>('household');
  const householdId = user && household && destination === 'household' ? household.id : null;

  useEffect(() => {
    onDateScanned((iso) => setExpiryDate(iso));
    return () => clearScanListener();
  }, []);

  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.load);
  useEffect(() => {
    // Add is reachable directly from Home without ever visiting Settings, so
    // the settings store may not be hydrated yet — make sure it is before
    // relying on defaultReminderDaysBefore below.
    if (!settingsLoaded) loadSettings();
  }, [settingsLoaded, loadSettings]);

  const changeSection = (next: 'expiry' | 'lastTime') => {
    setSection(next);
    setIcon(next === 'expiry' ? DEFAULT_EXPIRY_ICON : DEFAULT_LAST_TIME_ICON);
    setIconTouched(false);
  };

  const displayIcon = iconTouched ? icon : suggestIcon(name, section);

  const pickIcon = (picked: string) => {
    setIcon(picked);
    setIconTouched(true);
    setPickingIcon(false);
    setIconQuery('');
  };

  const save = async (close: () => void) => {
    if (isSaving) return; // guards against duplicate inserts from a fast double-tap
    const trimmed = name.trim();
    if (!trimmed) return;
    const trimmedNote = note.trim();

    setIsSaving(true);
    try {
      if (section === 'expiry') {
        const row = await addExpiryItem({
          name: trimmed,
          icon: displayIcon,
          expiryDate,
          reminderEnabled,
          reminderDaysBefore: defaultReminderDaysBefore,
          note: trimmedNote || null,
          householdId,
        });
        if (reminderEnabled) {
          const triggerDate = new Date(`${expiryDate}T09:00:00`);
          triggerDate.setDate(triggerDate.getDate() - defaultReminderDaysBefore);
          const body = trimmedNote
            ? `${displayIcon} ${trimmed} · ${trimmedNote}`
            : `${displayIcon} ${trimmed} expires soon`;
          const scheduledId = await scheduleReminder({
            id: `expiry-${row.id}`,
            title: 'FreshKeep',
            body,
            date: triggerDate,
          });
          if (!scheduledId) {
            Alert.alert(
              'Reminder not set',
              `The reminder date is already in the past (or notifications aren't allowed), so no alert will fire. ${trimmed} was still saved.`,
            );
          }
        }
      } else {
        const row = await addTask({
          name: trimmed,
          icon: displayIcon,
          repeatIntervalDays: repeatDays,
          reminderEnabled,
          note: trimmedNote || null,
          householdId,
        });
        if (reminderEnabled && row.repeat_interval_days) {
          const triggerDate = new Date(`${row.last_done_date}T09:00:00`);
          triggerDate.setDate(triggerDate.getDate() + row.repeat_interval_days);
          const body = trimmedNote
            ? `${displayIcon} ${trimmed} · ${trimmedNote}`
            : `${displayIcon} ${row.repeat_interval_days} days since you ${trimmed.toLowerCase()}`;
          const scheduledId = await scheduleReminder({
            id: `lasttime-${row.id}`,
            title: 'FreshKeep',
            body,
            date: triggerDate,
          });
          if (!scheduledId) {
            Alert.alert(
              'Reminder not set',
              `The reminder date is already in the past (or notifications aren't allowed), so no alert will fire. ${trimmed} was still saved.`,
            );
          }
        }
      }
      close();
    } finally {
      setIsSaving(false);
    }
  };

  const trimmedIconQuery = iconQuery.trim().toLowerCase();
  const hasAnyIconMatch = !trimmedIconQuery || ALL_ICONS.some((entry) => entry.label.toLowerCase().includes(trimmedIconQuery));
  const currentIconLabel = ALL_ICONS.find((entry) => entry.icon === displayIcon)?.label ?? 'Custom icon';
  const canSave = !!name.trim() && !isSaving;
  const daysLeft = daysBetween(new Date(`${todayISODate()}T00:00:00`), new Date(`${expiryDate}T00:00:00`));

  return (
    <AppSheet
      snapPoints={SNAP_POINTS}
      header={(close) =>
        pickingIcon ? (
          <View style={styles.headerRow}>
            <Text style={styles.link} onPress={() => setPickingIcon(false)}>Cancel</Text>
            <Text style={styles.title}>Choose an icon</Text>
            <Text style={[styles.link, styles.linkStrong]} onPress={() => setPickingIcon(false)}>Done</Text>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.link} onPress={close}>Cancel</Text>
              <Text style={styles.title}>{section === 'expiry' ? 'New item' : 'New task'}</Text>
              <Text style={[styles.link, styles.linkStrong, !canSave && styles.linkDisabled]} onPress={canSave ? () => save(close) : undefined}>
                {isSaving ? 'Saving…' : 'Save'}
              </Text>
            </View>
            <SegmentedControl
              value={section}
              onChange={changeSection}
              options={[
                { label: '🥛 Expires', value: 'expiry' },
                { label: '🛏️ Last time', value: 'lastTime' },
              ]}
            />
          </>
        )
      }
    >
      {(close) =>
        pickingIcon ? (
          <>
            <View style={styles.iconSearch}>
              <Text style={{ color: colors.textFaint }}>🔍  Search icons</Text>
              <BottomSheetTextInput
                value={iconQuery}
                onChangeText={setIconQuery}
                placeholder=""
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.selectedRow}>
              <View style={styles.selectedCard}>
                <View style={styles.selectedIconWrap}>
                  <Text style={{ fontSize: 22 }}>{displayIcon}</Text>
                </View>
                <View>
                  <Text style={styles.selectedLabel}>SELECTED</Text>
                  <Text style={styles.selectedName}>{currentIconLabel}</Text>
                </View>
              </View>
            </View>

            {!hasAnyIconMatch && (
              <Text style={styles.noResults}>No icons match &quot;{iconQuery.trim()}&quot;</Text>
            )}

            {ICON_CATEGORIES.map((cat) => {
              const matches = trimmedIconQuery
                ? cat.icons.filter((entry) => entry.label.toLowerCase().includes(trimmedIconQuery))
                : cat.icons;
              if (matches.length === 0) return null;
              return (
                <View key={cat.label} style={{ marginBottom: 16 }}>
                  <Text style={styles.categoryLabel}>{cat.label.toUpperCase()}</Text>
                  <View style={styles.grid}>
                    {matches.map((entry) => (
                      <View key={entry.icon + entry.label} style={styles.gridItem}>
                        <IconTile
                          icon={entry.icon}
                          selected={entry.icon === displayIcon}
                          onPress={() => pickIcon(entry.icon)}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <>
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>NAME &amp; ICON</Text>
            <View style={styles.nameRow}>
              <Pressable style={styles.iconButton} onPress={() => setPickingIcon(true)}>
                <Text style={{ fontSize: 28 }}>{displayIcon}</Text>
                <View style={styles.iconEditBadge}>
                  <Text style={{ color: '#fff', fontSize: 10 }}>✎</Text>
                </View>
              </Pressable>
              <BottomSheetTextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                style={styles.nameInput}
              />
            </View>
            {!iconTouched && <Text style={styles.hint}>Icon picked automatically — tap it to change</Text>}

            {section === 'expiry' ? (
              <>
                <Text style={styles.fieldLabel}>EXPIRES</Text>
                <View style={[styles.dateRow, styles.dateRowBetween]}>
                  <Text style={styles.dateText}>{formatDate(expiryDate)}</Text>
                  <Text style={styles.daysChip}>
                    {daysLeft < 0 ? 'past' : daysLeft === 0 ? 'today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                  </Text>
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
                      if (date) setExpiryDate(toLocalISODate(date));
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>REPEAT EVERY (DAYS, OPTIONAL)</Text>
                <BottomSheetTextInput
                  value={repeatDays ? String(repeatDays) : ''}
                  onChangeText={(v) => setRepeatDays(v ? Number(v.replace(/[^0-9]/g, '')) : null)}
                  keyboardType="number-pad"
                  placeholder="e.g. 14"
                  style={styles.dateRow}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>NOTE (OPTIONAL)</Text>
            <BottomSheetTextInput
              value={note}
              onChangeText={setNote}
              placeholder={section === 'expiry' ? 'e.g. opened Tuesday, smells fine so far' : 'e.g. used the blue filter, spare is under the sink'}
              placeholderTextColor={colors.textFaint}
              style={styles.noteInput}
              multiline
            />
            <Text style={styles.hint}>Shown back to you when the reminder fires</Text>

            {user && household && (
              <>
                <Text style={styles.fieldLabel}>ADD TO</Text>
                <SegmentedControl
                  value={destination}
                  onChange={setDestination}
                  options={[
                    { label: `👨‍👩‍👧 ${household.name}`, value: 'household' },
                    { label: '🔒 Just me', value: 'personal' },
                  ]}
                />
              </>
            )}

            <View style={styles.reminderRow}>
              <View>
                <Text style={styles.reminderTitle}>Remind me</Text>
                <Text style={styles.reminderSubtitle}>
                  {section === 'expiry'
                    ? `${defaultReminderDaysBefore} day${defaultReminderDaysBefore === 1 ? '' : 's'} before it expires`
                    : 'when the repeat interval is reached'}
                </Text>
              </View>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </View>

            <Pressable
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={() => save(close)}
              disabled={!canSave}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving…' : section === 'expiry' ? 'Add to FreshKeep' : 'Add task'}
              </Text>
            </Pressable>
          </>
        )
      }
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  link: { fontSize: 15, color: colors.primary },
  linkStrong: { fontWeight: '600' },
  linkDisabled: { opacity: 0.5 },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginBottom: 10, marginTop: 22 },
  nameRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  iconButton: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  iconEditBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.screenBg },
  nameInput: { flex: 1, backgroundColor: colors.card, borderRadius: radii.md + 2, paddingHorizontal: 16, fontSize: 17, color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textFaint, marginTop: 8 },
  dateRow: { backgroundColor: colors.card, borderRadius: radii.md + 2, paddingHorizontal: 16, paddingVertical: 14 },
  dateRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  daysChip: { fontSize: 14, fontWeight: '700', color: colors.primary, backgroundColor: colors.successBg, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, overflow: 'hidden' },
  noteInput: { backgroundColor: colors.card, borderRadius: radii.md + 2, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.textPrimary, minHeight: 64, textAlignVertical: 'top' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickButton: { flex: 1, alignItems: 'center', backgroundColor: colors.card, paddingVertical: 11, borderRadius: 11 },
  quickButtonText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  scanButton: { backgroundColor: colors.primary },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radii.md + 2, padding: 16, marginTop: 18 },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  reminderSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 16, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  // icon picker
  iconSearch: { backgroundColor: colors.searchBg, borderRadius: radii.md, height: 38, justifyContent: 'center', paddingHorizontal: 13, marginBottom: 12 },
  selectedRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  selectedCard: { flex: 1, backgroundColor: colors.card, borderRadius: radii.md + 2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  selectedIconWrap: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  selectedLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '600' },
  selectedName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  categoryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, rowGap: 10 },
  gridItem: { width: '14.5%' },
  noResults: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 20, marginBottom: 8 },
});
