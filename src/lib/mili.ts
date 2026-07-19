import { supabase } from '@/lib/supabaseClient';
import { todayISODate, toLocalISODate } from '@/lib/dateMath';

/**
 * Client side of the Mili voice agent. Speech-to-text happens on-device (see
 * src/app/mili.tsx); only the transcript goes to the `mili-parse` Edge
 * Function, which returns one of these typed intents. Dates come back
 * RELATIVE and are resolved here, in the device's timezone.
 */

export type MiliWhen = {
  days?: number;
  weekday?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  month?: number;
  day?: number;
};

export type MiliIntent =
  | { intent: 'add_expiry_item'; name: string; when: MiliWhen }
  | { intent: 'add_last_time_task'; name: string; repeat_days?: number }
  | { intent: 'mark_done'; task_name: string }
  | { intent: 'query_expiring'; window_days: number }
  | { intent: 'unknown'; reason: string };

export type MiliResult = { intent?: MiliIntent; error?: string };

const ERROR_MESSAGES: Record<string, string> = {
  premium_required: 'Mili is a Premium feature.',
  rate_limited: "You're talking to Mili a lot! Try again in a bit.",
  not_signed_in: 'Sign in to use Mili.',
  parse_failed: "Mili couldn't process that. Try again?",
  server_not_configured: "Mili isn't set up on the server yet — see supabase/README.md.",
};

export async function parseWithMili(transcript: string): Promise<MiliResult> {
  const { data, error } = await supabase.functions.invoke('mili-parse', {
    body: { transcript },
  });
  if (error) {
    // supabase-js surfaces non-2xx as FunctionsHttpError with the response attached.
    let code = '';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) code = ((await ctx.json()) as { error?: string }).error ?? '';
    } catch {
      // fall through to the generic message
    }
    return { error: ERROR_MESSAGES[code] ?? "Couldn't reach Mili. Check your connection." };
  }
  const intent = (data as { intent?: MiliIntent } | null)?.intent;
  if (!intent) return { error: "Mili couldn't process that. Try again?" };
  return { intent };
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * Resolves a relative `when` to a local ISO date. Weekday → the NEXT
 * occurrence (today counts as 7 days out, matching "next Friday" said on a
 * Friday). month+day → this year, or next year if already past.
 */
export function resolveWhen(when: MiliWhen): string {
  const today = new Date(`${todayISODate()}T00:00:00`);

  if (when.days !== undefined) {
    const d = new Date(today);
    d.setDate(d.getDate() + when.days);
    return toLocalISODate(d);
  }

  if (when.weekday !== undefined) {
    const target = WEEKDAYS.indexOf(when.weekday);
    let delta = (target - today.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    const d = new Date(today);
    d.setDate(d.getDate() + delta);
    return toLocalISODate(d);
  }

  if (when.month !== undefined && when.day !== undefined) {
    let d = new Date(today.getFullYear(), when.month - 1, when.day);
    if (d < today) d = new Date(today.getFullYear() + 1, when.month - 1, when.day);
    return toLocalISODate(d);
  }

  // Nothing usable parsed — a sensible default the user can edit on the card.
  const d = new Date(today);
  d.setDate(d.getDate() + 7);
  return toLocalISODate(d);
}
