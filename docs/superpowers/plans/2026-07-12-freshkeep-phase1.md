# FreshKeep Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully working, offline, single-device Expo app matching screens S3–S8 of `FreshKeep product specification-handoff/freshkeep-product-specification/project/FreshKeep.dc.html` (Home/Expiring, Home/Last-time, Add, Choose icon, Item/Task detail, Settings), per `docs/superpowers/specs/2026-07-12-freshkeep-phase1-design.md`.

**Architecture:** Expo Router (file-based nav) under `src/app/`, `expo-sqlite` for local persistence with a schema shaped like the future Supabase tables, thin repository modules wrapping SQL, Zustand stores that hydrate from the repositories and expose bucketed/derived lists, plain `StyleSheet` + a shared token file for styling, `expo-notifications` for local reminders, `expo-local-authentication` for the app-lock toggle.

**Tech Stack:** Expo SDK 57, TypeScript, expo-router, expo-sqlite, zustand, expo-notifications, expo-local-authentication, jest-expo + @testing-library/react-native for tests.

## Global Constraints

- All app code lives under `src/` (already the scaffold convention — `src/app` is the router root).
- Path alias `@/*` → `src/*` is already configured by the scaffold (`tsconfig.json`); use it in all new imports instead of relative `../../..` chains.
- Colors/spacing/type must match the mockup exactly — pull every value from `FreshKeep product specification-handoff/freshkeep-product-specification/project/FreshKeep.dc.html`, never invent a new shade.
- No network calls anywhere in this phase. Anything auth/billing/OCR/sync-shaped is a visual stub only.
- Every screen must render correctly on both iOS and Android (test in Expo Go / dev client for both if available; at minimum reason through `Platform.select` usage).
- Repository modules (`src/db/*.ts`) wrap `expo-sqlite` directly and are **not** unit tested (native module, can't run under Jest/Node) — verified by manual on-device run in the final task instead. Everything built on top of them (stores, lib functions) is unit tested by mocking the repository module with `jest.mock`.
- Money/complex-format Intl APIs are unavailable in Hermes without polyfill — do not use `Intl.RelativeTimeFormat`; hand-roll date math (this codebase already needs custom "days ago"/"days left" formatting anyway).

---

### Task 1: Strip demo scaffold, add dependencies, theme tokens, root shell

**Files:**
- Delete: `src/components/animated-icon.tsx`, `src/components/animated-icon.module.css`, `src/components/animated-icon.web.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`, `src/components/web-badge.tsx`, `src/components/hint-row.tsx`, `src/components/external-link.tsx`, `src/components/ui/collapsible.tsx`, `src/app/explore.tsx`, `src/global.css`
- Modify: `package.json`, `app.json`, `src/app/_layout.tsx`, `src/app/index.tsx`, `src/constants/theme.ts` (replace contents)
- Create: `jest.config.js`, `jest.setup.ts`

**Interfaces:**
- Produces: `src/theme/tokens.ts` exporting `colors`, `spacing`, `radii`, `shadow` — every later task's styling imports from here.
- Produces: a root `Stack` in `src/app/_layout.tsx` with routes `index`, `item/[id]`, `settings`, `add` (modal), `choose-icon` (modal), `login`, `verify`, `premium` — later tasks fill in each route's content.

- [ ] **Step 1: Remove demo-only files**

```bash
cd "C:\Users\chira\Downloads\freshkeep"
rm -f src/components/animated-icon.tsx src/components/animated-icon.module.css src/components/animated-icon.web.tsx
rm -f src/components/app-tabs.tsx src/components/app-tabs.web.tsx src/components/web-badge.tsx src/components/hint-row.tsx src/components/external-link.tsx
rm -rf src/components/ui
rm -f src/app/explore.tsx src/global.css
```

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npx expo install zustand expo-sqlite expo-notifications expo-local-authentication
npm install --save-dev jest-expo jest @testing-library/react-native @types/jest react-test-renderer
```

- [ ] **Step 3: Add test script and jest config**

Add to `package.json` `"scripts"`: `"test": "jest"`.

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: [],
  setupFiles: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

Create `jest.setup.ts`:

```ts
// Placeholder for global test setup (mocks added by later tasks as needed).
export {};
```

- [ ] **Step 4: Replace theme constants with FreshKeep design tokens**

Replace `src/constants/theme.ts` entirely with a re-export shim (kept only because the scaffold's other files may still import it — check with grep and delete this file instead if nothing references it after Task 1's deletions):

```bash
grep -rl "constants/theme" src --include="*.tsx" --include="*.ts" | grep -v "constants/theme.ts"
```

If nothing references it, delete `src/constants/theme.ts`. If something still references it (e.g. `src/hooks/use-theme.ts`), keep it but simplify to just re-export from the new token file once Task created it — for Phase 1 delete `src/hooks/use-theme.ts` and `src/hooks/use-color-scheme.ts`/`.web.ts` too, since FreshKeep does not use a light/dark toggle (only two screens are permanently dark by design, not via system theme):

```bash
rm -f src/constants/theme.ts src/hooks/use-theme.ts src/hooks/use-color-scheme.ts src/hooks/use-color-scheme.web.ts
```

- [ ] **Step 5: Create the design token file**

Create `src/theme/tokens.ts`:

```ts
export const colors = {
  canvasBg: '#E9E6DE',
  screenBg: '#F4F2EC',
  card: '#FFFFFF',
  textPrimary: '#12211B',
  textSecondary: '#4B514C',
  textMuted: '#8A908B',
  textFaint: '#9AA09B',
  textFaint2: '#7A807B',
  divider: '#EFEDE5',
  chipTrackBg: '#E4E1D7',
  chipActiveBg: '#FFFFFF',
  searchBg: '#E7E4DB',
  dashedBorder: '#CFCCC2',
  primary: '#157A5B',
  primaryDark: '#0F5A44',
  primaryShadow: 'rgba(21,122,91,0.4)',

  danger: '#E0483D',
  dangerBg: '#FBEAE8',
  dangerText: '#C43F35',
  dangerTextAlt: '#C05348',
  dangerLabel: '#B84B41',

  warning: '#E8A23D',
  warningBg: '#FBF3E4',
  warningText: '#C9871F',
  warningLabel: '#B98428',

  success: '#2E9E6B',
  successBg: '#EAF4EE',
  successText: '#3E8E64',

  toggleOn: '#2E9E6B',
  gold: '#E8C15A',
  goldText: '#3A2B00',

  iconTileBlue: '#EEF3F6',
  iconTileTan: '#F3EEE6',
  iconTilePurple: '#F1EEFA',

  dark: {
    gradientTop: '#123328',
    gradientMid: '#07120E',
    gradientBottom: '#05100C',
    text: '#FFFFFF',
    textDim: 'rgba(255,255,255,0.55)',
    textFaint: 'rgba(255,255,255,0.45)',
    fieldBg: 'rgba(255,255,255,0.1)',
    fieldBorder: 'rgba(255,255,255,0.14)',
    accentMint: '#2FBB84',
    accentMintSoft: '#7FDCB6',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 15,
  xl: 18,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#14281E',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryButton: {
    shadowColor: '#157A5B',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;
```

- [ ] **Step 6: Replace the root layout**

Replace `src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { migrate } from '@/db/client';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    migrate();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="choose-icon" options={{ presentation: 'modal' }} />
      <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="verify" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
```

This references `@/db/client` (Task 2) — leave `src/app/index.tsx` as a temporary placeholder for now so the app still boots:

```tsx
import { Text, View } from 'react-native';
import { colors } from '@/theme/tokens';

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' }}>
      <Text>FreshKeep — Home (Task 11 builds this)</Text>
    </View>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Strip demo scaffold, add deps, add design tokens and root layout shell"
```

---

### Task 2: SQLite schema, client, and migration

**Files:**
- Create: `src/db/client.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `getDb(): SQLite.SQLiteDatabase`, `migrate(): void`, `setTestDb(db: SQLite.SQLiteDatabase | null): void` (test-only escape hatch — not used since repositories aren't unit tested per Global Constraints, but kept minimal/no-op safe for future use). Row shapes: `ExpiryItemRow`, `LastTimeTaskRow` (exported from this file, re-used by `src/db/expiryItems.ts` and `src/db/lastTimeTasks.ts` in Tasks 5/6).

- [ ] **Step 1: Write the schema/client module**

Create `src/db/client.ts`:

```ts
import * as SQLite from 'expo-sqlite';

export type ExpiryItemRow = {
  id: string;
  name: string;
  icon: string;
  expiry_date: string; // ISO date string, e.g. "2026-07-14"
  added_date: string;
  opened_date: string | null;
  location: string | null;
  reminder_enabled: number; // 0 | 1
  reminder_days_before: number;
};

export type LastTimeTaskRow = {
  id: string;
  name: string;
  icon: string;
  last_done_date: string;
  repeat_interval_days: number | null;
  reminder_enabled: number; // 0 | 1
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS expiry_items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  added_date TEXT NOT NULL,
  opened_date TEXT,
  location TEXT,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_days_before INTEGER NOT NULL DEFAULT 2
);
CREATE TABLE IF NOT EXISTS last_time_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  last_done_date TEXT NOT NULL,
  repeat_interval_days INTEGER,
  reminder_enabled INTEGER NOT NULL DEFAULT 0
);
`;

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('freshkeep.db');
  }
  return db;
}

export function setTestDb(next: SQLite.SQLiteDatabase | null): void {
  db = next;
}

export function migrate(): void {
  getDb().execSync(SCHEMA_SQL);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `src/db/client.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/db/client.ts
git commit -m "Add SQLite schema and client for expiry_items/last_time_tasks"
```

---

### Task 3: Date and urgency bucketing library (pure, unit tested)

**Files:**
- Create: `src/lib/dateMath.ts`, `src/lib/urgency.ts`
- Test: `src/lib/__tests__/dateMath.test.ts`, `src/lib/__tests__/urgency.test.ts`

**Interfaces:**
- Produces: `daysBetween(from: Date, to: Date): number`, `todayISODate(): string`, `formatDate(iso: string): string` (e.g. "Thu, 14 July 2026"), `formatExpiryCountdown(daysLeft: number): { big: string; small: string }`, `formatDaysAgo(days: number): string` (e.g. "12 days ago", "today").
- Produces: `ExpiryBucketKey = 'needsAttention' | 'thisWeek' | 'fineForNow'`, `LastTimeBucketKey = 'overdue' | 'dueSoon' | 'onTrack'`, `bucketExpiryDaysLeft(daysLeft: number): ExpiryBucketKey`, `bucketLastTimeStatus(daysSince: number, repeatIntervalDays: number | null): LastTimeBucketKey`, `lastTimeProgress(daysSince: number, repeatIntervalDays: number): number` (0–100).
- Consumed by: Tasks 7, 8 (stores), 11 (Home screen), 13 (Add), 14 (Detail).

- [ ] **Step 1: Write failing tests for dateMath**

Create `src/lib/__tests__/dateMath.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest src/lib/__tests__/dateMath.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/dateMath'`.

- [ ] **Step 3: Implement dateMath**

Create `src/lib/dateMath.ts`:

```ts
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(diff / MS_PER_DAY);
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
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
```

- [ ] **Step 4: Run to verify dateMath tests pass**

```bash
npx jest src/lib/__tests__/dateMath.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Write failing tests for urgency bucketing**

Create `src/lib/__tests__/urgency.test.ts`:

```ts
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
});
```

- [ ] **Step 6: Run to verify it fails**

```bash
npx jest src/lib/__tests__/urgency.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/urgency'`.

- [ ] **Step 7: Implement urgency**

Create `src/lib/urgency.ts`:

```ts
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
```

- [ ] **Step 8: Run to verify urgency tests pass**

```bash
npx jest src/lib/__tests__/urgency.test.ts
```

Expected: PASS (11 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/dateMath.ts src/lib/urgency.ts src/lib/__tests__/dateMath.test.ts src/lib/__tests__/urgency.test.ts
git commit -m "Add pure date-math and urgency-bucketing lib with unit tests"
```

---

### Task 4: Icon suggestion library (pure, unit tested)

**Files:**
- Create: `src/lib/iconSuggest.ts`, `src/lib/iconCatalog.ts`
- Test: `src/lib/__tests__/iconSuggest.test.ts`

**Interfaces:**
- Produces: `suggestIcon(name: string, section: 'expiry' | 'lastTime'): string`; `ICON_CATEGORIES: { label: string; icons: string[] }[]` (used by Task 12's Choose Icon screen); `DEFAULT_EXPIRY_ICON = '🥫'`, `DEFAULT_LAST_TIME_ICON = '📝'`.
- Consumed by: Task 13 (Add screen auto-suggest), Task 12 (Choose Icon grid).

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/iconSuggest.test.ts`:

```ts
import { suggestIcon } from '@/lib/iconSuggest';

describe('suggestIcon', () => {
  it('matches milk', () => {
    expect(suggestIcon('Milk (2%)', 'expiry')).toBe('🥛');
  });
  it('matches paracetamol as medicine', () => {
    expect(suggestIcon('Paracetamol', 'expiry')).toBe('💊');
  });
  it('matches bedsheets', () => {
    expect(suggestIcon('Changed the bedsheets', 'lastTime')).toBe('🛏️');
  });
  it('is case-insensitive', () => {
    expect(suggestIcon('BREAD loaf', 'expiry')).toBe('🍞');
  });
  it('falls back to a default icon per section when nothing matches', () => {
    expect(suggestIcon('Xyzzy', 'expiry')).toBe('🥫');
    expect(suggestIcon('Xyzzy', 'lastTime')).toBe('📝');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest src/lib/__tests__/iconSuggest.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/iconSuggest'`.

- [ ] **Step 3: Implement the icon catalog**

Create `src/lib/iconCatalog.ts`:

```ts
export const ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  { label: 'Food & drink', icons: ['🥛', '🍞', '🥚', '🧀', '🥬', '🍗', '🍎', '🍌', '🐟', '🍚', '🧃', '🫙'] },
  { label: 'Health', icons: ['💊', '🩹', '🧴', '🦷', '🌡️', '💧'] },
  { label: 'Home & chores', icons: ['🛏️', '🪥', '🌀', '🧻', '🪴', '🔋'] },
];

export const DEFAULT_EXPIRY_ICON = '🥫';
export const DEFAULT_LAST_TIME_ICON = '📝';
```

- [ ] **Step 4: Implement suggestIcon**

Create `src/lib/iconSuggest.ts`:

```ts
import { DEFAULT_EXPIRY_ICON, DEFAULT_LAST_TIME_ICON } from '@/lib/iconCatalog';

const KEYWORD_MAP: [RegExp, string][] = [
  [/milk/, '🥛'],
  [/bread|loaf|sourdough/, '🍞'],
  [/egg/, '🥚'],
  [/cheese/, '🧀'],
  [/spinach|lettuce|greens|salad/, '🥬'],
  [/chicken|meat|thigh/, '🍗'],
  [/apple/, '🍎'],
  [/banana/, '🍌'],
  [/fish|salmon|tuna/, '🐟'],
  [/rice/, '🍚'],
  [/juice/, '🧃'],
  [/jar|sauce|jam|pickle/, '🫙'],
  [/paracetamol|tablet|pill|medicine|drug/, '💊'],
  [/bandage|plaster/, '🩹'],
  [/lotion|cream|shampoo|soap/, '🧴'],
  [/toothbrush|tooth/, '🪥'],
  [/thermometer|temperature/, '🌡️'],
  [/water/, '💧'],
  [/bedsheet|sheets|mattress|bed/, '🛏️'],
  [/filter|ac\b|fan|vent/, '🌀'],
  [/tissue|toilet paper|napkin/, '🧻'],
  [/plant|water.*plant/, '🪴'],
  [/battery|batteries/, '🔋'],
];

export function suggestIcon(name: string, section: 'expiry' | 'lastTime'): string {
  const lower = name.toLowerCase();
  for (const [pattern, icon] of KEYWORD_MAP) {
    if (pattern.test(lower)) return icon;
  }
  return section === 'expiry' ? DEFAULT_EXPIRY_ICON : DEFAULT_LAST_TIME_ICON;
}
```

- [ ] **Step 5: Run to verify tests pass**

```bash
npx jest src/lib/__tests__/iconSuggest.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/iconSuggest.ts src/lib/iconCatalog.ts src/lib/__tests__/iconSuggest.test.ts
git commit -m "Add icon suggestion dictionary and icon catalog"
```

---

### Task 5: Expiry items repository

**Files:**
- Create: `src/db/expiryItems.ts`

**Interfaces:**
- Consumes: `getDb`, `ExpiryItemRow` from `@/db/client` (Task 2); `generateId` (write inline here, see Step 1).
- Produces: `NewExpiryItem` type, `listExpiryItems(): Promise<ExpiryItemRow[]>`, `insertExpiryItem(input: NewExpiryItem): Promise<ExpiryItemRow>`, `updateExpiryItem(id: string, patch: Partial<NewExpiryItem>): Promise<void>`, `deleteExpiryItem(id: string): Promise<void>`. Reminder notification identifiers are deterministic (`expiry-${id}`, derived in Tasks 13/14), so no notification-id bookkeeping is needed here. Consumed by Task 7 (store).

- [ ] **Step 1: Add a shared id generator**

Create `src/lib/id.ts`:

```ts
export function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
```

- [ ] **Step 2: Implement the repository**

Create `src/db/expiryItems.ts`:

```ts
import { getDb, type ExpiryItemRow } from '@/db/client';
import { generateId } from '@/lib/id';
import { todayISODate } from '@/lib/dateMath';

export type NewExpiryItem = {
  name: string;
  icon: string;
  expiryDate: string;
  location?: string | null;
  openedDate?: string | null;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
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
    location: input.location ?? null,
    reminder_enabled: input.reminderEnabled ? 1 : 0,
    reminder_days_before: input.reminderDaysBefore ?? 2,
  };
  await getDb().runAsync(
    `INSERT INTO expiry_items
      (id, name, icon, expiry_date, added_date, opened_date, location, reminder_enabled, reminder_days_before)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.name, row.icon, row.expiry_date, row.added_date, row.opened_date, row.location, row.reminder_enabled, row.reminder_days_before],
  );
  return row;
}

