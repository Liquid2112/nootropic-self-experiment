import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  experiments,
  getDatabase,
  scheduleDays,
  testSessions,
  type Experiment,
} from '@/db';
import {
  generateNbackSequence,
  generatePvtSchedule,
  NBACK_DEFAULT_TRIALS,
  NBACK_N,
  PVT_DEFAULT_TRIALS,
  type NbackResponse,
  type NbackSequence,
} from '@/engines/cognitive-test';
import {
  assembleDailyTest,
  checkInDayIndex,
  deviceModelLabel,
  DEFAULT_CHECK_IN_WINDOW,
  emptyContext,
  localHourOf,
  SLEEP_HOUR_OPTIONS,
  type DailyContext,
  type DeviceInfoReader,
  type FormFactor,
} from '@/features/daily-loop';
import { PvtTask } from '@/screens/PvtTask';
import {
  Button,
  Card,
  Scaffold,
  Slider,
  colors,
  radius,
  spacing,
  typography,
} from '@/ui';

type Phase = 'context' | 'pvt' | 'nback' | 'ratings' | 'saved' | 'no-experiment';

/** Read device info from the runtime using React Native's Platform. */
function readPlatformInfo(): DeviceInfoReader {
  return {
    os: Platform.OS,
    osVersion:
      typeof Platform.Version === 'string' || typeof Platform.Version === 'number'
        ? String(Platform.Version)
        : null,
    modelName: null,
  };
}

function genNumericId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Daily test — a full-screen, distraction-free flow of four parts with no
 * navigation chrome: context capture, PVT, 2-back, and self-report sliders.
 * Reaction times use the high-resolution timer. On completion it scores through
 * the cognitive-test engine, flags off-window/invalid runs, and persists one
 * test_session row.
 */
export default function DailyTestScreen() {
  const router = useRouter();

  const experiment = useMemo<Experiment | null>(() => {
    const db = getDatabase();
    return experiments.listByStatus(db, 'active')[0] ?? null;
  }, []);

  const [phase, setPhase] = useState<Phase>(experiment ? 'context' : 'no-experiment');

  // Context capture.
  const [context, setContext] = useState<DailyContext>(emptyContext());

  // PVT schedule + collected RTs.
  const pvtSchedule = useMemo(
    () => generatePvtSchedule({ trials: PVT_DEFAULT_TRIALS, seed: Date.now() & 0xffff }),
    [],
  );
  const rtRef = useRef<number[]>([]);

  // N-back sequence + collected responses.
  const nbackSequence = useMemo<NbackSequence>(
    () => generateNbackSequence({ trials: NBACK_DEFAULT_TRIALS, seed: (Date.now() >> 4) & 0xffff }),
    [],
  );
  const nbackResponsesRef = useRef<NbackResponse[]>([]);

  // Self report.
  const [focus, setFocus] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState('');

  const [recorded, setRecorded] = useState(true);

  const startedAtRef = useRef<string>(new Date().toISOString());
  const startHourRef = useRef<number>(localHourOf(new Date()));

  const save = useCallback(() => {
    if (!experiment) {
      return;
    }
    const db = getDatabase();
    const dayIndex = currentDayIndex(experiment);
    if (dayIndex === null) {
      // Outside both the baseline and the run: there is no day to attach this
      // check-in to, so it is treated as practice and not stored (it used to be
      // written as day 0, silently overwriting the first run day's data).
      setRecorded(false);
      setPhase('saved');
      return;
    }
    const result = assembleDailyTest({
      experimentId: experiment.id,
      dayIndex,
      startedAt: startedAtRef.current,
      startLocalHour: startHourRef.current,
      window: DEFAULT_CHECK_IN_WINDOW,
      deviceModel: deviceModelLabel(readPlatformInfo()),
      pvtPlannedTrials: pvtSchedule.length,
      pvtReactionTimesMs: rtRef.current,
      nbackSequence,
      nbackResponses: normalizeResponses(nbackResponsesRef.current, nbackSequence),
      nbackN: NBACK_N,
      context,
      focus,
      energy,
      mood,
      note: note.trim().length > 0 ? note.trim() : null,
    });
    testSessions.insert(db, { id: genNumericId(), ...result.session });
    setPhase('saved');
  }, [experiment, pvtSchedule, nbackSequence, context, focus, energy, mood, note]);

  if (phase === 'no-experiment') {
    return (
      <Scaffold inverse scroll={false}>
        <Text style={styles.invTitle}>No active experiment</Text>
        <Button label="Back" variant="secondary" onPress={() => router.replace('/')} />
      </Scaffold>
    );
  }

  if (phase === 'context') {
    return (
      <ContextStep
        context={context}
        onChange={setContext}
        onStart={() => {
          rtRef.current = [];
          setPhase('pvt');
        }}
      />
    );
  }

  if (phase === 'pvt') {
    return (
      <PvtTask
        schedule={pvtSchedule}
        onDone={(rts) => {
          rtRef.current = rts;
          nbackResponsesRef.current = [];
          setPhase('nback');
        }}
      />
    );
  }

  if (phase === 'nback') {
    return (
      <NbackStep
        sequence={nbackSequence}
        onDone={(responses) => {
          nbackResponsesRef.current = responses;
          setPhase('ratings');
        }}
      />
    );
  }

  if (phase === 'ratings') {
    return (
      <Scaffold inverse>
        <Text style={styles.invTitle}>How do you feel right now?</Text>
        <Card style={styles.darkCard}>
          <Slider label="Focus" value={focus} onChange={setFocus} lowLabel="Foggy" highLabel="Sharp" />
          <Slider label="Energy" value={energy} onChange={setEnergy} lowLabel="Drained" highLabel="Wired" />
          <Slider label="Mood" value={mood} onChange={setMood} lowLabel="Low" highLabel="Great" />
          <TextInput
            style={styles.noteInput}
            placeholder="Optional note"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </Card>
        <Button label="Finish check-in" onPress={save} />
      </Scaffold>
    );
  }

  // saved
  return (
    <Scaffold inverse scroll={false}>
      <Text style={styles.invTitle}>{recorded ? 'Check-in saved' : 'Practice run done'}</Text>
      <Text style={styles.invMuted}>
        {recorded
          ? 'See you tomorrow.'
          : 'Today isn\u2019t part of your experiment, so this run wasn\u2019t recorded.'}
      </Text>
      <Button label="Done" onPress={() => router.replace('/')} />
    </Scaffold>
  );
}

