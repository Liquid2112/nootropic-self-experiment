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
  generateRecallSet,
  generateStroopTrials,
  generateSymbolSet,
  CALM_ITEMS,
  NBACK_DEFAULT_TRIALS,
  NBACK_N,
  PVT_DEFAULT_TRIALS,
  RECALL_STUDY_WORDS,
  SYMBOL_DURATION_MS,
  type NbackResponse,
  type NbackSequence,
  type StroopResponse,
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
import { batteryOf, checkInSteps, TEST_CATALOG, type CheckInStep, type TestId } from '@/features/battery';
import { PvtTask } from '@/screens/PvtTask';
import { CalmCheck } from '@/screens/battery/CalmCheck';
import { RecallStudy, RecallTest } from '@/screens/battery/RecallTasks';
import { StroopTask } from '@/screens/battery/StroopTask';
import { SymbolTask } from '@/screens/battery/SymbolTask';
import {
  GhostButton,
  ink,
  InkChip,
  LightButton,
  StepHeader,
  TaskIntro,
  TaskTrack,
  HAIRLINE,
} from '@/screens/battery/ink';
import { claimProgress, type GameState, type ProgressDelta } from '@/features/gamification';
import { Celebration } from '@/components/game';
import { Icon, Brian, type IconName } from '@/brand';
import { Card, Scaffold, Slider, brand, fonts, spacing } from '@/ui';
import { BASELINE_DAYS } from '@/engines/experiment';
import { runPosition, track, trackOnce } from '@/features/analytics';
import { measuredSleepSource } from '@/features/health/store';
import { localDay } from '@/features/gamification';

/** Where the flow is: the context taps, one battery step, or the end states. */
type Phase =
  | { kind: 'context' }
  | { kind: 'step'; index: number; intro: boolean }
  | { kind: 'saved' }
  | { kind: 'no-experiment' };

/** Timed tasks open with an intro card explaining the rules. */
const STEPS_WITH_INTRO: ReadonlySet<CheckInStep> = new Set([
  'pvt',
  'nback',
  'stroop',
  'symbol',
  'recall_study',
]);

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

/** A fresh 16-bit seed per stimulus set, so each test gets its own stream. */
function seedFor(offset: number): number {
  return ((Date.now() >> offset) ^ (offset * 2654435761)) & 0xffff;
}

/**
 * Daily test — a full-screen, distraction-free flow with no navigation chrome:
 * context capture, then the run's own battery (picked at setup), then the
 * self-report sliders. Older runs without a saved battery get the original
 * reaction test + 2-back. Reaction times use the high-resolution timer. On
 * completion it scores through the cognitive-test engine, flags
 * off-window/invalid runs, and persists one test_session row.
 */
