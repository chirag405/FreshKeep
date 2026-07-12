const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(diff / MS_PER_DAY);
}

export function nowISODateTime(): string {
  return new Date().toISOString();
}

export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatExpiryCountdown(daysLeft: number): { big: string; small: string } {
  if (daysLeft < 0) {
    const overdue = Math.abs(daysLeft);
    return { big: 'Expired', small: `${overdue} day${overdue === 1 ? '' : 's'} ago` };
  }
  if (daysLeft === 0) {
    return { big: 'Today', small: 'expires' };
  }
  if (daysLeft === 1) {
    return { big: 'Tomorrow', small: 'expires' };
  }
  return { big: `${daysLeft} days`, small: 'left' };
}

export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
