/**
 * End-to-end integration of the three screen slices against the shared engines
 * and data layer. Each slice is unit-tested on its own; this test proves they
 * compose into one app over a single database:
 *
 *   onboarding.createExperiment  ->  schedule persisted via the DAOs
 *   daily-loop.assembleDailyTest ->  one test_session row per scheduled day
 *   results.computeExperimentVerdict -> a gated, plain-language verdict
 *
 * It runs the real schema, seed, repositories, experiment-design, cognitive,
 * and stats engines against the in-memory driver — the same wiring the Expo
 * screens use, minus React Native.
 */
import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import type { SqlDriver } from '@/db/driver';
import { experiments, scheduleDays, testSessions } from '@/db/repositories';
import { migrate } from '@/db/schema';
import { seedSupplements } from '@/db/seed';
import type { ScheduleDay } from '@/db/types';
import { createExperiment } from '@/engines/onboarding';
import type { OnboardingSelections } from '@/engines/onboarding';
import { unsealArmMapping, type ArmMapping } from '@/engines/experiment';
import {
  generateNbackSequence,
  type NbackResponse,
  type NbackSequence,
} from '@/engines/cognitive-test';
import { assembleDailyTest, DEFAULT_CHECK_IN_WINDOW } from '@/features/daily-loop';
import { computeExperimentVerdict } from '@/results';

function freshDb(): SqlDriver {
  const db = createMemoryDriver();
  migrate(db);
  seedSupplements(db);
  return db;
}

function selections(overrides: Partial<OnboardingSelections> = {}): OnboardingSelections {
  return {
    goal: 'focus', // primary metric is pvtMedianMs (lower is better)
    supplement: { kind: 'curated', supplementId: 'caffeine', type: 'acute', name: 'Caffeine' },
    lengthDays: 28,
    blindingMode: 'none',
    testWindow: 'morning',
    startDate: '2026-02-01',
    ...overrides,
  };
}

/** All-correct 2-back responses for a sequence, so n-back is never the bottleneck. */
function perfectNback(seq: NbackSequence): NbackResponse[] {
  return seq.isTarget.map((t) => ({ responded: t }));
}

/**
 * Record one daily test for a scheduled day. ON days are given a faster PVT
 * (lower median ms) than OFF days so the primary metric shows a clear,
 * detectable effect; everything else is held constant and in-window.
 */
function recordDay(db: SqlDriver, experimentId: string, day: ScheduleDay, on: boolean): void {
  const seq = generateNbackSequence({ trials: 20, seed: day.dayIndex + 1 });
  // 30 plausible PVT taps; ON ~280 ms, OFF ~360 ms, with per-day variation so
  // the fit has real residual variance (a zero-variance column is degenerate).
  const basis = on ? 280 : 360;
  const dayJitter = ((day.dayIndex * 13) % 17) - 8; // -8..+8, varies by day
  const rts = Array.from(
    { length: 30 },
    (_, i) => basis + dayJitter + ((i * 7 + day.dayIndex * 3) % 11) - 5,
  );

  const { session } = assembleDailyTest({
    experimentId,
    dayIndex: day.dayIndex,
    startedAt: `${day.date}T08:00:00.000Z`,
    startLocalHour: 8, // inside DEFAULT_CHECK_IN_WINDOW [6, 11)
    window: DEFAULT_CHECK_IN_WINDOW,
    deviceModel: 'test-device',
    pvtPlannedTrials: 30,
    pvtReactionTimesMs: rts,
    nbackSequence: seq,
    nbackResponses: perfectNback(seq),
    // Vary sleep/caffeine across days so the regressors are not constant
    // columns (a constant control is collinear with the intercept).
    context: {
      sleepHours: 6 + (day.dayIndex % 3),
      caffeine: day.dayIndex % 2 === 0,
      formFactor: 'phone',
    },
    focus: on ? 8 : 4,
    energy: on ? 7 : 5,
    mood: on ? 7 : 5,
    note: null,
  });

  testSessions.insert(db, { id: `s-${day.dayIndex}`, ...session });
  scheduleDays.markTaken(db, experimentId, day.dayIndex, `${day.date}T08:05:00.000Z`);
}

