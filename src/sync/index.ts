import { supabase } from '@/lib/supabaseClient';
import { getDb, type ExpiryItemRow, type LastTimeTaskRow } from '@/db/client';
import { useAuthStore } from '@/store/authStore';

/**
 * Cloud sync is a Premium feature: free-tier users' data never leaves the
 * device. Every function here is a no-op unless the user is signed in AND
 * flagged premium (see supabase/README.md for how that flag gets set).
 */
function syncableUserId(): string | null {
  const { user, isPremium } = useAuthStore.getState();
  return user && isPremium ? user.id : null;
}

export async function pushExpiryItem(row: ExpiryItemRow): Promise<void> {
  const userId = syncableUserId();
  if (!userId) return;
  const { error } = await supabase.from('expiry_items').upsert({
    id: row.id,
    user_id: userId,
    name: row.name,
    icon: row.icon,
    expiry_date: row.expiry_date,
    added_date: row.added_date,
    opened_date: row.opened_date,
    reminder_enabled: Boolean(row.reminder_enabled),
    reminder_days_before: row.reminder_days_before,
    note: row.note,
    updated_at: row.updated_at,
  });
  if (error) console.error('[sync] failed to push expiry item', row.id, error.message);
}

export async function pushExpiryItemDelete(id: string): Promise<void> {
  const userId = syncableUserId();
  if (!userId) return;
  const { error } = await supabase.from('expiry_items').delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('[sync] failed to push expiry item delete', id, error.message);
}

export async function pushLastTimeTask(row: LastTimeTaskRow): Promise<void> {
  const userId = syncableUserId();
  if (!userId) return;
  const { error } = await supabase.from('last_time_tasks').upsert({
    id: row.id,
    user_id: userId,
    name: row.name,
    icon: row.icon,
    last_done_date: row.last_done_date,
    repeat_interval_days: row.repeat_interval_days,
    reminder_enabled: Boolean(row.reminder_enabled),
    note: row.note,
    updated_at: row.updated_at,
  });
  if (error) console.error('[sync] failed to push last-time task', row.id, error.message);
}

export async function pushLastTimeTaskDelete(id: string): Promise<void> {
  const userId = syncableUserId();
  if (!userId) return;
  const { error } = await supabase.from('last_time_tasks').delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('[sync] failed to push last-time task delete', id, error.message);
}

type RemoteExpiryRow = Omit<ExpiryItemRow, 'reminder_enabled'> & { reminder_enabled: boolean };
type RemoteTaskRow = Omit<LastTimeTaskRow, 'reminder_enabled'> & { reminder_enabled: boolean };

async function mergeRemoteExpiryItem(db: ReturnType<typeof getDb>, r: RemoteExpiryRow): Promise<void> {
  const local = await db.getFirstAsync<ExpiryItemRow>('SELECT * FROM expiry_items WHERE id = ?', [r.id]);
  if (!local || new Date(r.updated_at) > new Date(local.updated_at)) {
    await db.runAsync(
      `INSERT INTO expiry_items (id, name, icon, expiry_date, added_date, opened_date, reminder_enabled, reminder_days_before, note, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, expiry_date=excluded.expiry_date,
         added_date=excluded.added_date, opened_date=excluded.opened_date,
         reminder_enabled=excluded.reminder_enabled, reminder_days_before=excluded.reminder_days_before, note=excluded.note, updated_at=excluded.updated_at`,
      [r.id, r.name, r.icon, r.expiry_date, r.added_date, r.opened_date, r.reminder_enabled ? 1 : 0, r.reminder_days_before, r.note, r.updated_at],
    );
  }
}