export async function updateExpiryItem(id: string, patch: Partial<NewExpiryItem>): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.icon !== undefined) { fields.push('icon = ?'); values.push(patch.icon); }
  if (patch.expiryDate !== undefined) { fields.push('expiry_date = ?'); values.push(patch.expiryDate); }
  if (patch.location !== undefined) { fields.push('location = ?'); values.push(patch.location); }
  if (patch.openedDate !== undefined) { fields.push('opened_date = ?'); values.push(patch.openedDate); }
  if (patch.reminderEnabled !== undefined) { fields.push('reminder_enabled = ?'); values.push(patch.reminderEnabled ? 1 : 0); }
  if (patch.reminderDaysBefore !== undefined) { fields.push('reminder_days_before = ?'); values.push(patch.reminderDaysBefore); }
  if (fields.length === 0) return;
  values.push(id);
  await getDb().runAsync(`UPDATE expiry_items SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteExpiryItem(id: string): Promise<void> {
  await getDb().runAsync('DELETE FROM expiry_items WHERE id = ?', [id]);
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `src/db/expiryItems.ts` or `src/lib/id.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/db/expiryItems.ts src/lib/id.ts
git commit -m "Add expiry items SQLite repository"
```

---

### Task 6: Last-time tasks repository

**Files:**
- Create: `src/db/lastTimeTasks.ts`

**Interfaces:**
- Consumes: `getDb`, `LastTimeTaskRow` from `@/db/client`; `generateId` from `@/lib/id`; `todayISODate` from `@/lib/dateMath`.
- Produces: `NewLastTimeTask` type, `listLastTimeTasks(): Promise<LastTimeTaskRow[]>`, `insertLastTimeTask(input: NewLastTimeTask): Promise<LastTimeTaskRow>`, `updateLastTimeTask(id: string, patch: Partial<NewLastTimeTask>): Promise<void>`, `markLastTimeTaskDoneNow(id: string): Promise<void>`, `deleteLastTimeTask(id: string): Promise<void>`. Reminder notification identifiers are deterministic (`lasttime-${id}`, derived in Tasks 13/14), so no notification-id bookkeeping is needed here. Consumed by Task 8 (store).

- [ ] **Step 1: Implement the repository**

Create `src/db/lastTimeTasks.ts`:

```ts
import { getDb, type LastTimeTaskRow } from '@/db/client';
import { generateId } from '@/lib/id';
import { todayISODate } from '@/lib/dateMath';

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
  };
  await getDb().runAsync(
    `INSERT INTO last_time_tasks
      (id, name, icon, last_done_date, repeat_interval_days, reminder_enabled)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [row.id, row.name, row.icon, row.last_done_date, row.repeat_interval_days, row.reminder_enabled],
  );
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
  values.push(id);
  await getDb().runAsync(`UPDATE last_time_tasks SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function markLastTimeTaskDoneNow(id: string): Promise<void> {
  await getDb().runAsync('UPDATE last_time_tasks SET last_done_date = ? WHERE id = ?', [todayISODate(), id]);
}

export async function deleteLastTimeTask(id: string): Promise<void> {
  await getDb().runAsync('DELETE FROM last_time_tasks WHERE id = ?', [id]);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `src/db/lastTimeTasks.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/db/lastTimeTasks.ts
git commit -m "Add last-time tasks SQLite repository"
```

---

### Task 7: Expiry Zustand store (unit tested via mocked repository)

**Files:**
- Create: `src/store/expiryStore.ts`
- Test: `src/store/__tests__/expiryStore.test.ts`

**Interfaces:**
- Consumes: everything exported from `@/db/expiryItems` (Task 5), `bucketExpiryDaysLeft`/`daysBetween`/`todayISODate` from `@/lib/urgency` and `@/lib/dateMath` (Task 3).
- Produces: `useExpiryStore` Zustand hook with state `{ items: ExpiryItemRow[], hydrated: boolean }` and actions `hydrate()`, `addItem(input: NewExpiryItem): Promise<ExpiryItemRow>` (returns the inserted row so callers can build a notification id from its real `id`), `updateItem(id, patch)`, `removeItem(id)`, and selector `getBuckets(items: ExpiryItemRow[]): Record<ExpiryBucketKey, ExpiryItemRow[]>` (exported standalone so Task 11 can call it without depending on hook internals in tests). Consumed by Task 11 (Home), Task 13 (Add), and Task 14 (Detail).

- [ ] **Step 1: Write failing store tests with a mocked repository**

Create `src/store/__tests__/expiryStore.test.ts`:

```ts
jest.mock('@/db/expiryItems');

import { useExpiryStore, getExpiryBuckets } from '@/store/expiryStore';
import * as repo from '@/db/expiryItems';
import type { ExpiryItemRow } from '@/db/client';

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
    const today = new Date().toISOString().slice(0, 10);
    const buckets = getExpiryBuckets([rowFixture({ expiry_date: today })]);
    expect(buckets.needsAttention).toHaveLength(1);
    expect(buckets.thisWeek).toHaveLength(0);
    expect(buckets.fineForNow).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest src/store/__tests__/expiryStore.test.ts
```

Expected: FAIL — `Cannot find module '@/store/expiryStore'`.

- [ ] **Step 3: Implement the store**

Create `src/store/expiryStore.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx jest src/store/__tests__/expiryStore.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/expiryStore.ts src/store/__tests__/expiryStore.test.ts
git commit -m "Add expiry Zustand store with mocked-repository tests"
```

---

### Task 8: Last-time Zustand store (unit tested via mocked repository)

**Files:**
- Create: `src/store/lastTimeStore.ts`
- Test: `src/store/__tests__/lastTimeStore.test.ts`

**Interfaces:**
- Consumes: everything exported from `@/db/lastTimeTasks` (Task 6); `daysBetween`, `todayISODate` from `@/lib/dateMath`; `bucketLastTimeStatus` from `@/lib/urgency`.
- Produces: `useLastTimeStore` Zustand hook, actions `hydrate()`, `addTask(input: NewLastTimeTask): Promise<LastTimeTaskRow>` (returns the inserted row so callers can build a notification id from its real `id`), `updateTask(id, patch)`, `markDoneNow(id)`, `removeTask(id)`; standalone `getLastTimeBuckets(items: LastTimeTaskRow[]): Record<LastTimeBucketKey, LastTimeTaskRow[]>`. Consumed by Task 11 (Home), Task 13 (Add), and Task 14 (Detail).

- [ ] **Step 1: Write failing store tests**

Create `src/store/__tests__/lastTimeStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest src/store/__tests__/lastTimeStore.test.ts
```

Expected: FAIL — `Cannot find module '@/store/lastTimeStore'`.

- [ ] **Step 3: Implement the store**

Create `src/store/lastTimeStore.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx jest src/store/__tests__/lastTimeStore.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/lastTimeStore.ts src/store/__tests__/lastTimeStore.test.ts
git commit -m "Add last-time Zustand store with mocked-repository tests"
```

---

### Task 9: Notifications wrapper

**Files:**
- Create: `src/notifications/index.ts`
- Modify: `app.json` (add expo-notifications plugin + Android permission)

**Interfaces:**
- Produces: `initNotifications(): void`, `requestNotificationPermission(): Promise<boolean>`, `scheduleReminder(params: { id: string; title: string; body: string; date: Date }): Promise<string | null>`, `cancelReminder(notificationId: string | null): Promise<void>`. Consumed by Task 13 (Add) and Task 14 (Detail).

- [ ] **Step 1: Register the notifications plugin**

In `app.json`, add `"expo-notifications"` to the `"plugins"` array (alongside the existing `"expo-router"` and `"expo-splash-screen"` entries):

```json
"plugins": [
  "expo-router",
  "expo-notifications",
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#208AEF",
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 76
    }
  ]
]
```

- [ ] **Step 2: Implement the wrapper**

Create `src/notifications/index.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let handlerRegistered = false;

export function initNotifications(): void {
  if (handlerRegistered) return;
  handlerRegistered = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleReminder(params: {
  id: string;
  title: string;
  body: string;
  date: Date;
}): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  if (params.date.getTime() <= Date.now()) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: params.date },
    identifier: params.id,
  });
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
```

- [ ] **Step 3: Wire initialization into the root layout**

In `src/app/_layout.tsx`, import and call `initNotifications()` alongside `migrate()`:

```tsx
import { initNotifications } from '@/notifications';
// ...
useEffect(() => {
  migrate();
  initNotifications();
  setReady(true);
}, []);
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `src/notifications/index.ts` or `src/app/_layout.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/notifications/index.ts src/app/_layout.tsx app.json
git commit -m "Add local notifications wrapper for reminders"
```

---

### Task 10: Shared UI primitives

**Files:**
- Create: `src/components/SectionHeader.tsx`, `src/components/SegmentedControl.tsx`, `src/components/Fab.tsx`, `src/components/IconTile.tsx`, `src/components/Toggle.tsx`

**Interfaces:**
- Produces: `<SectionHeader label tone="danger"|"warning"|"success" />`, `<SegmentedControl options={{label,value}[]} value onChange />`, `<Fab label icon onPress />`, `<IconTile icon selected onPress size? />`, `<Toggle value onValueChange />`. Consumed by Tasks 11–15.

- [ ] **Step 1: SectionHeader**

Create `src/components/SectionHeader.tsx`:

```tsx
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/tokens';

const TONE_COLOR = {
  danger: colors.dangerLabel,
  warning: colors.warningLabel,
  success: colors.successText,
} as const;

export function SectionHeader({ label, tone }: { label: string; tone: keyof typeof TONE_COLOR }) {
  return <Text style={[styles.text, { color: TONE_COLOR[tone] }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
});
```

- [ ] **Step 2: SegmentedControl**

Create `src/components/SegmentedControl.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.chipTrackBg,
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radii.sm + 1,
  },
  segmentActive: {
    backgroundColor: colors.chipActiveBg,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textFaint2,
  },
  labelActive: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
```

- [ ] **Step 3: Fab**

Create `src/components/Fab.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow } from '@/theme/tokens';

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.button} onPress={onPress}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: radii.pill,
    ...shadow.primaryButton,
  },
  plus: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
