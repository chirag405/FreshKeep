import { create } from 'zustand';

import * as repo from '@/db/expiryItems';
import type { NewExpiryItem } from '@/db/expiryItems';
import type { ExpiryItemRow } from '@/db/client';
import { daysBetween, todayISODate } from '@/lib/dateMath';
import { bucketExpiryDaysLeft, type ExpiryBucketKey } from '@/lib/urgency';

type ExpiryState = {
  items: ExpiryItemRow[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addItem: (input: NewExpiryItem) => Promise<ExpiryItemRow>;
  updateItem: (id: string, patch: Partial<NewExpiryItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
};

async function refresh(set: (partial: Partial<ExpiryState>) => void) {
  const items = await repo.listExpiryItems();
  set({ items });
}

export const useExpiryStore = create<ExpiryState>((set) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    const items = await repo.listExpiryItems();
    set({ items, hydrated: true });
  },
  addItem: async (input) => {
    const row = await repo.insertExpiryItem(input);
    await refresh(set);
    return row;
  },
  updateItem: async (id, patch) => {
    await repo.updateExpiryItem(id, patch);
    await refresh(set);
  },
  removeItem: async (id) => {
    await repo.deleteExpiryItem(id);
    await refresh(set);
  },
}));

export function getExpiryBuckets(items: ExpiryItemRow[]): Record<ExpiryBucketKey, ExpiryItemRow[]> {
  const today = new Date(`${todayISODate()}T00:00:00`);
  const buckets: Record<ExpiryBucketKey, ExpiryItemRow[]> = { needsAttention: [], thisWeek: [], fineForNow: [] };
  for (const item of items) {
    const daysLeft = daysBetween(today, new Date(`${item.expiry_date}T00:00:00`));
    buckets[bucketExpiryDaysLeft(daysLeft)].push(item);
  }
  return buckets;
}