async function mergeRemoteLastTimeTask(db: ReturnType<typeof getDb>, r: RemoteTaskRow): Promise<void> {
  const local = await db.getFirstAsync<LastTimeTaskRow>('SELECT * FROM last_time_tasks WHERE id = ?', [r.id]);
  if (!local || new Date(r.updated_at) > new Date(local.updated_at)) {
    await db.runAsync(
      `INSERT INTO last_time_tasks (id, name, icon, last_done_date, repeat_interval_days, reminder_enabled, note, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, last_done_date=excluded.last_done_date,
         repeat_interval_days=excluded.repeat_interval_days, reminder_enabled=excluded.reminder_enabled, note=excluded.note, updated_at=excluded.updated_at`,
      [r.id, r.name, r.icon, r.last_done_date, r.repeat_interval_days, r.reminder_enabled ? 1 : 0, r.note, r.updated_at],
    );
  }
}

/**
 * Two-way, last-write-wins merge by `updated_at`, run once after sign-in (and
 * safe to re-run on app foreground, or manually via Settings' "Sync now").
 * Remote rows newer than the local copy overwrite it; local rows newer than
 * (or absent from) remote get pushed up — including, deliberately, the very
 * first run after upgrading to Premium: every pre-existing local row is
 * "absent from remote" at that point, so it all uploads in one pass.
 *
 * Every row is handled independently (try/catch per row) so one bad row
 * (a network blip, a rejected write) can't abort the whole sync and leave
 * a caller's `await pullAndMergeAll()` hanging forever — see the callers in
 * src/app/_layout.tsx and src/app/settings.tsx, which both gate UI state on
 * this promise settling.
 *
 * Known simplification: a delete on one device does not propagate to other
 * devices in this phase (no tombstones) — acceptable for v1 per the product
 * spec's "keep it simple" rule; revisit if it becomes a real complaint.
 */
export async function pullAndMergeAll(): Promise<void> {
  const userId = syncableUserId();
  if (!userId) return;
  const db = getDb();

  let remoteItemList: RemoteExpiryRow[] = [];
  let remoteTaskList: RemoteTaskRow[] = [];
  try {
    const [{ data: remoteItems, error: itemsError }, { data: remoteTasks, error: tasksError }] = await Promise.all([
      supabase.from('expiry_items').select('*').eq('user_id', userId),
      supabase.from('last_time_tasks').select('*').eq('user_id', userId),
    ]);
    if (itemsError) console.error('[sync] failed to fetch remote expiry items', itemsError.message);
    if (tasksError) console.error('[sync] failed to fetch remote last-time tasks', tasksError.message);
    remoteItemList = (remoteItems ?? []) as RemoteExpiryRow[];
    remoteTaskList = (remoteTasks ?? []) as RemoteTaskRow[];
  } catch (error) {
    console.error('[sync] failed to reach Supabase, skipping this sync pass', error);
    return;
  }

  for (const r of remoteItemList) {
    try {
      await mergeRemoteExpiryItem(db, r);
    } catch (error) {
      console.error('[sync] failed to merge remote expiry item', r.id, error);
    }
  }

  for (const r of remoteTaskList) {
    try {
      await mergeRemoteLastTimeTask(db, r);
    } catch (error) {
      console.error('[sync] failed to merge remote last-time task', r.id, error);
    }
  }

  const remoteItemIds = new Map(remoteItemList.map((r) => [r.id, r]));
  try {
    const localItems = await db.getAllAsync<ExpiryItemRow>('SELECT * FROM expiry_items');
    for (const local of localItems) {
      const remote = remoteItemIds.get(local.id);
      if (!remote || new Date(local.updated_at) > new Date(remote.updated_at)) {
        await pushExpiryItem(local);
      }
    }
  } catch (error) {
    console.error('[sync] failed to push local expiry items', error);
  }

  const remoteTaskIds = new Map(remoteTaskList.map((r) => [r.id, r]));
  try {
    const localTasks = await db.getAllAsync<LastTimeTaskRow>('SELECT * FROM last_time_tasks');
    for (const local of localTasks) {
      const remote = remoteTaskIds.get(local.id);
      if (!remote || new Date(local.updated_at) > new Date(remote.updated_at)) {
        await pushLastTimeTask(local);
      }
    }
  } catch (error) {
    console.error('[sync] failed to push local last-time tasks', error);
  }
}