```

- [ ] **Step 4: IconTile**

Create `src/components/IconTile.tsx`:

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii } from '@/theme/tokens';

export function IconTile({
  icon,
  selected,
  onPress,
}: {
  icon: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tile, selected && styles.tileSelected]} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    borderRadius: radii.md + 1,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  icon: {
    fontSize: 22,
  },
});
```

- [ ] **Step 5: Toggle**

Create `src/components/Toggle.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.toggleOn : '#D8D5CB', justifyContent: value ? 'flex-end' : 'flex-start' }]}
    >
      <View style={styles.thumb} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 51,
    height: 31,
    borderRadius: 999,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 999,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
```

- [ ] **Step 6: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing the new component files.

- [ ] **Step 7: Commit**

```bash
git add src/components/SectionHeader.tsx src/components/SegmentedControl.tsx src/components/Fab.tsx src/components/IconTile.tsx src/components/Toggle.tsx
git commit -m "Add shared UI primitives (section header, segmented control, fab, icon tile, toggle)"
```

---

### Task 11: Home screen (S3/S4)

**Files:**
- Create: `src/components/ExpiryItemCard.tsx`, `src/components/LastTimeTaskCard.tsx`
- Modify: `src/app/index.tsx` (replace placeholder from Task 1)

**Interfaces:**
- Consumes: `useExpiryStore`, `getExpiryBuckets` (Task 7); `useLastTimeStore`, `getLastTimeBuckets` (Task 8); `SectionHeader`, `SegmentedControl`, `Fab` (Task 10); `formatExpiryCountdown`, `formatDate`, `formatDaysAgo` (Task 3); `lastTimeProgress` (Task 3).
- Produces: navigable route `/` rendering both buckets; tapping a card navigates to `/item/[id]?type=expiry|task`; FAB navigates to `/add?type=expiry|lastTime`.

