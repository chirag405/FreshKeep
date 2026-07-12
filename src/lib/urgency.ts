export type ExpiryBucketKey = 'needsAttention' | 'thisWeek' | 'fineForNow';
export type LastTimeBucketKey = 'overdue' | 'dueSoon' | 'onTrack';

const NEEDS_ATTENTION_MAX_DAYS = 2;
const THIS_WEEK_MAX_DAYS = 7;
const DUE_SOON_WINDOW_DAYS = 3;

export function bucketExpiryDaysLeft(daysLeft: number): ExpiryBucketKey {
  if (daysLeft <= NEEDS_ATTENTION_MAX_DAYS) return 'needsAttention';
  if (daysLeft <= THIS_WEEK_MAX_DAYS) return 'thisWeek';
  return 'fineForNow';
}

export function bucketLastTimeStatus(daysSince: number, repeatIntervalDays: number | null): LastTimeBucketKey {
  if (repeatIntervalDays == null) return 'onTrack';
  const daysUntilDue = repeatIntervalDays - daysSince;
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return 'dueSoon';
  return 'onTrack';
}

export function lastTimeProgress(daysSince: number, repeatIntervalDays: number): number {
  const pct = Math.round((daysSince / repeatIntervalDays) * 100);
  return Math.max(0, Math.min(100, pct));
}
