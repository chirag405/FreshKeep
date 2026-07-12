jest.mock('@/db/expiryItems');

import { useExpiryStore, getExpiryBuckets } from '@/store/expiryStore';
import * as repo from '@/db/expiryItems';
import type { ExpiryItemRow } from '@/db/client';
import { todayISODate } from '@/lib/dateMath';

const mockRepo = repo as jest.Mocked<typeof repo>;

const rowFixture = (overrides: Partial<ExpiryItemRow>): ExpiryItemRow => ({
  id: 'x1',
  name: 'Milk',
  icon: '🥛',
  expiry_date: '2026-07-14',
  added_date: '2026-07-06',
  opened_date: null,
  location: 'Fridge',
  reminder_enabled: 0,
  reminder_days_before: 2,
  updated_at: '2026-07-06T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  useExpiryStore.setState({ items: [], hydrated: false });
});

describe('useExpiryStore', () => {
  it('hydrates from the repository', async () => {
    mockRepo.listExpiryItems.mockResolvedValue([rowFixture({})]);
    await useExpiryStore.getState().hydrate();
    expect(useExpiryStore.getState().items).toHaveLength(1);
    expect(useExpiryStore.getState().hydrated).toBe(true);
  });

  it('addItem inserts, refreshes from the repository, and returns the inserted row', async () => {
    mockRepo.insertExpiryItem.mockResolvedValue(rowFixture({ id: 'new' }));
    mockRepo.listExpiryItems.mockResolvedValue([rowFixture({ id: 'new' })]);
    const row = await useExpiryStore.getState().addItem({ name: 'Milk', icon: '🥛', expiryDate: '2026-07-14' });
    expect(mockRepo.insertExpiryItem).toHaveBeenCalledWith({ name: 'Milk', icon: '🥛', expiryDate: '2026-07-14' });
    expect(row.id).toBe('new');
    expect(useExpiryStore.getState().items).toHaveLength(1);
  });

  it('removeItem deletes then refreshes', async () => {
    mockRepo.listExpiryItems.mockResolvedValue([]);
    await useExpiryStore.getState().removeItem('x1');
    expect(mockRepo.deleteExpiryItem).toHaveBeenCalledWith('x1');
    expect(useExpiryStore.getState().items).toHaveLength(0);
  });
});

describe('getExpiryBuckets', () => {
  it('buckets items relative to today', () => {
    const today = todayISODate();
    const buckets = getExpiryBuckets([rowFixture({ expiry_date: today })]);
    expect(buckets.needsAttention).toHaveLength(1);
    expect(buckets.thisWeek).toHaveLength(0);
    expect(buckets.fineForNow).toHaveLength(0);
  });
});