- [ ] **Step 1: ExpiryItemCard**

Create `src/components/ExpiryItemCard.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { formatExpiryCountdown } from '@/lib/dateMath';

const URGENCY_COLOR = {
  needsAttention: { bar: colors.danger, text: colors.dangerTextAlt, iconBg: colors.dangerBg },
  thisWeek: { bar: colors.warning, text: colors.warningLabel, iconBg: colors.warningBg },
  fineForNow: { bar: colors.success, text: colors.successText, iconBg: colors.successBg },
} as const;

export function ExpiryItemCard({
  icon,
  name,
  subtitle,
  daysLeft,
  tone,
  onPress,
}: {
  icon: string;
  name: string;
  subtitle: string;
  daysLeft: number;
  tone: keyof typeof URGENCY_COLOR;
  onPress: () => void;
}) {
  const { big, small } = formatExpiryCountdown(daysLeft);
  const palette = URGENCY_COLOR[tone];
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.bar, { backgroundColor: palette.bar }]} />
      <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={[styles.big, { color: palette.bar }]}>{big}</Text>
        <Text style={[styles.small, { color: palette.text }]}>{small}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 14,
    overflow: 'hidden',
  },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  iconWrap: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 23 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rightCol: { alignItems: 'flex-end' },
  big: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  small: { fontSize: 11, marginTop: 3 },
});
```

- [ ] **Step 2: LastTimeTaskCard**

Create `src/components/LastTimeTaskCard.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { formatDaysAgo } from '@/lib/dateMath';
import { lastTimeProgress, type LastTimeBucketKey } from '@/lib/urgency';

const TONE = {
  overdue: { bar: colors.danger, badgeBg: colors.dangerBg, badgeText: colors.danger },
  dueSoon: { bar: colors.warning, badgeBg: colors.warningBg, badgeText: colors.warningText },
  onTrack: { bar: colors.success, badgeBg: colors.successBg, badgeText: colors.successText },
} as const;

export function LastTimeTaskCard({
  icon,
  name,
  daysSince,
  repeatIntervalDays,
  tone,
  onPress,
}: {
  icon: string;
  name: string;
  daysSince: number;
  repeatIntervalDays: number | null;
  tone: LastTimeBucketKey;
  onPress: () => void;
}) {
  const palette = TONE[tone];
  const badgeLabel =
    repeatIntervalDays == null
      ? null
      : tone === 'overdue'
        ? `${daysSince - repeatIntervalDays}d over`
        : `${repeatIntervalDays - daysSince}d left`;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.subtitle}>
            Last done <Text style={styles.subtitleStrong}>{formatDaysAgo(daysSince)}</Text>
          </Text>
        </View>
        {badgeLabel ? (
          <Text style={[styles.badge, { backgroundColor: palette.badgeBg, color: palette.badgeText }]}>
            {badgeLabel}
          </Text>
        ) : (
          <Text style={styles.check}>✔️</Text>
        )}
      </View>
      {repeatIntervalDays != null ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${lastTimeProgress(daysSince, repeatIntervalDays)}%`, backgroundColor: palette.bar }]} />
          </View>
          <Text style={styles.interval}>Every {repeatIntervalDays} days</Text>
        </>
      ) : (
        <Text style={styles.interval}>No reminder set · tap to add one</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.xl, padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  iconWrap: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.iconTilePurple, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 23 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  subtitleStrong: { fontWeight: '700', color: colors.textPrimary },
  badge: { fontSize: 12, fontWeight: '700', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8 },
  check: { fontSize: 20 },
  track: { height: 6, borderRadius: 999, backgroundColor: colors.divider, marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  interval: { fontSize: 11, color: colors.textFaint, marginTop: 6 },
});
```

- [ ] **Step 3: Home screen**

Replace `src/app/index.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, spacing } from '@/theme/tokens';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Fab } from '@/components/Fab';
import { ExpiryItemCard } from '@/components/ExpiryItemCard';
import { LastTimeTaskCard } from '@/components/LastTimeTaskCard';
import { useExpiryStore, getExpiryBuckets } from '@/store/expiryStore';
import { useLastTimeStore, getLastTimeBuckets } from '@/store/lastTimeStore';
import { daysBetween, todayISODate } from '@/lib/dateMath';

const WEEKDAY_MONTH = () => {
  const d = new Date();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
};