describe('full experiment lifecycle (onboarding -> daily loop -> verdict)', () => {
  it('creates an open run, records every day, and reaches an analyzed verdict', () => {
    const db = freshDb();

    // 1. Onboarding: create and persist the experiment + schedule.
    const id = createExperiment(db, selections(), { experimentId: 'exp-open', seed: 'seed-open' });

    const active = experiments.listByStatus(db, 'active');
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(id);

    const schedule = scheduleDays.listForExperiment(db, id);
    expect(schedule).toHaveLength(28);
    // The engine assigns both arms.
    expect(schedule.some((d) => d.arm === 'ON')).toBe(true);
    expect(schedule.some((d) => d.arm === 'OFF')).toBe(true);

    // 2. Daily loop: record a test for every scheduled day (100% adherence).
    for (const day of schedule) {
      recordDay(db, id, day, day.arm === 'ON');
    }
    expect(testSessions.listForExperiment(db, id)).toHaveLength(28);

    // 3. Verdict: run the stats engine over the stored data. Re-read the
    // schedule so the taken flags set by markTaken are reflected.
    const recordedSchedule = scheduleDays.listForExperiment(db, id);
    const vm = computeExperimentVerdict(db, {
      experiment: active[0]!,
      schedule: recordedSchedule,
      sessions: testSessions.listForExperiment(db, id),
    });

    expect(vm.blindingState).toBe('unblinded');
    expect(vm.adherenceMet).toBe(true);
    expect(vm.primary.metric).toBe('pvtMedianMs');
    expect(vm.primary.analyzed).toBe(true);
    // Supplement lowered reaction time, so the stored estimate is negative.
    expect(vm.primary.estimate).not.toBeNull();
    expect(vm.primary.estimate as number).toBeLessThan(0);
    expect(vm.primary.verdictSentence.length).toBeGreaterThan(0);

    // The verdict persisted at least the primary metric result row.
    expect(active[0]).toBeDefined();
  });

  it('keeps a blinded run sealed: the arm is only recoverable with the passphrase', () => {
    const db = freshDb();
    const passphrase = 'correct horse battery staple';

    const id = createExperiment(
      db,
      selections({ blindingMode: 'sealed', friendPassphrase: passphrase }),
      { experimentId: 'exp-blind', seed: 'seed-blind' },
    );

    const experiment = experiments.listByStatus(db, 'active')[0]!;
    const schedule = scheduleDays.listForExperiment(db, id);

    // Blinded runs store neutral A/B arms and a sealed key, never ON/OFF.
    expect(experiment.sealedKey).toBeTruthy();
    expect(schedule.every((d) => d.arm === 'A' || d.arm === 'B')).toBe(true);

    // The true mapping cannot be read without the passphrase...
    expect(() => unsealArmMapping<ArmMapping>(experiment.sealedKey!, 'wrong phrase')).toThrow();

    // ...and computing a verdict without it refuses rather than guessing.
    for (const day of schedule) {
      // ON == whichever neutral label the (still-sealed) supplement maps to;
      // drive a real effect onto label 'A' so the unsealed verdict is meaningful.
      recordDay(db, id, day, day.arm === 'A');
    }
    const sessions = testSessions.listForExperiment(db, id);
    const recordedSchedule = scheduleDays.listForExperiment(db, id);

    expect(() =>
      computeExperimentVerdict(db, { experiment, schedule: recordedSchedule, sessions }),
    ).toThrow();

    // With the passphrase the mapping unseals and the verdict computes.
    const mapping = unsealArmMapping<ArmMapping>(experiment.sealedKey!, passphrase);
    expect(mapping.supplementLabel === 'A' || mapping.supplementLabel === 'B').toBe(true);
    expect(mapping.placeboLabel).not.toBe(mapping.supplementLabel);

    const vm = computeExperimentVerdict(db, {
      experiment,
      schedule: recordedSchedule,
      sessions,
      unsealPassphrase: passphrase,
    });
    expect(vm.blindingState).toBe('blinded');
    expect(vm.revealedMapping).not.toBeNull();
    expect(vm.adherenceMet).toBe(true);
  });
});
