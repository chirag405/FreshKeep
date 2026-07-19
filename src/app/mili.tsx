import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { colors, radii } from '@/theme/tokens';
import { AppSheet } from '@/components/AppSheet';
import { parseWithMili, resolveWhen, type MiliIntent } from '@/lib/mili';
import { suggestIcon } from '@/lib/iconSuggest';
import { daysBetween, formatDate, todayISODate } from '@/lib/dateMath';
import { useExpiryStore } from '@/store/expiryStore';
import { useLastTimeStore } from '@/store/lastTimeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useHouseholdStore } from '@/store/householdStore';

const SNAP_POINTS = ['72%'];

type Phase = 'idle' | 'listening' | 'thinking' | 'confirm' | 'saved' | 'error';

/**
 * Push-to-talk voice agent (Premium). Hold the mic, say "add eggs with 6
 * days of expiry", release — on-device speech recognition produces a
 * transcript, the mili-parse Edge Function (LangGraph + Claude) turns it
 * into a typed intent, and a confirmation card lets the user apply or edit
 * it. Audio never leaves the device; only the transcript is sent.
 */
export default function Mili() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<MiliIntent | null>(null);
  const [message, setMessage] = useState('');

  const addExpiryItem = useExpiryStore((s) => s.addItem);
  const expiryItems = useExpiryStore((s) => s.items);
  const addTask = useLastTimeStore((s) => s.addTask);
  const tasks = useLastTimeStore((s) => s.items);
  const markDoneNow = useLastTimeStore((s) => s.markDoneNow);
  const defaultReminderDaysBefore = useSettingsStore((s) => s.defaultReminderDaysBefore);
  const household = useHouseholdStore((s) => s.household);

  // Refs mirror the latest phase/transcript so the 'end' event handler (which
  // fires from a native callback, not a render) can make a same-tick decision
  // without relying on a stale closure.
  const phaseRef = useRef<Phase>('idle');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const transcriptRef = useRef('');

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (text) {
      transcriptRef.current = text;
      setTranscript(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (phaseRef.current !== 'listening') return;
    if (!transcriptRef.current) {
      setPhase('error');
      setMessage("Didn't catch that. Hold the mic and try again.");
      return;
    }
    setPhase('thinking');
  });

  useSpeechRecognitionEvent('error', (event) => {
    setPhase('error');
    setMessage(event.error === 'not-allowed' ? 'Microphone access is needed — allow it in system settings.' : "Didn't catch that. Hold the mic and try again.");
  });

  // Kick off parsing when we enter "thinking" with the final transcript.
  useEffect(() => {
    if (phase !== 'thinking' || !transcript) return;
    let cancelled = false;
    parseWithMili(transcript).then(({ intent: parsed, error }) => {
      if (cancelled) return;
      if (error || !parsed) {
        setPhase('error');
        setMessage(error ?? "Mili couldn't process that.");
        return;
      }
      setIntent(parsed);
      setPhase('confirm');
    });
    return () => {
      cancelled = true;
    };
  }, [phase, transcript]);

  const startListening = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setPhase('error');
      setMessage('Microphone access is needed — allow it in system settings.');
      return;
    }
    transcriptRef.current = '';
    setTranscript('');
    setIntent(null);
    setPhase('listening');
    ExpoSpeechRecognitionModule.start({ lang: 'en-IN', interimResults: true });
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  const reset = () => {
    setPhase('idle');
    setTranscript('');
    setIntent(null);
    setMessage('');
  };

  const fuzzyFindTask = (name: string) => {
    const q = name.toLowerCase();
    return tasks.find((t) => t.name.toLowerCase().includes(q) || q.includes(t.name.toLowerCase())) ?? null;
  };

  const confirm = async (close: () => void) => {
    if (!intent) return;
    try {
      if (intent.intent === 'add_expiry_item') {
        await addExpiryItem({
          name: intent.name,
          icon: suggestIcon(intent.name, 'expiry'),
          expiryDate: resolveWhen(intent.when),
          reminderEnabled: false,
          reminderDaysBefore: defaultReminderDaysBefore,
          householdId: household?.id ?? null,
        });
      } else if (intent.intent === 'add_last_time_task') {
        await addTask({
          name: intent.name,
          icon: suggestIcon(intent.name, 'lastTime'),
          repeatIntervalDays: intent.repeat_days ?? null,
          reminderEnabled: false,
          householdId: household?.id ?? null,
        });
      } else if (intent.intent === 'mark_done') {
        const task = fuzzyFindTask(intent.task_name);
        if (!task) {
          setPhase('error');
          setMessage(`Couldn't find a task like "${intent.task_name}" on your list.`);
          return;
        }
        await markDoneNow(task.id);
      }
      setPhase('saved');
      setTimeout(close, 900);
    } catch (error) {
      console.error('[mili] apply intent failed', error);
      setPhase('error');
      setMessage("Couldn't save that — try again.");
    }
  };

  const editInAddSheet = () => {
    if (!intent) return;
    if (intent.intent === 'add_expiry_item') {
      router.replace({
        pathname: '/add',
        params: { type: 'expiry', name: intent.name, expiryDate: resolveWhen(intent.when) },
      });
    } else if (intent.intent === 'add_last_time_task') {
      router.replace({
        pathname: '/add',
        params: { type: 'lastTime', name: intent.name, repeatDays: intent.repeat_days ? String(intent.repeat_days) : undefined },
      });
    }
  };

  const renderConfirm = (close: () => void) => {
    if (!intent) return null;

    if (intent.intent === 'query_expiring') {
      const today = new Date(`${todayISODate()}T00:00:00`);
      const upcoming = expiryItems
        .map((row) => ({ row, daysLeft: daysBetween(today, new Date(`${row.expiry_date}T00:00:00`)) }))
        .filter(({ daysLeft }) => daysLeft <= intent.window_days)
        .sort((a, b) => a.daysLeft - b.daysLeft);
      return (
        <>
          <Text style={styles.cardTitle}>Expiring in the next {intent.window_days} days</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.cardBody}>Nothing! You&apos;re all clear. 🎉</Text>
          ) : (
            upcoming.slice(0, 8).map(({ row, daysLeft }) => (
              <Text key={row.id} style={styles.queryRow}>
                {row.icon}  {row.name} — {daysLeft < 0 ? 'expired' : daysLeft === 0 ? 'today' : `${daysLeft}d`}
              </Text>
            ))
          )}
          <Pressable style={styles.primaryButton} onPress={close}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </>
      );
    }

    if (intent.intent === 'unknown') {
      return (
        <>
          <Text style={styles.cardTitle}>Hmm, I can&apos;t do that</Text>
          <Text style={styles.cardBody}>{intent.reason}</Text>
          <Text style={styles.cardBody}>I can add items, log tasks, or tell you what&apos;s expiring.</Text>
          <Pressable style={styles.primaryButton} onPress={reset}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </>
      );
    }

    const icon =
      intent.intent === 'add_expiry_item'
        ? suggestIcon(intent.name, 'expiry')
        : intent.intent === 'add_last_time_task'
          ? suggestIcon(intent.name, 'lastTime')
          : '✔️';
    const title =
      intent.intent === 'add_expiry_item'
        ? intent.name
        : intent.intent === 'add_last_time_task'
          ? intent.name
          : `Mark "${fuzzyFindTask(intent.task_name)?.name ?? intent.task_name}" as done?`;
    const detail =
      intent.intent === 'add_expiry_item'
        ? `Expires ${formatDate(resolveWhen(intent.when))}`
        : intent.intent === 'add_last_time_task'
          ? intent.repeat_days
            ? `Repeats every ${intent.repeat_days} days`
            : 'No repeat interval'
          : 'Resets its "last done" date to today';

    return (
      <>
        <View style={styles.intentCard}>
          <View style={styles.intentIcon}><Text style={{ fontSize: 30 }}>{icon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardBody}>{detail}</Text>
          </View>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => confirm(close)}>
          <Text style={styles.primaryButtonText}>
            {intent.intent === 'mark_done' ? 'Yes, did it' : 'Add it'}
          </Text>
        </Pressable>
        <View style={styles.secondaryRow}>
          {(intent.intent === 'add_expiry_item' || intent.intent === 'add_last_time_task') && (
            <Text style={styles.link} onPress={editInAddSheet}>Edit details</Text>
          )}
          <Text style={styles.link} onPress={reset}>Try again</Text>
        </View>
      </>
    );
  };

  return (
    <AppSheet snapPoints={SNAP_POINTS}>
      {(close) => (
        <>
          <Text style={styles.header}>🎙️ Mili</Text>

          {(phase === 'idle' || phase === 'listening') && (
            <>
              <Text style={styles.prompt}>
                {phase === 'listening'
                  ? transcript || 'Listening…'
                  : '“Hey Mili, add eggs with 6 days of expiry”'}
              </Text>
              <Pressable
                style={[styles.mic, phase === 'listening' && styles.micActive]}
                onPressIn={startListening}
                onPressOut={stopListening}
              >
                <Text style={{ fontSize: 34 }}>🎤</Text>
              </Pressable>
              <Text style={styles.hint}>Hold to talk · release when done</Text>
              <Text style={styles.privacy}>Audio is processed on your phone — only the text is sent.</Text>
            </>
          )}

          {phase === 'thinking' && (
            <>
              <Text style={styles.prompt}>&ldquo;{transcript}&rdquo;</Text>
              <ActivityIndicator color={colors.primary} style={{ marginTop: 26 }} />
              <Text style={styles.hint}>Mili is thinking…</Text>
            </>
          )}

          {phase === 'confirm' && renderConfirm(close)}

          {phase === 'saved' && (
            <>
              <Text style={[styles.header, { textAlign: 'center', marginTop: 20 }]}>✅</Text>
              <Text style={styles.prompt}>Done!</Text>
            </>
          )}

          {phase === 'error' && (
            <>
              <Text style={styles.cardTitle}>Oops</Text>
              <Text style={styles.cardBody}>{message}</Text>
              <Pressable style={styles.primaryButton} onPress={reset}>
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  prompt: { fontSize: 17, color: colors.textSecondary, textAlign: 'center', marginTop: 16, lineHeight: 24, minHeight: 48 },
  mic: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    borderWidth: 3,
    borderColor: colors.divider,
  },
  micActive: { borderColor: colors.primary, backgroundColor: colors.successBg },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 14 },
  privacy: { fontSize: 11.5, color: colors.textFaint, textAlign: 'center', marginTop: 22 },
  intentCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radii.md + 4, padding: 16, marginTop: 14 },
  intentIcon: { width: 56, height: 56, borderRadius: 15, backgroundColor: colors.iconTileBlue, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  cardBody: { fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  queryRow: { fontSize: 15, color: colors.textPrimary, marginTop: 10 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 26, marginTop: 16 },
  link: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