export default function DailyTestScreen() {
  const router = useRouter();

  const experiment = useMemo<Experiment | null>(() => {
    const db = getDatabase();
    return experiments.listByStatus(db, 'active')[0] ?? null;
  }, []);

  const battery = useMemo<TestId[]>(() => (experiment ? batteryOf(experiment) : []), [experiment]);
  const steps = useMemo(() => checkInSteps(battery), [battery]);
  // The context taps are step 1 of the header count.
  const totalSteps = steps.length + 1;

  const [phase, setPhase] = useState<Phase>(experiment ? { kind: 'context' } : { kind: 'no-experiment' });

  // Context capture.
  const [context, setContext] = useState<DailyContext>(emptyContext());
  // Last night's sleep already synced from Health: skip asking for it. The
  // verdict reads the measured hours for this day when sleepHours stays null.
  const [sleepSource] = useState<string | null>(() => {
    try {
      return measuredSleepSource(getDatabase(), localDay(new Date()));
    } catch {
      return null;
    }
  });

  // Today's stimuli. Generated up front so a task can't change mid-run.
  const [pvtSchedule] = useState(() =>
    generatePvtSchedule({ trials: PVT_DEFAULT_TRIALS, seed: Date.now() & 0xffff }),
  );
  const [nbackSequence] = useState<NbackSequence>(() =>
    generateNbackSequence({ trials: NBACK_DEFAULT_TRIALS, seed: (Date.now() >> 4) & 0xffff }),
  );
  const [stroopTrials] = useState(() => generateStroopTrials({ seed: seedFor(3) }));
  const [symbolSet] = useState(() => generateSymbolSet({ seed: seedFor(5) }));
  const [recallSet] = useState(() => generateRecallSet({ seed: seedFor(7) }));

  // Collected answers.
  const rtRef = useRef<number[]>([]);
  const nbackResponsesRef = useRef<NbackResponse[]>([]);
  const stroopRef = useRef<StroopResponse[]>([]);
  const symbolRef = useRef<number[]>([]);
  const recallRef = useRef<string[]>([]);
  const [calmAnswers, setCalmAnswers] = useState<(number | null)[]>(() => CALM_ITEMS.map(() => null));

  // Self report.
  const [focus, setFocus] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState('');

  const [recorded, setRecorded] = useState(true);
  const [reward, setReward] = useState<{ game: GameState; delta: ProgressDelta } | null>(null);

  const startedAtRef = useRef<string>(new Date().toISOString());
  const startHourRef = useRef<number>(localHourOf(new Date()));

  const goToStep = useCallback(
    (index: number) => {
      const step = steps[index];
      if (!step) return;
      setPhase({ kind: 'step', index, intro: STEPS_WITH_INTRO.has(step) });
    },
    [steps],
  );
  const next = useCallback(
    (index: number) => () => goToStep(index + 1),
    [goToStep],
  );

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
      setPhase({ kind: 'saved' });
      return;
    }
    const has = (id: TestId) => battery.includes(id);
    const result = assembleDailyTest({
      experimentId: experiment.id,
      dayIndex,
      startedAt: startedAtRef.current,
      startLocalHour: startHourRef.current,
      window: DEFAULT_CHECK_IN_WINDOW,
      deviceModel: deviceModelLabel(readPlatformInfo()),
      ...(has('pvt') ? { pvtPlannedTrials: pvtSchedule.length, pvtReactionTimesMs: rtRef.current } : {}),
      ...(has('nback')
        ? {
            nbackSequence,
            nbackResponses: normalizeResponses(nbackResponsesRef.current, nbackSequence),
            nbackN: NBACK_N,
          }
        : {}),
      ...(has('stroop') ? { stroop: { trials: stroopTrials, responses: stroopRef.current } } : {}),
      ...(has('symbol')
        ? { symbol: { set: symbolSet, answers: symbolRef.current, durationMs: SYMBOL_DURATION_MS } }
        : {}),
      ...(has('recall') ? { recall: { set: recallSet, picked: recallRef.current } } : {}),
      ...(has('calm') ? { calmAnswers } : {}),
      context,
      focus,
      energy,
      mood,
      note: note.trim().length > 0 ? note.trim() : null,
    });
    testSessions.insert(db, { id: genNumericId(), ...result.session });
    // Retention: which day of the run this check-in was, and how many tests it
    // held. Never the scores.
    const pos = runPosition(dayIndex, BASELINE_DAYS);
    if (pos) {
      track('check_in_completed', { run_day: pos.runDay, phase: pos.phase, tests_count: battery.length });
    }
    // Funnel: the baseline is done at its last day, or at the first run-day
    // check-in when a baseline day was skipped.
    if (dayIndex >= -1) trackOnce(`baseline:${experiment.id}`, 'baseline_completed');
    // XP and badges only count that a check-in happened, never its scores.
    setReward(claimProgress(db));
    setPhase({ kind: 'saved' });
  }, [
    experiment,
    battery,
    pvtSchedule,
    nbackSequence,
    stroopTrials,
    symbolSet,
    recallSet,
    calmAnswers,
    context,
    focus,
    energy,
    mood,
    note,
  ]);

  if (phase.kind === 'no-experiment') {
    return (
      <Scaffold inverse scroll={false} contentStyle={styles.centerFill}>
        <Brian size={110} mood="sleepy" />
        <Text style={ink.title}>No active experiment</Text>
        <Text style={ink.muted}>Start an experiment to log a daily check-in.</Text>
        <LightButton label="Back to today" onPress={() => router.replace('/')} />
      </Scaffold>
    );
  }

  if (phase.kind === 'context') {
    return (
      <ContextStep
        total={totalSteps}
        tests={battery}
        context={context}
        onChange={setContext}
        sleepSource={sleepSource}
        onStart={() => goToStep(0)}
      />
    );
  }

  if (phase.kind === 'step') {
    const step = steps[phase.index]!;
    const stepNumber = phase.index + 2;
    const done = next(phase.index);

    if (phase.intro) {
      return (
        <Scaffold inverse scroll={false} contentStyle={styles.fill}>
          <TaskIntro
            step={stepNumber}
            total={totalSteps}
            {...introFor(step)}
            onStart={() => setPhase({ ...phase, intro: false })}
          />
        </Scaffold>
      );
    }

    switch (step) {
      case 'calm':
        return (
          <Scaffold inverse>
            <StepHeader
              step={stepNumber}
              total={totalSteps}
              title="How do you feel right now?"
              subtitle="Answer for this moment, not your week."
            />
            <CalmCheck answers={calmAnswers} onChange={setCalmAnswers} />
            <LightButton
              label="Next"
              testID="calm-next"
              disabled={calmAnswers.some((a) => a === null)}
              onPress={done}
            />
          </Scaffold>
        );
      case 'recall_study':
        return (
          <Scaffold inverse scroll={false} contentStyle={styles.fill}>
            <RecallStudy words={recallSet.study} onDone={done} />
          </Scaffold>
        );
      case 'pvt':
        return (
          <PvtTask
            schedule={pvtSchedule}
            onDone={(rts) => {
              rtRef.current = rts;
              done();
            }}
          />
        );
      case 'nback':
        return (
          <NbackStep
            sequence={nbackSequence}
            onDone={(responses) => {
              nbackResponsesRef.current = responses;
              done();
            }}
          />
        );
      case 'stroop':
        return (
          <Scaffold inverse scroll={false} contentStyle={styles.fill}>
            <StroopTask
              trials={stroopTrials}
              onDone={(responses) => {
                stroopRef.current = responses;
                done();
              }}
            />
          </Scaffold>
        );
      case 'symbol':
        return (
          <Scaffold inverse scroll={false} contentStyle={styles.fill}>
            <SymbolTask
              set={symbolSet}
              durationMs={SYMBOL_DURATION_MS}
              onDone={(answers) => {
                symbolRef.current = answers;
                done();
              }}
            />
          </Scaffold>
        );
      case 'recall_test':
        return (
          <Scaffold inverse>
            <StepHeader
              step={stepNumber}
              total={totalSteps}
              title="Which words did you see?"
              subtitle={`Tap the ${RECALL_STUDY_WORDS} words from the start of your check-in.`}
            />
            <RecallTest
              set={recallSet}
              onDone={(picked) => {
                recallRef.current = picked;
                done();
              }}
            />
          </Scaffold>
        );
      case 'ratings':
      default:
        return (
          <Scaffold inverse>
            <StepHeader
              step={stepNumber}
              total={totalSteps}
              title="Last thing: rate your day"
              subtitle="Go with your gut. There are no right answers."
            />
            <Card style={styles.lightCard}>
              <Slider label="Focus" value={focus} onChange={setFocus} lowLabel="Foggy" highLabel="Sharp" />
              <Slider label="Energy" value={energy} onChange={setEnergy} lowLabel="Drained" highLabel="Wired" />
              <Slider label="Mood" value={mood} onChange={setMood} lowLabel="Low" highLabel="Great" />
              <TextInput
                style={styles.noteInput}
                placeholder="Optional note"
                placeholderTextColor={brand.faint}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </Card>
            <LightButton label="Finish check-in" onPress={save} />
          </Scaffold>
        );
    }
  }

  // saved
  if (recorded && reward) {
    return (
      <Celebration
        title="Check-in complete!"
        subtitle={`${battery.length} tests, one more clean data point for your experiment.`}
        delta={reward.delta}
        game={reward.game}
        footnote="Scores stay sealed until your verdict. See you tomorrow."
        actionLabel="Back to today"
        onContinue={() => router.replace('/')}
      />
    );
  }
  return (
    <Scaffold inverse scroll={false} contentStyle={styles.centerFill}>
      <Brian size={110} mood={recorded ? 'happy' : 'wink'} />
      <Text style={ink.title}>{recorded ? 'Check-in saved' : 'Practice run done'}</Text>
      <Text style={ink.muted}>
        {recorded
          ? 'See you tomorrow.'
          : 'Today isn’t part of your experiment, so this run wasn’t recorded.'}
      </Text>
      <LightButton label="Done" onPress={() => router.replace('/')} />
    </Scaffold>
  );
}

