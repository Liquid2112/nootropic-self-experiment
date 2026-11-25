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
import { claimProgress, type GameState, type ProgressDelta } from '@/features/gamification';
import { Celebration } from '@/components/game';
import { Icon, Brian } from '@/brand';
import { Card, Scaffold, Slider, brand, fonts, radius, spacing } from '@/ui';
import { BASELINE_DAYS } from '@/engines/experiment';
import { runPosition, track, trackOnce } from '@/features/analytics';
import { measuredSleepSource } from '@/features/health/store';
import { localDay } from '@/features/gamification';

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
  // Last night's sleep already synced from Health: skip asking for it. The
  // verdict reads the measured hours for this day when sleepHours stays null.
  const [sleepSource] = useState<string | null>(() => {
    try {
      return measuredSleepSource(getDatabase(), localDay(new Date()));
    } catch {
      return null;
    }
  });

  // PVT schedule + collected RTs.
  const [pvtSchedule] = useState(() =>
    generatePvtSchedule({ trials: PVT_DEFAULT_TRIALS, seed: Date.now() & 0xffff }),
  );
  const rtRef = useRef<number[]>([]);

  // N-back sequence + collected responses.
  const [nbackSequence] = useState<NbackSequence>(() =>
    generateNbackSequence({ trials: NBACK_DEFAULT_TRIALS, seed: (Date.now() >> 4) & 0xffff }),
  );
  const nbackResponsesRef = useRef<NbackResponse[]>([]);

  // Self report.
  const [focus, setFocus] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState('');

  const [recorded, setRecorded] = useState(true);
  const [reward, setReward] = useState<{ game: GameState; delta: ProgressDelta } | null>(null);

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
    // Retention: which day of the run this check-in was. Never the scores.
    const pos = runPosition(dayIndex, BASELINE_DAYS);
    if (pos) track('check_in_completed', { run_day: pos.runDay, phase: pos.phase });
    // Funnel: the baseline is done at its last day, or at the first run-day
    // check-in when a baseline day was skipped.
    if (dayIndex >= -1) trackOnce(`baseline:${experiment.id}`, 'baseline_completed');
    // XP and badges only count that a check-in happened, never its scores.
    setReward(claimProgress(db));
    setPhase('saved');
  }, [experiment, pvtSchedule, nbackSequence, context, focus, energy, mood, note]);

  if (phase === 'no-experiment') {
    return (
      <Scaffold inverse scroll={false} contentStyle={styles.centerFill}>
        <Brian size={110} mood="sleepy" />
        <Text style={styles.invTitle}>No active experiment</Text>
        <Text style={styles.invMuted}>Start an experiment to log a daily check-in.</Text>
        <LightButton label="Back to today" onPress={() => router.replace('/')} />
      </Scaffold>
    );
  }

  if (phase === 'context') {
    return (
      <ContextStep
        context={context}
        onChange={setContext}
        sleepSource={sleepSource}
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
        <StepHeader step={3} title="How do you feel right now?" subtitle="Go with your gut. There are no right answers." />
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

  // saved
  if (recorded && reward) {
    return (
      <Celebration
        title="Check-in complete!"
        subtitle="Another clean data point for your experiment."
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
      <Text style={styles.invTitle}>{recorded ? 'Check-in saved' : 'Practice run done'}</Text>
      <Text style={styles.invMuted}>
        {recorded
          ? 'See you tomorrow.'
          : 'Today isn\u2019t part of your experiment, so this run wasn\u2019t recorded.'}
      </Text>
      <LightButton label="Done" onPress={() => router.replace('/')} />
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

// --- shared pieces ---------------------------------------------------------

/** White pill button for the ink screens (the ink primary would vanish here). */
function LightButton({
  label,
  onPress,
  disabled = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lightButton,
        pressed && !disabled ? styles.lightButtonPressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={styles.lightButtonText}>{label}</Text>
    </Pressable>
  );
}

/** Outlined pill for a secondary action on the ink screens. */
function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ghostButton, pressed ? styles.ghostPressed : null]}
    >
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

/** "Step N of 3" eyebrow, title and optional subtitle for the check-in. */
function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepDots}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.stepDot, n <= step ? styles.stepDotOn : null]} />
        ))}
      </View>
      <Text style={styles.eyebrow}>{`STEP ${step} OF 3`}</Text>
      <Text style={styles.invTitle}>{title}</Text>
      {subtitle ? <Text style={styles.invMuted}>{subtitle}</Text> : null}
    </View>
  );
}