/**
 * Day index for a check-in today: the schedule day during the run, a negative
 * baseline index (-3..-1) during the 3-day baseline, or null outside both.
 */
function currentDayIndex(experiment: Experiment): number | null {
  const db = getDatabase();
  const schedule = scheduleDays.listForExperiment(db, experiment.id);
  const now2 = new Date();
  const iso = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-${String(
    now2.getDate(),
  ).padStart(2, '0')}`;
  return checkInDayIndex(experiment, schedule, iso);
}

/** Pad or trim the collected responses to exactly the sequence length. */
function normalizeResponses(
  responses: NbackResponse[],
  sequence: NbackSequence,
): NbackResponse[] {
  const out: NbackResponse[] = [];
  for (let i = 0; i < sequence.isTarget.length; i += 1) {
    out.push(responses[i] ?? { responded: false });
  }
  return out;
}

// --- Context step ----------------------------------------------------------

function ContextStep({
  context,
  onChange,
  onStart,
}: {
  context: DailyContext;
  onChange: (c: DailyContext) => void;
  onStart: () => void;
}) {
  return (
    <Scaffold inverse>
      <Text style={styles.invTitle}>Before you start</Text>

      <Card style={styles.darkCard}>
        <Text style={styles.invLabel}>Hours slept last night</Text>
        <View style={styles.chipRow}>
          {SLEEP_HOUR_OPTIONS.map((h) => (
            <Chip
              key={h}
              label={`${h}h`}
              selected={context.sleepHours === h}
              onPress={() => onChange({ ...context, sleepHours: h })}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.darkCard}>
        <Text style={styles.invLabel}>Had caffeine today?</Text>
        <View style={styles.chipRow}>
          <Chip label="No" selected={!context.caffeine} onPress={() => onChange({ ...context, caffeine: false })} />
          <Chip label="Yes" selected={context.caffeine} onPress={() => onChange({ ...context, caffeine: true })} />
        </View>
      </Card>

      <Card style={styles.darkCard}>
        <Text style={styles.invLabel}>Device</Text>
        <View style={styles.chipRow}>
          {(['phone', 'tablet'] as FormFactor[]).map((f) => (
            <Chip
              key={f}
              label={f === 'phone' ? 'Phone' : 'Tablet'}
              selected={context.formFactor === f}
              onPress={() => onChange({ ...context, formFactor: f })}
            />
          ))}
        </View>
      </Card>

      <Button label="Start test" onPress={onStart} />
    </Scaffold>
  );
}

// --- N-back step -----------------------------------------------------------

function NbackStep({
  sequence,
  onDone,
}: {
  sequence: NbackSequence;
  onDone: (responses: NbackResponse[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const respondedRef = useRef<NbackResponse[]>(sequence.letters.map(() => ({ responded: false })));

  const advance = useCallback(() => {
    const next = index + 1;
    if (next >= sequence.letters.length) {
      onDone(respondedRef.current);
      return;
    }
    setIndex(next);
  }, [index, sequence.letters.length, onDone]);

  const markMatch = useCallback(() => {
    const copy = [...respondedRef.current];
    copy[index] = { responded: true };
    respondedRef.current = copy;
    advance();
  }, [index, advance]);

  const letter = sequence.letters[index] ?? '';
  const eligible = index >= NBACK_N;

  return (
    <Scaffold inverse scroll={false}>
      <Text style={styles.invMuted}>Tap &quot;Match&quot; when the letter matches the one 2 back</Text>
      <Text style={styles.pvtProgress}>{`${index + 1} / ${sequence.letters.length}`}</Text>
      <Text style={styles.nbackLetter}>{letter}</Text>
      <View style={styles.nbackButtons}>
        <Button
          label="Match"
          onPress={markMatch}
          disabled={!eligible}
          accessibilityHint="The current letter matches the one two positions back"
        />
        <Button label="No match" variant="secondary" onPress={advance} />
      </View>
    </Scaffold>
  );
}

// --- shared chip -----------------------------------------------------------

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    >
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  invTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.textInverse,
    textAlign: 'center',
  },
  invMuted: {
    fontSize: typography.body.fontSize,
    color: colors.textInverse,
    opacity: 0.7,
    textAlign: 'center',
  },
  invLabel: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.textInverse,
  },
  darkCard: {
    backgroundColor: colors.surfaceInverse,
    borderColor: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipIdle: {
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  chipText: {
    fontSize: typography.body.fontSize,
    color: colors.textInverse,
  },
  chipTextSelected: {
    color: colors.onAccent,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textInverse,
    textAlignVertical: 'top',
  },
  pvtProgress: {
    fontSize: typography.body.fontSize,
    color: colors.textInverse,
    opacity: 0.6,
  },
  nbackLetter: {
    fontSize: 96,
    fontWeight: '700',
    color: colors.textInverse,
  },
  nbackButtons: {
    width: '100%',
    gap: spacing.md,
  },
});