/** The intro card copy for each timed task. */
function introFor(step: CheckInStep): {
  icon: IconName;
  measures: string;
  name: string;
  how: string;
  footnote?: string;
} {
  switch (step) {
    case 'pvt':
      return {
        ...pick('pvt'),
        how: 'A dot appears at random moments. Tap anywhere the instant you see it. Don’t jump early.',
      };
    case 'nback':
      return {
        ...pick('nback'),
        how: 'Letters appear one at a time. Tap Match when a letter is the same as the one two before it.',
        footnote: 'Example: K, T, K — the second K is a match.',
      };
    case 'stroop':
      return {
        ...pick('stroop'),
        how: 'Color words appear in colored ink. Tap the swatch for the ink color and ignore what the word says.',
        footnote: 'Example: RED written in blue ink — tap blue.',
      };
    case 'symbol':
      return {
        ...pick('symbol'),
        how: 'The key at the top pairs each symbol with a number. Tap the number for the big symbol. Go fast, you have 45 seconds.',
        footnote: 'The key changes every day.',
      };
    case 'recall_study':
      return {
        ...pick('recall'),
        how: `${RECALL_STUDY_WORDS} words will flash by. Remember as many as you can. You’ll pick them out at the end of your check-in.`,
      };
    default:
      return { icon: 'sparkle', measures: '', name: '', how: '' };
  }
}

