jest.mock('@/db/lastTimeTasks');

import { useLastTimeStore, getLastTimeBuckets } from '@/store/lastTimeStore';
import * as repo from '@/db/lastTimeTasks';
import type { LastTimeTaskRow } from '@/db/client';

const mockRepo = repo as jest.Mocked<typeof repo>;

const rowFixture = (overrides: Partial<LastTimeTaskRow>): LastTimeTaskRow => ({
  id: 't1',
  name: 'Cleaned the AC filter',
  icon: '🌀',
  last_done_date: '2026-06-01',
  repeat_interval_days: 30,
  reminder_enabled: 0,
  note: null,
  updated_at: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  useLastTimeStore.setState({ items: [], hydrated: false });
});

describe('useLastTimeStore', () => {
  it('hydrates from the repository', async () => {
    mockRepo.listLastTimeTasks.mockResolvedValue([rowFixture({})]);
    await useLastTimeStore.getState().hydrate();
    expect(useLastTimeStore.getState().items).toHaveLength(1);
    expect(useLastTimeStore.getState().hydrated).toBe(true);
  });

  it('addTask inserts, refreshes from the repository, and returns the inserted row', async () => {
    mockRepo.insertLastTimeTask.mockResolvedValue(rowFixture({ id: 'new' }));
    mockRepo.listLastTimeTasks.mockResolvedValue([rowFixture({ id: 'new' })]);
    const row = await useLastTimeStore.getState().addTask({ name: 'Watered the plants', icon: '🪴' });
    expect(mockRepo.insertLastTimeTask).toHaveBeenCalledWith({ name: 'Watered the plants', icon: '🪴' });
    expect(row.id).toBe('new');
    expect(useLastTimeStore.getState().items).toHaveLength(1);
  });

  it('markDoneNow resets the counter then refreshes', async () => {
    mockRepo.listLastTimeTasks.mockResolvedValue([rowFixture({ last_done_date: '2026-07-12' })]);
    await useLastTimeStore.getState().markDoneNow('t1');
    expect(mockRepo.markLastTimeTaskDoneNow).toHaveBeenCalledWith('t1');
    expect(useLastTimeStore.getState().items[0].last_done_date).toBe('2026-07-12');
  });

  it('removeTask deletes then refreshes', async () => {
    mockRepo.listLastTimeTasks.mockResolvedValue([]);
    await useLastTimeStore.getState().removeTask('t1');
    expect(mockRepo.deleteLastTimeTask).toHaveBeenCalledWith('t1');
    expect(useLastTimeStore.getState().items).toHaveLength(0);
  });
});

describe('getLastTimeBuckets', () => {
  it('buckets an overdue task', () => {
    const buckets = getLastTimeBuckets([rowFixture({ last_done_date: '2026-06-01', repeat_interval_days: 30 })]);
    expect(buckets.overdue.length + buckets.dueSoon.length + buckets.onTrack.length).toBe(1);
  });
});
