import { create } from 'zustand';
import { getDb, type AppSettingsRow } from '@/db/client';

type SettingsState = {
  loaded: boolean;
  defaultReminderDaysBefore: number;
  notificationSoundEnabled: boolean;
  appLockEnabled: boolean;
  load: () => Promise<void>;
  setDefaultReminderDaysBefore: (days: number) => Promise<void>;
  setNotificationSoundEnabled: (enabled: boolean) => Promise<void>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  loaded: false,
  defaultReminderDaysBefore: 2,
  notificationSoundEnabled: true,
  appLockEnabled: false,
  load: async () => {
    const row = await getDb().getFirstAsync<AppSettingsRow>('SELECT * FROM app_settings WHERE id = 1');
    if (row) {
      set({
        loaded: true,
        defaultReminderDaysBefore: row.default_reminder_days_before,
        notificationSoundEnabled: !!row.notification_sound_enabled,
        appLockEnabled: !!row.app_lock_enabled,
      });
    }
  },
  setDefaultReminderDaysBefore: async (days) => {
    await getDb().runAsync('UPDATE app_settings SET default_reminder_days_before = ? WHERE id = 1', [days]);
    set({ defaultReminderDaysBefore: days });
  },
  setNotificationSoundEnabled: async (enabled) => {
    await getDb().runAsync('UPDATE app_settings SET notification_sound_enabled = ? WHERE id = 1', [enabled ? 1 : 0]);
    set({ notificationSoundEnabled: enabled });
  },
  setAppLockEnabled: async (enabled) => {
    await getDb().runAsync('UPDATE app_settings SET app_lock_enabled = ? WHERE id = 1', [enabled ? 1 : 0]);
    set({ appLockEnabled: enabled });
  },
}));