function pick(id: TestId) {
  const t = TEST_CATALOG[id];
  return { icon: t.icon, measures: t.measures, name: t.name };
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
  total,
  tests,
  context,
  onChange,
  sleepSource,
  onStart,
}: {
  total: number;
  tests: TestId[];
  context: DailyContext;
  onChange: (c: DailyContext) => void;
  /** "Apple Health" when last night's sleep already synced, else null. */
  sleepSource: string | null;
  onStart: () => void;
}) {
  const [askSleep, setAskSleep] = useState(sleepSource === null);
  return (
    <Scaffold inverse>
      <StepHeader
        step={1}
        total={total}
        title="Before you start"
        subtitle={
          askSleep
            ? 'Three quick taps so the analysis can account for your day.'
            : 'Two quick taps so the analysis can account for your day.'
        }
      />

      <View style={ink.darkCard}>
        <View style={styles.labelRow}>
          <Icon name="moon" size={18} color={brand.lilac} />
          <Text style={ink.label}>Hours slept last night</Text>
        </View>
        {askSleep ? null : (
          <View style={styles.sleepSyncedRow}>
            <Text style={ink.muted}>Measured by {sleepSource}. Nothing to tap.</Text>
            <Pressable accessibilityRole="button" onPress={() => setAskSleep(true)} hitSlop={8}>
              <Text style={styles.sleepOverride}>Enter it myself</Text>
            </Pressable>
          </View>
        )}
        <View style={[ink.chipRow, askSleep ? null : styles.hidden]}>
          {SLEEP_HOUR_OPTIONS.map((h) => (
            <InkChip
              key={h}
              label={`${h}h`}
              selected={context.sleepHours === h}
              onPress={() => onChange({ ...context, sleepHours: h })}
            />
          ))}
        </View>
      </View>

      <View style={ink.darkCard}>
        <View style={styles.labelRow}>
          <Icon name="bolt" size={18} color={brand.lilac} />
          <Text style={ink.label}>Had caffeine today?</Text>
        </View>
        <View style={ink.chipRow}>
          <InkChip label="No" selected={!context.caffeine} onPress={() => onChange({ ...context, caffeine: false })} />
          <InkChip label="Yes" selected={context.caffeine} onPress={() => onChange({ ...context, caffeine: true })} />
        </View>
      </View>

      <View style={ink.darkCard}>
        <View style={styles.labelRow}>
          <Icon name="target" size={18} color={brand.lilac} />
          <Text style={ink.label}>Device</Text>
        </View>
        <View style={ink.chipRow}>
          {(['phone', 'tablet'] as FormFactor[]).map((f) => (
            <InkChip
              key={f}
              label={f === 'phone' ? 'Phone' : 'Tablet'}
              selected={context.formFactor === f}
              onPress={() => onChange({ ...context, formFactor: f })}
            />
          ))}
        </View>
      </View>

      <View style={styles.lineup}>
        <Text style={ink.eyebrow}>{`TODAY’S TESTS`}</Text>
        <View style={styles.lineupRow}>
          {tests.map((id) => (
            <View key={id} style={styles.lineupPill}>
              <Icon name={TEST_CATALOG[id].icon} size={14} color={brand.lilac} />
              <Text style={styles.lineupText}>{TEST_CATALOG[id].name}</Text>
            </View>
          ))}
        </View>
      </View>

      <LightButton label="Start test" onPress={onStart} />
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
  const total = sequence.letters.length;

  return (
    <Scaffold inverse scroll={false} contentStyle={styles.nbackLayout}>
      <View style={styles.nbackTop}>
        <Text style={ink.progress}>{`${index + 1} / ${total}`}</Text>
        <TaskTrack fraction={index / Math.max(1, total)} />
        <Text style={ink.muted}>Tap Match when the letter matches the one 2 back</Text>
      </View>
      <View style={styles.letterTile}>
        <Text style={styles.nbackLetter}>{letter}</Text>
      </View>
      <View style={styles.nbackButtons}>
        <LightButton
          label="Match"
          onPress={markMatch}
          disabled={!eligible}
          accessibilityHint="The current letter matches the one two positions back"
        />
        <GhostButton label="No match" onPress={advance} />
      </View>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  fill: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sleepSyncedRow: { gap: spacing.xs },
  sleepOverride: { fontSize: 15, fontFamily: fonts.semibold, color: brand.lilac },
  hidden: { display: 'none' },
  lightCard: { gap: spacing.lg, borderRadius: 24 },
  lineup: { gap: spacing.sm, paddingTop: spacing.xs },
  lineupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lineupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    backgroundColor: 'rgba(183,166,255,0.08)',
  },
  lineupText: { fontSize: 13, fontFamily: fonts.medium, color: brand.white },
  noteInput: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: 14,
    padding: spacing.md,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: brand.ink,
    backgroundColor: brand.paper,
    textAlignVertical: 'top',
  },
  nbackLayout: { flex: 1, justifyContent: 'space-between', paddingTop: 56, paddingBottom: spacing.xl },
  nbackTop: { gap: spacing.md, alignItems: 'center' },
  letterTile: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 40,
    backgroundColor: brand.ink2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nbackLetter: {
    fontSize: 104,
    lineHeight: 120,
    fontFamily: fonts.display,
    color: brand.white,
  },
  nbackButtons: {
    width: '100%',
    gap: spacing.md,
  },
});
