import { daysBetween, formatDaysAgo, formatExpiryCountdown } from '@/lib/dateMath';

describe('daysBetween', () => {
  it('returns 0 for the same day', () => {
    expect(daysBetween(new Date('2026-07-12T09:00:00'), new Date('2026-07-12T22:00:00'))).toBe(0);
  });

  it('returns positive days for a future date', () => {
    expect(daysBetween(new Date('2026-07-12'), new Date('2026-07-14'))).toBe(2);
  });

  it('returns negative days for a past date', () => {
    expect(daysBetween(new Date('2026-07-12'), new Date('2026-07-10'))).toBe(-2);
  });
});

describe('formatExpiryCountdown', () => {
  it('labels 0 days as Today/expires', () => {
    expect(formatExpiryCountdown(0)).toEqual({ big: 'Today', small: 'expires' });
  });

  it('labels negative days as Expired', () => {
    expect(formatExpiryCountdown(-3)).toEqual({ big: 'Expired', small: '3 days ago' });
  });

  it('labels positive days as "N days"/left', () => {
    expect(formatExpiryCountdown(5)).toEqual({ big: '5 days', small: 'left' });
  });
});

describe('formatDaysAgo', () => {
  it('formats 0 as today', () => {
    expect(formatDaysAgo(0)).toBe('today');
  });
  it('formats plural days', () => {
    expect(formatDaysAgo(12)).toBe('12 days ago');
  });
  it('formats singular day', () => {
    expect(formatDaysAgo(1)).toBe('1 day ago');
  });
});
