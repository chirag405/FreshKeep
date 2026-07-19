// Supabase Edge Function: "Mili" voice-agent intent parser (Premium-only).
//
// The app does speech-to-text ON DEVICE and sends only the transcript here.
// This function verifies the caller's JWT, checks `profiles.is_premium`,
// rate-limits per user, then runs a small LangGraph pipeline that uses
// Claude (via @langchain/anthropic structured output) to turn free-form
// speech into a typed intent. Dates are returned RELATIVE ({days} /
// {weekday} / {month, day}) and resolved on the device in the user's
// timezone — the model never computes an ISO date, to avoid the UTC-shift
// bug class (see src/lib/dateMath.ts).
//
// Deploy:   supabase functions deploy mili-parse
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//           supabase secrets set MILI_MODEL=claude-haiku-4-5   (optional)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { ChatAnthropic } from 'npm:@langchain/anthropic';
import { Annotation, END, START, StateGraph } from 'npm:@langchain/langgraph';

const RATE_LIMIT_PER_HOUR = 60;
const MAX_TRANSCRIPT_CHARS = 500;

// ── Intent schema (what the app receives) ──────────────────────────────

const WhenSchema = z
  .object({
    days: z.number().int().min(0).max(3650).optional().describe('Relative days from today, e.g. "in 6 days" → 6, "tomorrow" → 1'),
    weekday: z
      .enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .optional()
      .describe('For "next Friday" style phrases — the device resolves the next occurrence'),
    month: z.number().int().min(1).max(12).optional().describe('For explicit dates like "July 20" — month number'),
    day: z.number().int().min(1).max(31).optional().describe('For explicit dates like "July 20" — day of month'),
  })
  .describe('Relative date. Fill exactly one of: days, weekday, or month+day. NEVER compute an absolute ISO date.');

const IntentSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('add_expiry_item'),
    name: z.string().describe('Short item name, e.g. "Eggs", "Milk (2%)"'),
    when: WhenSchema,
  }),
  z.object({
    intent: z.literal('add_last_time_task'),
    name: z.string().describe('Past-tense task, e.g. "Changed the bedsheets"'),
    repeat_days: z.number().int().min(1).max(3650).optional().describe('Repeat interval in days if the user gave one'),
  }),
  z.object({
    intent: z.literal('mark_done'),
    task_name: z.string().describe('The task the user says they just did, for fuzzy matching against their list'),
  }),
  z.object({
    intent: z.literal('query_expiring'),
    window_days: z.number().int().min(1).max(90).default(7).describe('How far ahead to look, default 7'),
  }),
  z.object({
    intent: z.literal('unknown'),
    reason: z.string().describe('One short sentence on why this could not be mapped to a supported action'),
  }),
]);

type Intent = z.infer<typeof IntentSchema>;

// ── LangGraph pipeline: parse → normalize ───────────────────────────────

const MiliState = Annotation.Root({
  transcript: Annotation<string>(),
  intent: Annotation<Intent | null>({ reducer: (_prev, next) => next, default: () => null }),
});

const SYSTEM_PROMPT = `You turn one spoken utterance from a home-inventory app user into a single structured intent.
The app tracks (a) items that expire (food, medicine) and (b) "last time I did X" tasks (chores on a repeat interval).
Rules:
- "add eggs with 6 days of expiry" → add_expiry_item, when.days = 6.
- "I changed the bedsheets today, remind me every 14 days" → add_last_time_task, repeat_days = 14.
- "I just cleaned the AC filter" (an action they did, no expiry) → mark_done.
- "what's expiring this week" → query_expiring.
- Dates are ALWAYS relative (days / weekday / month+day). Never output a full computed date.
- Item names: short and title-cased like a shopping list entry. Task names: past tense.
- If the request is none of these (or unsafe/unrelated), return intent "unknown" with a short reason.`;

function buildGraph(model: ChatAnthropic) {
  const structured = model.withStructuredOutput(IntentSchema, { name: 'mili_intent' });

  const parse = async (state: typeof MiliState.State) => {
    const intent = await structured.invoke([
      ['system', SYSTEM_PROMPT],
      ['human', state.transcript],
    ]);
    return { intent };
  };

  // Deterministic cleanup the model shouldn't be trusted with: trim names,
  // drop contradictory `when` combinations, clamp windows.
  const normalize = (state: typeof MiliState.State) => {
    const intent = state.intent;
    if (!intent) return { intent: { intent: 'unknown', reason: 'No parse produced.' } as Intent };
    if (intent.intent === 'add_expiry_item') {
      const when = { ...intent.when };
      if (when.days !== undefined) {
        delete when.weekday;
        delete when.month;
        delete when.day;
      } else if (when.weekday !== undefined) {
        delete when.month;
        delete when.day;
      } else if (when.month === undefined || when.day === undefined) {
        delete when.month;
        delete when.day;
      }
      return { intent: { ...intent, name: intent.name.trim().slice(0, 80), when } };
    }
    if (intent.intent === 'add_last_time_task') {
      return { intent: { ...intent, name: intent.name.trim().slice(0, 80) } };
    }
    if (intent.intent === 'mark_done') {
      return { intent: { ...intent, task_name: intent.task_name.trim().slice(0, 80) } };
    }
    return { intent };
  };

  return new StateGraph(MiliState)
    .addNode('parse', parse)
    .addNode('normalize', normalize)
    .addEdge(START, 'parse')
    .addEdge('parse', 'normalize')
    .addEdge('normalize', END)
    .compile();
}

// ── HTTP handler ────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) return json({ error: 'server_not_configured' }, 500);

  // Who is calling? (JWT is also verified by the platform since we deploy
  // WITHOUT --no-verify-jwt; this resolves it to a user id.)
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseAuthed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabaseAuthed.auth.getUser();
  if (!user) return json({ error: 'not_signed_in' }, 401);

  // Premium gate + rate limit via the service role.
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile } = await service.from('profiles').select('is_premium').eq('user_id', user.id).maybeSingle();
  if (!profile?.is_premium) return json({ error: 'premium_required' }, 403);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await service
    .from('mili_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) return json({ error: 'rate_limited' }, 429);

  let transcript: string;
  try {
    const body = await req.json();
    transcript = String(body?.transcript ?? '').trim();
  } catch {
    return json({ error: 'malformed_body' }, 400);
  }
  if (!transcript) return json({ error: 'empty_transcript' }, 400);
  transcript = transcript.slice(0, MAX_TRANSCRIPT_CHARS);

  await service.from('mili_usage').insert({ user_id: user.id });

  try {
    const model = new ChatAnthropic({
      apiKey: anthropicKey,
      model: Deno.env.get('MILI_MODEL') ?? 'claude-haiku-4-5',
      maxTokens: 500,
    });
    const graph = buildGraph(model);
    const result = await graph.invoke({ transcript });
    return json({ intent: result.intent });
  } catch (error) {
    console.error('mili-parse failed', error);
    return json({ error: 'parse_failed' }, 502);
  }
});
