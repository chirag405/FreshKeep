import { getDb, type ExpiryItemRow } from '@/db/client';
import { generateId } from '@/lib/id';
import { todayISODate, nowISODateTime } from '@/lib/dateMath';
import { pushExpiryItem, pushExpiryItemDelete } from '@/sync';

export type NewExpiryItem = {
  name: string;
  icon: string;
  expiryDate: string;
  openedDate?: string | null;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  note?: string | null;
};

export async function listExpiryItems(): Promise<ExpiryItemRow[]> {
  return getDb().getAllAsync<ExpiryItemRow>('SELECT * FROM expiry_items ORDER BY expiry_date ASC');
}

export async function insertExpiryItem(input: NewExpiryItem): Promise<ExpiryItemRow> {
  const row: ExpiryItemRow = {
    id: generateId(),
    name: input.name,
    icon: input.icon,
    expiry_date: input.expiryDate,
    added_date: todayISODate(),
    opened_date: input.openedDate ?? null,
    reminder_enabled: input.reminderEnabled ? 1 : 0,
    reminder_days_before: input.reminderDaysBefore ?? 2,
    note: input.note ?? null,
    updated_at: nowISODateTime(),
  };
  await getDb().runAsync(
    `INSERT INTO expiry_items
      (id, name, icon, expiry_date, added_date, opened_date, reminder_enabled, reminder_days_before, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.name, row.icon, row.expiry_date, row.added_date, row.opened_date, row.reminder_enabled, row.reminder_days_before, row.note, row.updated_at],
  );
  void pushExpiryItem(row);
  return row;
}

export async function updateExpiryItem(id: string, patch: Partial<NewExpiryItem>): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.icon !== undefined) { fields.push('icon = ?'); values.push(patch.icon); }
  if (patch.expiryDate !== undefined) { fields.push('expiry_date = ?'); values.push(patch.expiryDate); }
  if (patch.openedDate !== undefined) { fields.push('opened_date = ?'); values.push(patch.openedDate); }
  if (patch.reminderEnabled !== undefined) { fields.push('reminder_enabled = ?'); values.push(patch.reminderEnabled ? 1 : 0); }
  if (patch.reminderDaysBefore !== undefined) { fields.push('reminder_days_before = ?'); values.push(patch.reminderDaysBefore); }
  if (patch.note !== undefined) { fields.push('note = ?'); values.push(patch.note); }
  if (fields.length === 0) return;
  const updatedAt = nowISODateTime();
  fields.push('updated_at = ?');
  values.push(updatedAt);
  values.push(id);
  await getDb().runAsync(`UPDATE expiry_items SET ${fields.join(', ')} WHERE id = ?`, values);

  const row = await getDb().getFirstAsync<ExpiryItemRow>('SELECT * FROM expiry_items WHERE id = ?', [id]);
  if (row) void pushExpiryItem(row);
}

export async function deleteExpiryItem(id: string): Promise<void> {
  await getDb().runAsync('DELETE FROM expiry_items WHERE id = ?', [id]);
  void pushExpiryItemDelete(id);
}
