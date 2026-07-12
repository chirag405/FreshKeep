import { getDb, type LastTimeTaskRow } from '@/db/client';
import { generateId } from '@/lib/id';
import { todayISODate, nowISODateTime } from '@/lib/dateMath';
import { pushLastTimeTask, pushLastTimeTaskDelete } from '@/sync';

export type NewLastTimeTask = {
  name: string;
  icon: string;
  lastDoneDate?: string;
  repeatIntervalDays?: number | null;
  reminderEnabled?: boolean;
};

export async function listLastTimeTasks(): Promise<LastTimeTaskRow[]> {
  return getDb().getAllAsync<LastTimeTaskRow>('SELECT * FROM last_time_tasks ORDER BY last_done_date ASC');
}

export async function insertLastTimeTask(input: NewLastTimeTask): Promise<LastTimeTaskRow> {
  const row: LastTimeTaskRow = {
    id: generateId(),
    name: input.name,
    icon: input.icon,
    last_done_date: input.lastDoneDate ?? todayISODate(),
    repeat_interval_days: input.repeatIntervalDays ?? null,
    reminder_enabled: input.reminderEnabled ? 1 : 0,
    updated_at: nowISODateTime(),
  };
  await getDb().runAsync(
    `INSERT INTO last_time_tasks
      (id, name, icon, last_done_date, repeat_interval_days, reminder_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.name, row.icon, row.last_done_date, row.repeat_interval_days, row.reminder_enabled, row.updated_at],
  );
  void pushLastTimeTask(row);
  return row;
}

export async function updateLastTimeTask(id: string, patch: Partial<NewLastTimeTask>): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.icon !== undefined) { fields.push('icon = ?'); values.push(patch.icon); }
  if (patch.lastDoneDate !== undefined) { fields.push('last_done_date = ?'); values.push(patch.lastDoneDate); }
  if (patch.repeatIntervalDays !== undefined) { fields.push('repeat_interval_days = ?'); values.push(patch.repeatIntervalDays); }
  if (patch.reminderEnabled !== undefined) { fields.push('reminder_enabled = ?'); values.push(patch.reminderEnabled ? 1 : 0); }
  if (fields.length === 0) return;
  const updatedAt = nowISODateTime();
  fields.push('updated_at = ?');
  values.push(updatedAt);
  values.push(id);
  await getDb().runAsync(`UPDATE last_time_tasks SET ${fields.join(', ')} WHERE id = ?`, values);

  const row = await getDb().getFirstAsync<LastTimeTaskRow>('SELECT * FROM last_time_tasks WHERE id = ?', [id]);
  if (row) void pushLastTimeTask(row);
}

export async function markLastTimeTaskDoneNow(id: string): Promise<void> {
  const updatedAt = nowISODateTime();
  await getDb().runAsync('UPDATE last_time_tasks SET last_done_date = ?, updated_at = ? WHERE id = ?', [todayISODate(), updatedAt, id]);
  const row = await getDb().getFirstAsync<LastTimeTaskRow>('SELECT * FROM last_time_tasks WHERE id = ?', [id]);
  if (row) void pushLastTimeTask(row);
}

export async function deleteLastTimeTask(id: string): Promise<void> {
  await getDb().runAsync('DELETE FROM last_time_tasks WHERE id = ?', [id]);
  void pushLastTimeTaskDelete(id);
}