// --- Context step ----------------------------------------------------------

function ContextStep({
  context,
  onChange,
  sleepSource,
  onStart,
}: {
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
        title="Before you start"
        subtitle={
          askSleep
            ? 'Three quick taps so the analysis can account for your day.'
            : 'Two quick taps so the analysis can account for your day.'
        }
      />

      <View style={styles.darkCard}>
        <View style={styles.labelRow}>
          <Icon name="moon" size={18} color={brand.lilac} />
          <Text style={styles.invLabel}>Hours slept last night</Text>
        </View>
        {askSleep ? null : (
          <View style={styles.sleepSyncedRow}>
            <Text style={styles.invMuted}>Measured by {sleepSource}. Nothing to tap.</Text>
            <Pressable accessibilityRole="button" onPress={() => setAskSleep(true)} hitSlop={8}>
              <Text style={styles.sleepOverride}>Enter it myself</Text>
            </Pressable>
          </View>
        )}
        <View style={[styles.chipRow, askSleep ? null : styles.hidden]}>
          {SLEEP_HOUR_OPTIONS.map((h) => (
            <Chip
              key={h}
              label={`${h}h`}
              selected={context.sleepHours === h}
              onPress={() => onChange({ ...context, sleepHours: h })}
            />
          ))}
        </View>
      </View>

      <View style={styles.darkCard}>
        <View style={styles.labelRow}>
          <Icon name="bolt" size={18} color={brand.lilac} />
          <Text style={styles.invLabel}>Had caffeine today?</Text>
        </View>
        <View style={styles.chipRow}>
          <Chip label="No" selected={!context.caffeine} onPress={() => onChange({ ...context, caffeine: false })} />
          <Chip label="Yes" selected={context.caffeine} onPress={() => onChange({ ...context, caffeine: true })} />
        </View>
      </View>

      <View style={styles.darkCard}>
        <View style={styles.labelRow}>
          <Icon name="target" size={18} color={brand.lilac} />
          <Text style={styles.invLabel}>Device</Text>
        </View>
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
        <Text style={styles.pvtProgress}>{`${index + 1} / ${total}`}</Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${(index / Math.max(1, total)) * 100}%` }]} />
        </View>
        <Text style={styles.invMuted}>Tap Match when the letter matches the one 2 back</Text>
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

const DIM = 'rgba(255,255,255,0.6)';
const HAIRLINE = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  stepHeader: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xs },
  stepDots: { flexDirection: 'row', gap: 6, marginBottom: spacing.xs },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: HAIRLINE },
  stepDotOn: { backgroundColor: brand.lilac },
  eyebrow: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 1.2, color: brand.lilac },
  invTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.display,
    letterSpacing: -0.6,
    color: brand.white,
  },
  invMuted: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fonts.regular,
    color: DIM,
  },
  invLabel: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: brand.white,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sleepSyncedRow: { gap: spacing.xs },
  sleepOverride: { fontSize: 15, fontFamily: fonts.semibold, color: brand.lilac },
  hidden: { display: 'none' },
  darkCard: {
    backgroundColor: brand.ink2,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  lightCard: { gap: spacing.lg, borderRadius: 24 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipIdle: {
    borderColor: HAIRLINE,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipSelected: {
    borderColor: brand.white,
    backgroundColor: brand.white,
  },
  chipText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: brand.white,
  },
  chipTextSelected: {
    color: brand.ink,
    fontFamily: fonts.semibold,
  },
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
  lightButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
  },
  lightButtonPressed: { backgroundColor: brand.paperDeep, transform: [{ translateY: 1 }] },
  lightButtonText: { fontSize: 17, fontFamily: fonts.semibold, color: brand.ink },
  disabled: { opacity: 0.35 },
  ghostButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  ghostPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  ghostText: { fontSize: 17, fontFamily: fonts.semibold, color: brand.white },
  pvtProgress: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  track: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: HAIRLINE, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2, backgroundColor: brand.lilac },
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
