import { bucketExpiryDaysLeft, bucketLastTimeStatus, lastTimeProgress } from '@/lib/urgency';

describe('bucketExpiryDaysLeft', () => {
  it('buckets 0-2 days as needsAttention', () => {
    expect(bucketExpiryDaysLeft(0)).toBe('needsAttention');
    expect(bucketExpiryDaysLeft(2)).toBe('needsAttention');
    expect(bucketExpiryDaysLeft(-1)).toBe('needsAttention');
  });
  it('buckets 3-7 days as thisWeek', () => {
    expect(bucketExpiryDaysLeft(3)).toBe('thisWeek');
    expect(bucketExpiryDaysLeft(7)).toBe('thisWeek');
  });
  it('buckets 8+ days as fineForNow', () => {
    expect(bucketExpiryDaysLeft(8)).toBe('fineForNow');
    expect(bucketExpiryDaysLeft(18)).toBe('fineForNow');
  });
});

describe('bucketLastTimeStatus', () => {
  it('has no interval => onTrack', () => {
    expect(bucketLastTimeStatus(3, null)).toBe('onTrack');
  });
  it('overdue when daysSince exceeds interval', () => {
    expect(bucketLastTimeStatus(41, 30)).toBe('overdue');
  });
  it('dueSoon when within 3 days of the interval', () => {
    expect(bucketLastTimeStatus(12, 14)).toBe('dueSoon');
  });
  it('onTrack when well within the interval', () => {
    expect(bucketLastTimeStatus(32, 90)).toBe('onTrack');
  });
});

describe('lastTimeProgress', () => {
  it('caps at 100', () => {
    expect(lastTimeProgress(41, 30)).toBe(100);
  });
  it('computes a percentage', () => {
    expect(lastTimeProgress(12, 14)).toBe(86);
    expect(lastTimeProgress(32, 90)).toBe(36);
  });
  it('returns 100 when repeatIntervalDays is 0 or negative (avoids NaN)', () => {
    expect(lastTimeProgress(0, 0)).toBe(100);
    expect(lastTimeProgress(5, -1)).toBe(100);
  });
});