export default function Home() {
  const router = useRouter();
  const [section, setSection] = useState<'expiring' | 'lastTime'>('expiring');

  const expiryItems = useExpiryStore((s) => s.items);
  const hydrateExpiry = useExpiryStore((s) => s.hydrate);
  const lastTimeItems = useLastTimeStore((s) => s.items);
  const hydrateLastTime = useLastTimeStore((s) => s.hydrate);

  useEffect(() => {
    hydrateExpiry();
    hydrateLastTime();
  }, [hydrateExpiry, hydrateLastTime]);

  const today = new Date(`${todayISODate()}T00:00:00`);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.dateLabel}>{WEEKDAY_MONTH()}</Text>
        <Text style={styles.title}>FreshKeep</Text>
        <View style={{ marginTop: 16 }}>
          <SegmentedControl
            value={section}
            onChange={setSection}
            options={[
              { label: '🥛 Expiring', value: 'expiring' },
              { label: '🛏️ Last time', value: 'lastTime' },
            ]}
          />
        </View>
      </View>

      {section === 'expiring' ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={[
            { key: 'needsAttention', label: 'Needs attention', tone: 'danger' as const },
            { key: 'thisWeek', label: 'This week', tone: 'warning' as const },
            { key: 'fineForNow', label: 'Fine for now', tone: 'success' as const },
          ]}
          keyExtractor={(g) => g.key}
          renderItem={({ item: group }) => {
            const buckets = getExpiryBuckets(expiryItems);
            const rows = buckets[group.key as keyof typeof buckets];
            if (rows.length === 0) return null;
            return (
              <View>
                <SectionHeader label={group.label} tone={group.tone} />
                <View style={{ gap: 10 }}>
                  {rows.map((row) => {
                    const daysLeft = daysBetween(today, new Date(`${row.expiry_date}T00:00:00`));
                    return (
                      <ExpiryItemCard
                        key={row.id}
                        icon={row.icon}
                        name={row.name}
                        subtitle={[row.location, row.opened_date ? 'opened' : row.added_date ? 'added' : null].filter(Boolean).join(' · ') || ' '}
                        daysLeft={daysLeft}
                        tone={group.key as 'needsAttention' | 'thisWeek' | 'fineForNow'}
                        onPress={() => router.push({ pathname: '/item/[id]', params: { id: row.id, type: 'expiry' } })}
                      />
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={[
            { key: 'overdue', label: 'Overdue', tone: 'danger' as const },
            { key: 'dueSoon', label: 'Due soon', tone: 'warning' as const },
            { key: 'onTrack', label: 'On track', tone: 'success' as const },
          ]}
          keyExtractor={(g) => g.key}
          renderItem={({ item: group }) => {
            const buckets = getLastTimeBuckets(lastTimeItems);
            const rows = buckets[group.key as keyof typeof buckets];
            if (rows.length === 0) return null;
            return (
              <View>
                <SectionHeader label={group.label} tone={group.tone} />
                <View style={{ gap: 10 }}>
                  {rows.map((row) => {
                    const daysSince = daysBetween(new Date(`${row.last_done_date}T00:00:00`), today);
                    return (
                      <LastTimeTaskCard
                        key={row.id}
                        icon={row.icon}
                        name={row.name}
                        daysSince={daysSince}
                        repeatIntervalDays={row.repeat_interval_days}
                        tone={group.key as 'overdue' | 'dueSoon' | 'onTrack'}
                        onPress={() => router.push({ pathname: '/item/[id]', params: { id: row.id, type: 'task' } })}
                      />
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      )}

      <Fab
        label={section === 'expiring' ? 'Add item' : 'Add task'}
        onPress={() => router.push({ pathname: '/add', params: { type: section === 'expiring' ? 'expiry' : 'lastTime' } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg },
  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: 10 },
  dateLabel: { fontSize: 13, fontWeight: '600', color: colors.primary, letterSpacing: 0.2 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 2, color: colors.textPrimary },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 118 },
});
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. (`/item/[id]` and `/add` routes don't exist yet — Tasks 13/14 add them; `expo-router`'s typed routes may warn until those files exist, which is expected at this point in the plan.)

- [ ] **Step 5: Commit**

```bash
git add src/app/index.tsx src/components/ExpiryItemCard.tsx src/components/LastTimeTaskCard.tsx
git commit -m "Build Home screen with Expiring/Last-time segmented lists"
```

---

### Task 12: Choose Icon screen (S6)

**Files:**
- Create: `src/app/choose-icon.tsx`

**Interfaces:**
- Consumes: `ICON_CATEGORIES` (Task 4), `IconTile` (Task 10).
- Route params: `selected` (current icon), `returnTo` (unused placeholder — Phase 1 always returns to Add via `router.back()` plus a shared selection callback registered by Task 13 using a simple module-level event target, see Step 2).
- Produces: a picker that, on tap, calls back into the Add screen's pending selection and navigates back.

- [ ] **Step 1: Add a tiny cross-screen selection channel**

Create `src/lib/iconSelectionChannel.ts` (a minimal pub/sub so `add.tsx` can receive the pick without prop-drilling through the router):

```ts
type Listener = (icon: string) => void;

let listener: Listener | null = null;

export function onIconSelected(fn: Listener): void {
  listener = fn;
}

export function clearIconListener(): void {
  listener = null;
}

export function emitIconSelected(icon: string): void {
  listener?.(icon);
}
```

- [ ] **Step 2: Build the screen**

Create `src/app/choose-icon.tsx`:

```tsx
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radii, spacing } from '@/theme/tokens';
import { ICON_CATEGORIES } from '@/lib/iconCatalog';
import { IconTile } from '@/components/IconTile';
import { emitIconSelected } from '@/lib/iconSelectionChannel';

export default function ChooseIcon() {
  const router = useRouter();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(selected ?? '🥫');

  const pick = (icon: string) => {
    setCurrent(icon);
    emitIconSelected(icon);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.link} onPress={() => router.back()}>Cancel</Text>
        <Text style={styles.title}>Choose an icon</Text>
        <Text style={[styles.link, styles.linkStrong]} onPress={() => router.back()}>Done</Text>
      </View>
      <View style={styles.search}>
        <Text style={{ color: colors.textFaint }}>🔍  Search icons</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder=""
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
        <View style={styles.selectedRow}>
          <View style={styles.selectedCard}>
            <View style={styles.selectedIconWrap}>
              <Text style={{ fontSize: 24 }}>{current}</Text>
            </View>
            <View>
              <Text style={styles.selectedLabel}>SELECTED</Text>
              <Text style={styles.selectedName}>Current icon</Text>
            </View>
          </View>
          <View style={styles.photoTile}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textFaint2 }}>Photo</Text>
          </View>
        </View>

        {ICON_CATEGORIES.map((cat) => {
          const icons = query
            ? cat.icons /* no per-icon labels to filter on in Phase 1; search box is present for parity but only filters categories by name */
            : cat.icons;
          if (query && !cat.label.toLowerCase().includes(query.toLowerCase())) return null;
          return (
            <View key={cat.label} style={{ marginBottom: 18 }}>
              <Text style={styles.categoryLabel}>{cat.label.toUpperCase()}</Text>
              <View style={styles.grid}>
                {icons.map((icon) => (
                  <IconTile key={icon} icon={icon} selected={icon === current} onPress={() => pick(icon)} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingTop: 60, paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  link: { fontSize: 15, color: colors.primary },
  linkStrong: { fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  search: { backgroundColor: colors.searchBg, borderRadius: radii.md, height: 38, justifyContent: 'center', paddingHorizontal: 13, marginBottom: 8 },
  selectedRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  selectedCard: { flex: 1, backgroundColor: colors.card, borderRadius: radii.md + 2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  selectedIconWrap: { width: 42, height: 42, borderRadius: 11, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  selectedLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '600' },
  selectedName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  photoTile: { width: 96, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.dashedBorder, borderStyle: 'dashed', borderRadius: radii.md + 2, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: 0.55 },
  categoryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
});
```

Note: `IconTile` in Task 10 is sized by its parent via flex/width; the grid here relies on flexWrap. If tiles render too large/small, constrain with a fixed `width: '14%'` on each tile wrapper — acceptable to adjust visually during the manual run-through in Task 17.

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/choose-icon.tsx src/lib/iconSelectionChannel.ts
git commit -m "Build Choose Icon screen"
```

---

### Task 13: Add sheet screen (S5)

**Files:**
- Create: `src/app/add.tsx`

**Interfaces:**
- Consumes: `useExpiryStore` (Task 7), `useLastTimeStore` (Task 8), `suggestIcon` (Task 4), `onIconSelected`/`clearIconListener` (Task 12), `SegmentedControl`, `Toggle` (Task 10), `scheduleReminder` (Task 9), `formatDate` (Task 3).
- Route param: `type` (`'expiry' | 'lastTime'`, sets initial segmented value).
- Produces: on save, creates a row via the matching store and (if reminder enabled) schedules a notification, then navigates back to Home.

- [ ] **Step 1: Build the screen**

Create `src/app/add.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors, radii, spacing } from '@/theme/tokens';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Toggle } from '@/components/Toggle';
import { suggestIcon } from '@/lib/iconSuggest';
import { formatDate, todayISODate } from '@/lib/dateMath';
import { onIconSelected, clearIconListener } from '@/lib/iconSelectionChannel';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { scheduleReminder } from '@/notifications';

const RECENT_EXPIRY = ['Milk', 'Bread', 'Eggs', 'Paracetamol'];
const RECENT_TASKS = ['Changed bedsheets', 'Replaced toothbrush', 'Cleaned filter', 'Flipped mattress'];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Add() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [section, setSection] = useState<'expiry' | 'lastTime'>(params.type === 'lastTime' ? 'lastTime' : 'expiry');

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🥫');
  const [iconTouched, setIconTouched] = useState(false);
  const [expiryDate, setExpiryDate] = useState(addDays(todayISODate(), 7));
  const [repeatDays, setRepeatDays] = useState<number | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const addExpiryItem = useExpiryStore((s) => s.addItem);
  const addTask = useLastTimeStore((s) => s.addTask);

  useEffect(() => {
    onIconSelected((picked) => {
      setIcon(picked);
      setIconTouched(true);
    });
    return () => clearIconListener();
  }, []);

  useEffect(() => {
    if (!iconTouched && name.trim().length > 0) {
      setIcon(suggestIcon(name, section));
    }
  }, [name, section, iconTouched]);

  const recentChips = section === 'expiry' ? RECENT_EXPIRY : RECENT_TASKS;

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (section === 'expiry') {
      const row = await addExpiryItem({
        name: trimmed,
        icon,
        expiryDate,
        reminderEnabled,
        reminderDaysBefore: 2,
      });
      if (reminderEnabled) {
        const triggerDate = new Date(`${expiryDate}T09:00:00`);
        triggerDate.setDate(triggerDate.getDate() - 2);
        await scheduleReminder({
          id: `expiry-${row.id}`,
          title: 'FreshKeep',
          body: `${icon} ${trimmed} expires soon`,
          date: triggerDate,
        });
      }
    } else {
      const row = await addTask({
        name: trimmed,
        icon,
        repeatIntervalDays: repeatDays,
        reminderEnabled,
      });
      if (reminderEnabled && row.repeat_interval_days) {
        const triggerDate = new Date(`${row.last_done_date}T09:00:00`);
        triggerDate.setDate(triggerDate.getDate() + row.repeat_interval_days);
        await scheduleReminder({
          id: `lasttime-${row.id}`,
          title: 'FreshKeep',
          body: `${icon} ${row.repeat_interval_days} days since you ${trimmed.toLowerCase()}`,
          date: triggerDate,
        });
      }
    }
    router.back();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text style={styles.link} onPress={() => router.back()}>Cancel</Text>
          <Text style={styles.title}>{section === 'expiry' ? 'New item' : 'New task'}</Text>
          <Text style={[styles.link, styles.linkStrong]} onPress={save}>Save</Text>
        </View>

        <SegmentedControl
          value={section}
          onChange={setSection}
          options={[
            { label: '🥛 Expires', value: 'expiry' },
            { label: '🛏️ Last time', value: 'lastTime' },
          ]}
        />

        <ScrollView style={{ marginTop: 18 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>NAME &amp; ICON</Text>
          <View style={styles.nameRow}>
            <Pressable
              style={styles.iconButton}
              onPress={() => router.push({ pathname: '/choose-icon', params: { selected: icon } })}
            >
              <Text style={{ fontSize: 28 }}>{icon}</Text>
              <View style={styles.iconEditBadge}>
                <Text style={{ color: '#fff', fontSize: 10 }}>✎</Text>
              </View>
            </Pressable>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              style={styles.nameInput}
            />
          </View>
          <Text style={styles.hint}>Icon picked automatically — tap it to change</Text>

          <View style={styles.chipRow}>
            {recentChips.map((chip) => (
              <Pressable key={chip} style={styles.chip} onPress={() => setName(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>

          {section === 'expiry' ? (
            <>
              <Text style={styles.fieldLabel}>EXPIRES</Text>
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>{formatDate(expiryDate)}</Text>
              </View>
              <View style={styles.quickRow}>
                <Pressable style={styles.quickButton} onPress={() => setExpiryDate(addDays(todayISODate(), 7))}>
                  <Text style={styles.quickButtonText}>+1 week</Text>
                </Pressable>
                <Pressable style={styles.quickButton} onPress={() => setExpiryDate(addDays(todayISODate(), 30))}>
                  <Text style={styles.quickButtonText}>+1 month</Text>
                </Pressable>
                <Pressable style={styles.quickButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.quickButtonText}>Pick</Text>
                </Pressable>
                <View style={[styles.quickButton, styles.scanButton]}>
                  <Text style={[styles.quickButtonText, { color: '#fff' }]}>Scan (soon)</Text>
                </View>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(`${expiryDate}T00:00:00`)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setExpiryDate(date.toISOString().slice(0, 10));
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>REPEAT EVERY (DAYS, OPTIONAL)</Text>
              <TextInput
                value={repeatDays ? String(repeatDays) : ''}
                onChangeText={(v) => setRepeatDays(v ? Number(v.replace(/[^0-9]/g, '')) : null)}
                keyboardType="number-pad"
                placeholder="e.g. 14"
                style={styles.dateRow}
              />
            </>
          )}

          <View style={styles.reminderRow}>
            <View>
              <Text style={styles.reminderTitle}>Remind me</Text>
              <Text style={styles.reminderSubtitle}>
                {section === 'expiry' ? '2 days before it expires' : 'when the repeat interval is reached'}
              </Text>
            </View>
            <Toggle value={reminderEnabled} onValueChange={setReminderEnabled} />
          </View>

          <Pressable style={styles.saveButton} onPress={save}>
            <Text style={styles.saveButtonText}>{section === 'expiry' ? 'Add to FreshKeep' : 'Add task'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,15,0.34)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.screenBg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.xl, paddingBottom: 34, maxHeight: '90%' },
  grabber: { width: 38, height: 5, borderRadius: 999, backgroundColor: colors.dashedBorder, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  link: { fontSize: 15, color: colors.primary },
  linkStrong: { fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginBottom: 8, marginTop: 20 },
  nameRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  iconButton: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  iconEditBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.screenBg },
  nameInput: { flex: 1, backgroundColor: colors.card, borderRadius: radii.md + 2, paddingHorizontal: 16, fontSize: 17, color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textFaint, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: colors.card, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  dateRow: { backgroundColor: colors.card, borderRadius: radii.md + 2, paddingHorizontal: 16, paddingVertical: 14 },
  dateText: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickButton: { flex: 1, alignItems: 'center', backgroundColor: colors.card, paddingVertical: 11, borderRadius: 11 },
  quickButtonText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  scanButton: { backgroundColor: colors.primary, opacity: 0.6 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radii.md + 2, padding: 16, marginTop: 18 },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  reminderSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 16, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
```

- [ ] **Step 2: Install the date picker dependency**

```bash
npx expo install @react-native-community/datetimepicker
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/add.tsx package.json package-lock.json
git commit -m "Build Add sheet screen with icon auto-suggest and quick-date buttons"
```

---

### Task 14: Item/Task detail screen (S7)

**Files:**
- Create: `src/app/item/[id].tsx`

**Interfaces:**
- Consumes: `useExpiryStore`, `useLastTimeStore` (Tasks 7/8), `Toggle` (Task 10), `formatDate`, `formatDaysAgo`, `formatExpiryCountdown` (Task 3), `scheduleReminder`/`cancelReminder` (Task 9).
- Route params: `id`, `type` (`'expiry' | 'task'`).

- [ ] **Step 1: Build the screen**

Create `src/app/item/[id].tsx`:

```tsx
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors, radii, spacing } from '@/theme/tokens';
import { Toggle } from '@/components/Toggle';
import { daysBetween, formatDate, formatDaysAgo, formatExpiryCountdown, todayISODate } from '@/lib/dateMath';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { scheduleReminder, cancelReminder } from '@/notifications';

export default function ItemDetail() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: 'expiry' | 'task' }>();

  const expiryItems = useExpiryStore((s) => s.items);
  const updateExpiryItem = useExpiryStore((s) => s.updateItem);
  const removeExpiryItem = useExpiryStore((s) => s.removeItem);

  const tasks = useLastTimeStore((s) => s.items);
  const updateTask = useLastTimeStore((s) => s.updateTask);
  const markDoneNow = useLastTimeStore((s) => s.markDoneNow);
  const removeTask = useLastTimeStore((s) => s.removeTask);

  const today = new Date(`${todayISODate()}T00:00:00`);

  if (type === 'expiry') {
    const item = useMemo(() => expiryItems.find((i) => i.id === id), [expiryItems, id]);
    if (!item) return <View style={styles.screen} />;
    const daysLeft = daysBetween(today, new Date(`${item.expiry_date}T00:00:00`));
    const { big } = formatExpiryCountdown(daysLeft);

    const toggleReminder = async (value: boolean) => {
      await updateExpiryItem(item.id, { reminderEnabled: value });
      if (value) {
        const triggerDate = new Date(`${item.expiry_date}T09:00:00`);
        triggerDate.setDate(triggerDate.getDate() - item.reminder_days_before);
        await scheduleReminder({ id: `expiry-${item.id}`, title: 'FreshKeep', body: `${item.icon} ${item.name} expires soon`, date: triggerDate });
      } else {
        await cancelReminder(`expiry-${item.id}`);
      }
    };

    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.headerRow}>
          <Text style={styles.backLink} onPress={() => router.back()}>‹ Expiring</Text>
        </View>
        <View style={styles.heroBlock}>
          <View style={styles.heroIcon}><Text style={{ fontSize: 40 }}>{item.icon}</Text></View>
          <Text style={styles.heroTitle}>{item.name}</Text>
          <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Expires today' : `Expires in ${big}`}</Text></View>
        </View>
        <View style={styles.card}>
          <Row label="Expiry date" value={formatDate(item.expiry_date)} />
          <Divider />
          <Row label="Location" value={item.location ?? '—'} />
          <Divider />
          <Row label="Added" value={formatDate(item.added_date)} />
        </View>
        <Text style={styles.sectionLabel}>REMINDER</Text>
        <View style={styles.card}>
          <View style={styles.reminderHeaderRow}>
            <Text style={styles.reminderTitle}>🔔  Remind me before</Text>
            <Toggle value={!!item.reminder_enabled} onValueChange={toggleReminder} />
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={styles.primaryAction} onPress={async () => { await removeExpiryItem(item.id); router.back(); }}>
            <Text style={styles.primaryActionText}>✅  Used it</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={async () => { await removeExpiryItem(item.id); router.back(); }}>
            <Text style={styles.secondaryActionText}>🗑️  Threw away</Text>
          </Pressable>
        </View>
        <Text
          style={styles.removeLink}
          onPress={() =>
            Alert.alert('Remove item', `Remove ${item.name}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: async () => { await removeExpiryItem(item.id); router.back(); } },
            ])
          }
        >
          Remove item
        </Text>
      </ScrollView>
    );
  }

  const task = useMemo(() => tasks.find((t) => t.id === id), [tasks, id]);
  if (!task) return <View style={styles.screen} />;
  const daysSince = daysBetween(new Date(`${task.last_done_date}T00:00:00`), today);

  const toggleTaskReminder = async (value: boolean) => {
    await updateTask(task.id, { reminderEnabled: value });
    if (value && task.repeat_interval_days) {
      const triggerDate = new Date(`${task.last_done_date}T09:00:00`);
      triggerDate.setDate(triggerDate.getDate() + task.repeat_interval_days);
      await scheduleReminder({
        id: `lasttime-${task.id}`,
        title: 'FreshKeep',
        body: `${task.icon} ${task.repeat_interval_days} days since you ${task.name.toLowerCase()}`,
        date: triggerDate,
      });
    } else if (!value) {
      await cancelReminder(`lasttime-${task.id}`);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.headerRow}>
        <Text style={styles.backLink} onPress={() => router.back()}>‹ Last time</Text>
      </View>
      <View style={styles.heroBlock}>
        <View style={styles.heroIcon}><Text style={{ fontSize: 40 }}>{task.icon}</Text></View>
        <Text style={styles.heroTitle}>{task.name}</Text>
        <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Last done {formatDaysAgo(daysSince)}</Text></View>
      </View>
      <View style={styles.card}>
        <Row label="Last done" value={formatDate(task.last_done_date)} />
        <Divider />
        <Row label="Repeat every" value={task.repeat_interval_days ? `${task.repeat_interval_days} days` : 'Not set'} />
      </View>
      <Text style={styles.sectionLabel}>REMINDER</Text>
      <View style={styles.card}>
        <View style={styles.reminderHeaderRow}>
          <Text style={styles.reminderTitle}>🔔  Remind me</Text>
          <Toggle value={!!task.reminder_enabled} onValueChange={toggleTaskReminder} />
        </View>
      </View>
      <Pressable style={styles.primaryAction} onPress={() => markDoneNow(task.id)}>
        <Text style={styles.primaryActionText}>✔️  Did it just now</Text>
      </Pressable>
      <Text
        style={styles.removeLink}
        onPress={() =>
          Alert.alert('Remove task', `Remove ${task.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: async () => { await removeTask(task.id); router.back(); } },
          ])
        }
      >
        Remove task
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 15, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 13 }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 16 },
  headerRow: { paddingTop: 56, paddingBottom: 6 },
  backLink: { fontSize: 16, color: colors.primary },
  heroBlock: { alignItems: 'center', paddingVertical: 20 },
  heroIcon: { width: 78, height: 78, borderRadius: 22, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 14, color: colors.textPrimary },
  heroBadge: { backgroundColor: colors.dangerBg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, marginTop: 10 },
  heroBadgeText: { color: colors.dangerText, fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16 },
  sectionLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginTop: 22, marginBottom: 8, marginLeft: 6 },
  reminderHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  primaryAction: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryAction: { flex: 1, backgroundColor: colors.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryActionText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  removeLink: { textAlign: 'center', color: colors.dangerText, fontSize: 15, fontWeight: '600', marginTop: 20 },
});
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/item/[id].tsx"
git commit -m "Build item/task detail screen with reminder toggle and actions"
```

---

### Task 15: Settings screen (S8) + biometric app-lock

**Files:**
- Create: `src/app/settings.tsx`, `src/store/settingsStore.ts`
- Modify: `app.json` (add `NSFaceIDUsageDescription`)

**Interfaces:**
- Consumes: `Toggle` (Task 10), `expo-local-authentication`.
- Produces: `useSettingsStore` with `{ defaultReminderDaysBefore, notificationSoundEnabled, appLockEnabled }` persisted via `expo-sqlite`'s key-value-free approach — for Phase 1 simplicity, persisted with `expo-sqlite` in a single-row `settings` table (added to schema in this task).

- [ ] **Step 1: Extend the schema for settings**

In `src/db/client.ts`, add a settings table to `SCHEMA_SQL` and a seed step in `migrate()`:

```ts
// Add to SCHEMA_SQL, after the last_time_tasks CREATE TABLE statement:
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_reminder_days_before INTEGER NOT NULL DEFAULT 2,
  notification_sound_enabled INTEGER NOT NULL DEFAULT 1,
  app_lock_enabled INTEGER NOT NULL DEFAULT 0
);
```

```ts
// Replace the body of migrate() with:
export function migrate(): void {
  const database = getDb();
  database.execSync(SCHEMA_SQL);
  database.execSync('INSERT OR IGNORE INTO app_settings (id) VALUES (1);');
}
```

Add a matching row type near the others in the same file:

```ts
export type AppSettingsRow = {
  id: number;
  default_reminder_days_before: number;
  notification_sound_enabled: number;
  app_lock_enabled: number;
};
```

- [ ] **Step 2: Build the settings store**

Create `src/store/settingsStore.ts`:

```ts
import { create } from 'zustand';
import { getDb, type AppSettingsRow } from '@/db/client';

type SettingsState = {
  loaded: boolean;
  defaultReminderDaysBefore: number;
  notificationSoundEnabled: boolean;
  appLockEnabled: boolean;
  load: () => Promise<void>;
  setDefaultReminderDaysBefore: (days: number) => Promise<void>;
  setNotificationSoundEnabled: (enabled: boolean) => Promise<void>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  loaded: false,
  defaultReminderDaysBefore: 2,
  notificationSoundEnabled: true,
  appLockEnabled: false,
  load: async () => {
    const row = await getDb().getFirstAsync<AppSettingsRow>('SELECT * FROM app_settings WHERE id = 1');
    if (row) {
      set({
        loaded: true,
        defaultReminderDaysBefore: row.default_reminder_days_before,
        notificationSoundEnabled: !!row.notification_sound_enabled,
        appLockEnabled: !!row.app_lock_enabled,
      });
    }
  },
  setDefaultReminderDaysBefore: async (days) => {
    await getDb().runAsync('UPDATE app_settings SET default_reminder_days_before = ? WHERE id = 1', [days]);
    set({ defaultReminderDaysBefore: days });
  },
  setNotificationSoundEnabled: async (enabled) => {
    await getDb().runAsync('UPDATE app_settings SET notification_sound_enabled = ? WHERE id = 1', [enabled ? 1 : 0]);
    set({ notificationSoundEnabled: enabled });
  },
  setAppLockEnabled: async (enabled) => {
    await getDb().runAsync('UPDATE app_settings SET app_lock_enabled = ? WHERE id = 1', [enabled ? 1 : 0]);
    set({ appLockEnabled: enabled });
  },
}));
```

- [ ] **Step 3: Add Face ID usage description and install local auth**

```bash
npx expo install expo-local-authentication
```

In `app.json`, under `"ios"`, add:

```json
"infoPlist": {
  "NSFaceIDUsageDescription": "FreshKeep can lock the app behind Face ID so only you can see your list."
}
```

- [ ] **Step 4: Build the settings screen**

Create `src/app/settings.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

import { colors, radii, spacing } from '@/theme/tokens';
import { Toggle } from '@/components/Toggle';
import { useSettingsStore } from '@/store/settingsStore';

export default function Settings() {
  const router = useRouter();
  const {
    loaded, load, defaultReminderDaysBefore, setDefaultReminderDaysBefore,
    notificationSoundEnabled, setNotificationSoundEnabled,
    appLockEnabled, setAppLockEnabled,
  } = useSettingsStore();

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const onToggleAppLock = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        Alert.alert('No biometrics set up', 'Set up Face ID / fingerprint in your device settings first.');
        return;
      }
    }
    await setAppLockEnabled(value);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.headerRow}>
        <Text style={styles.backLink} onPress={() => router.back()}>‹ FreshKeep</Text>
      </View>
      <Text style={styles.title}>Settings</Text>

      <View style={[styles.card, styles.rowCard]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>—</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Not signed in</Text>
          <Text style={styles.rowSubtitle}>Free plan · local only</Text>
        </View>
      </View>

      <View style={styles.premiumBanner}>
        <Text style={styles.premiumTitle}>☁️  Sync across devices</Text>
        <Text style={styles.premiumSubtitle}>Cloud backup + web access</Text>
        <View style={styles.premiumCta}>
          <Text style={styles.premiumCtaText}>Coming in a later update</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>REMINDERS</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.rowTitle}>Default lead time</Text>
            <Text style={styles.rowSubtitle}>Applied to new items</Text>
          </View>
          <Text
            style={styles.rowValue}
            onPress={() => setDefaultReminderDaysBefore(defaultReminderDaysBefore >= 7 ? 1 : defaultReminderDaysBefore + 1)}
          >
            {defaultReminderDaysBefore} days before ›
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.rowTitle}>Notification sound</Text>
          <Toggle value={notificationSoundEnabled} onValueChange={setNotificationSoundEnabled} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>PRIVACY &amp; LOCK</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.rowTitle}>🔒  Require biometrics to open</Text>
          <Toggle value={appLockEnabled} onValueChange={onToggleAppLock} />
        </View>
      </View>
      <Text style={styles.footnote}>
        On the free plan everything stays on this device. Premium (coming later) encrypts a copy to the cloud so you can restore it on any device.
      </Text>

      <Text style={styles.version}>FreshKeep · Version 1.0{'\n'}Remembers your dates, so you don't have to.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBg, paddingHorizontal: 16 },
  headerRow: { paddingTop: 56, paddingBottom: 6 },
  backLink: { fontSize: 16, color: colors.primary },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: colors.textPrimary, marginBottom: 14 },
  card: { backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 46, height: 46, borderRadius: 999, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  rowSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  premiumBanner: { backgroundColor: colors.primaryDark, borderRadius: radii.md + 4, padding: 16, marginTop: 14 },
  premiumTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  premiumSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, marginTop: 2 },
  premiumCta: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 11, alignItems: 'center', paddingVertical: 11, marginTop: 13 },
  premiumCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1, color: colors.textFaint, marginTop: 22, marginBottom: 8, marginLeft: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowValue: { fontSize: 16, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 13 },
  footnote: { fontSize: 12.5, color: colors.textFaint, lineHeight: 18, marginTop: 8, paddingHorizontal: 2 },
  version: { textAlign: 'center', color: colors.textFaint, fontSize: 12.5, marginTop: 26, lineHeight: 18 },
});
```

- [ ] **Step 5: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/settings.tsx src/store/settingsStore.ts src/db/client.ts app.json package.json package-lock.json
git commit -m "Build Settings screen with reminder defaults and biometric app-lock"
```

