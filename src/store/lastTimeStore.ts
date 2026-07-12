import { create } from 'zustand';

import * as repo from '@/db/lastTimeTasks';
import type { NewLastTimeTask } from '@/db/lastTimeTasks';
import type { LastTimeTaskRow } from '@/db/client';
import { daysBetween, todayISODate } from '@/lib/dateMath';
import { bucketLastTimeStatus, type LastTimeBucketKey } from '@/lib/urgency';

type LastTimeState = {
  items: LastTimeTaskRow[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addTask: (input: NewLastTimeTask) => Promise<LastTimeTaskRow>;
  updateTask: (id: string, patch: Partial<NewLastTimeTask>) => Promise<void>;
  markDoneNow: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
};

async function refresh(set: (partial: Partial<LastTimeState>) => void) {
  const items = await repo.listLastTimeTasks();
  set({ items });
}

export const useLastTimeStore = create<LastTimeState>((set) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    const items = await repo.listLastTimeTasks();
    set({ items, hydrated: true });
  },
  addTask: async (input) => {
    const row = await repo.insertLastTimeTask(input);
    await refresh(set);
    return row;
  },
  updateTask: async (id, patch) => {
    await repo.updateLastTimeTask(id, patch);
    await refresh(set);
  },
  markDoneNow: async (id) => {
    await repo.markLastTimeTaskDoneNow(id);
    await refresh(set);
  },
  removeTask: async (id) => {
    await repo.deleteLastTimeTask(id);
    await refresh(set);
  },
}));

export function getLastTimeBuckets(items: LastTimeTaskRow[]): Record<LastTimeBucketKey, LastTimeTaskRow[]> {
  const today = new Date(`${todayISODate()}T00:00:00`);
  const buckets: Record<LastTimeBucketKey, LastTimeTaskRow[]> = { overdue: [], dueSoon: [], onTrack: [] };
  for (const task of items) {
    const daysSince = daysBetween(new Date(`${task.last_done_date}T00:00:00`), today);
    buckets[bucketLastTimeStatus(daysSince, task.repeat_interval_days)].push(task);
  }
  return buckets;
}