---

### Task 16: Auth/Premium route stubs (S1/S2/S9) — static visuals only

**Files:**
- Create: `src/app/login.tsx`, `src/app/verify.tsx`, `src/app/premium.tsx`

**Interfaces:**
- Produces: three routes rendering the dark-themed mockups verbatim, with no working auth/billing logic (per Global Constraints). Buttons are visually complete but either no-op or simply `router.back()`. Not linked from anywhere reachable in this phase's UI (Settings' account row and premium banner are inert per Task 15) — these exist purely so Phase 2/4 have a file to build on, and so the visuals can be manually reviewed now.

- [ ] **Step 1: Login stub**

Create `src/app/login.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, spacing } from '@/theme/tokens';

export default function Login() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <View style={styles.heroWrap}>
        <View style={styles.logo}><Text style={{ fontSize: 32 }}>🌱</Text></View>
        <Text style={styles.title}>Welcome to FreshKeep</Text>
        <Text style={styles.subtitle}>Sign in to save your list and{'\n'}sync across devices</Text>
      </View>
      <View style={{ flex: 1 }} />
      <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
      <View style={styles.phoneRow}>
        <View style={styles.countryCode}><Text style={styles.fieldText}>🇮🇳 +91</Text></View>
        <View style={styles.phoneInput}><Text style={styles.fieldTextPlaceholder}>98765 43210</Text></View>
      </View>
      <Pressable style={styles.sendCodeButton} onPress={() => router.push('/verify')}>
        <Text style={styles.sendCodeText}>Send code</Text>
      </Pressable>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <Pressable style={styles.googleButton} onPress={() => router.back()}>
        <Text style={styles.googleText}>Continue with Google</Text>
      </Pressable>
      <Text style={styles.terms}>
        By continuing you agree to our Terms.{'\n'}Prefer no account? <Text style={styles.termsLink} onPress={() => router.back()}>Use device lock instead</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07120E', paddingHorizontal: 26 },
  heroWrap: { paddingTop: 96, alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#12613F', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 25, fontWeight: '800', letterSpacing: -0.5, marginTop: 18 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 15, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  fieldLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11.5, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 14, justifyContent: 'center' },
  phoneInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, justifyContent: 'center' },
  fieldText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  fieldTextPlaceholder: { color: 'rgba(255,255,255,0.5)', fontSize: 17 },
  sendCodeButton: { backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  sendCodeText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  dividerText: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  googleButton: { backgroundColor: '#fff', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#1F1F1F' },
  terms: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 22, marginBottom: 40, lineHeight: 18 },
  termsLink: { color: '#7FDCB6', fontWeight: '600' },
});
```

- [ ] **Step 2: Verify stub**

Create `src/app/verify.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function Verify() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <Text style={styles.back} onPress={() => router.back()}>‹</Text>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to{'\n'}+91 98765 43210</Text>
      <View style={styles.otpRow}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.otpBox} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable style={styles.verifyButton} onPress={() => router.replace('/')}>
        <Text style={styles.verifyText}>Verify &amp; continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07120E', paddingHorizontal: 26, paddingTop: 62 },
  back: { color: '#fff', fontSize: 22 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 44 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 15, marginTop: 8, lineHeight: 20 },
  otpRow: { flexDirection: 'row', gap: 9, marginTop: 34 },
  otpBox: { flex: 1, aspectRatio: 1 / 1.15, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 14 },
  verifyButton: { backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  verifyText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
```

- [ ] **Step 3: Premium stub**

Create `src/app/premium.tsx`:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/tokens';

const BENEFITS = [
  'Sync across iPhone, iPad & web',
  'Automatic encrypted cloud backup',
  'Restore instantly on a new phone',
  'Unlimited items & custom icons',
];

export default function Premium() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.close} onPress={() => router.back()}>✕</Text>
      <View style={styles.heroWrap}>
        <View style={styles.iconWrap}><Text style={{ fontSize: 36 }}>☁️</Text></View>
        <Text style={styles.eyebrow}>FRESHKEEP PREMIUM</Text>
        <Text style={styles.title}>Your dates, on every{'\n'}device you own</Text>
      </View>
      <View style={{ gap: 14, marginTop: 26 }}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <View style={styles.checkWrap}><Text style={{ color: '#2FBB84' }}>✓</Text></View>
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 40 }} />
      <View style={styles.plansRow}>
        <View style={styles.planCard}>
          <Text style={styles.planLabel}>Monthly</Text>
          <Text style={styles.planPrice}>$1.99</Text>
          <Text style={styles.planSub}>per month</Text>
        </View>
        <View style={[styles.planCard, styles.planCardHighlight]}>
          <Text style={styles.planLabel}>Yearly</Text>
          <Text style={styles.planPrice}>$14.99</Text>
          <Text style={styles.planSub}>$1.25 / month</Text>
        </View>
      </View>
      <Pressable style={styles.cta} onPress={() => router.back()}>
        <Text style={styles.ctaText}>Coming in a later update</Text>
      </Pressable>
      <Text style={styles.footnote}>The free plan keeps everything on-device forever.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#06110D', paddingHorizontal: 24 },
  close: { color: 'rgba(255,255,255,0.5)', fontSize: 22, textAlign: 'right', marginTop: 58 },
  heroWrap: { alignItems: 'center', paddingTop: 14 },
  iconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#E8C15A', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 8, textAlign: 'center', lineHeight: 30 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  checkWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(47,187,132,0.18)', alignItems: 'center', justifyContent: 'center' },
  benefitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  plansRow: { flexDirection: 'row', gap: 10 },
  planCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 15, padding: 14 },
  planCardHighlight: { backgroundColor: 'rgba(47,187,132,0.14)', borderColor: '#2FBB84', borderWidth: 1.5 },
  planLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  planPrice: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  planSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  cta: { backgroundColor: colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  footnote: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/login.tsx src/app/verify.tsx src/app/premium.tsx
git commit -m "Add static S1/S2/S9 route stubs for future auth/billing phases"
```

---

### Task 17: Final integration pass and manual run-through

**Files:**
- Modify: `app.json` (name/slug already set by scaffold — verify only), none else expected; fix-forward any issues found.

**Interfaces:** none new — this task verifies everything from Tasks 1–16 works together end to end.

- [ ] **Step 1: Run the full unit test suite**

```bash
npx jest
```

Expected: PASS — all suites from Tasks 3, 4, 7, 8 (dateMath, urgency, iconSuggest, expiryStore, lastTimeStore).

- [ ] **Step 2: Type-check the whole project**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start the app and manually verify the golden path**

```bash
npx expo start
```

Manually verify (on iOS simulator/device and Android emulator/device, or Expo Go on both):
1. App boots to Home on the Expiring tab with an empty state (no crash).
2. Tap "Add item" → segmented control shows Expires/Last time → type "Milk" → icon auto-suggests 🥛 → tap "Pick" and choose a date 2 days out → toggle reminder on → Save → new card appears in "Needs attention".
3. Tap the card → detail screen shows correct expiry date/location/added date → toggle reminder off → back.
4. Switch to "Last time" segment → tap "Add task" → name "Watered the plants" → icon auto-suggests 🪴 → set repeat to 7 days → Save → card appears with progress bar.
5. Tap "Did it just now" on a task from its detail screen → counter resets to "today".
6. Open Settings from... (Phase 1 has no nav entry point to Settings yet — if none exists, add a temporary gear icon/link on the Home header in this step, wired to `router.push('/settings')`, since S8 needs to be reachable to test it manually) → toggle biometric lock (expect a friendly alert if the simulator has no biometrics enrolled) → change default lead time → toggle notification sound.
7. Force-quit and reopen the app → confirm items/tasks persisted (SQLite survived restart).

- [ ] **Step 4: Add the Home → Settings entry point discovered as missing in Step 3**

If Step 3.6 required adding a Settings entry point, make it permanent: add a small gear icon to the Home header, next to the "FreshKeep" title, navigating to `/settings`. Edit `src/app/index.tsx`'s header `View` to include:

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  <View>
    <Text style={styles.dateLabel}>{WEEKDAY_MONTH()}</Text>
    <Text style={styles.title}>FreshKeep</Text>
  </View>
  <Text style={{ fontSize: 22 }} onPress={() => router.push('/settings')}>⚙️</Text>
</View>
```

(Replace the existing `dateLabel`/`title` `Text` pair in the header with this wrapped version.)

- [ ] **Step 5: Re-run tests and type-check after any fix-forward changes**

```bash
npx jest && npx tsc --noEmit
```

Expected: PASS, no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Home-to-Settings navigation entry point; Phase 1 integration pass"
```
