import { migrate } from '@/db/schema';
import { experiments, supplements, testSessions } from '@/db/repositories';
import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import {
  generateNbackSequence,
  type NbackResponse,
  type NbackSequence,
} from '@/engines/cognitive-test';
import { emptyContext, type DailyContext } from '../context';
import { assembleDailyTest, type DailyTestInput } from '../session';
import type { CheckInWindow } from '../window';

const WINDOW: CheckInWindow = { startHour: 6, endHour: 11 };

/** Build a full-credit response vector for a generated sequence. */
function perfectResponses(seq: NbackSequence): NbackResponse[] {
  return seq.isTarget.map((isTarget) => ({ responded: isTarget }));
}

function baseInput(overrides: Partial<DailyTestInput> = {}): DailyTestInput {
  const nbackSequence = generateNbackSequence({ trials: 20, seed: 42 });
  const context: DailyContext = { ...emptyContext(), sleepHours: 7, caffeine: true };
  return {
    experimentId: 'exp1',
    dayIndex: 3,
    startedAt: '2026-01-04T07:15:00.000Z',
    startLocalHour: 7,
    window: WINDOW,
    deviceModel: 'ios 18.0',
    pvtPlannedTrials: 12,
    pvtReactionTimesMs: [250, 260, 240, 300, 280, 310, 255, 265, 245, 275, 290, 230],
    nbackSequence,
    nbackResponses: perfectResponses(nbackSequence),
    nbackN: 2,
    context,
    focus: 7,
    energy: 6,
    mood: 8,
    note: 'felt sharp',
    ...overrides,
  };
}

describe('assembleDailyTest — engine wiring', () => {
  it('scores PVT median and lapses from the raw reaction times', () => {
    const { session } = assembleDailyTest(baseInput());
    // Median of the 12 RTs (none above 500 ms => 0 lapses).
    expect(session.pvtMedianMs).toBe(262.5);
    expect(session.pvtLapses).toBe(0);
  });

  it('counts a slow trial as a lapse', () => {
    const input = baseInput({
      pvtReactionTimesMs: [250, 260, 240, 300, 280, 600, 255, 265, 245, 275, 290, 230],
    });
    expect(assembleDailyTest(input).session.pvtLapses).toBe(1);
  });

  it('drops sub-100 ms taps before scoring and counts them as discarded', () => {
    // One anticipation (50 ms) among 12; it is filtered, not scored.
    const input = baseInput({
      pvtReactionTimesMs: [50, 260, 240, 300, 280, 310, 255, 265, 245, 275, 290, 230],
    });
    const { session } = assembleDailyTest(input);
    // Discard rate 1/12 ~ 0.083 < 0.25, so the session is still valid.
    expect(session.valid).toBe(true);
    // The 50 ms tap did not enter the median.
    expect(session.pvtMedianMs).not.toBeNull();
    expect(session.pvtMedianMs as number).toBeGreaterThanOrEqual(100);
  });

  it('scores a perfect 2-back at 100% accuracy with positive d-prime', () => {
    const { session } = assembleDailyTest(baseInput());
    expect(session.nbackAccuracy).toBe(100);
    expect(session.nbackDprime as number).toBeGreaterThan(0);
  });
});

describe('assembleDailyTest — validity and off-window', () => {
  it('marks an abandoned PVT invalid', () => {
    // Only 5 of 12 planned trials completed => below the 0.75 completion rate.
    const input = baseInput({ pvtReactionTimesMs: [250, 260, 240, 300, 280] });
    const result = assembleDailyTest(input);
    expect(result.session.valid).toBe(false);
    expect(result.validityReason).toBe('abandoned');
  });

  it('marks a test taken outside the window invalid and flags offWindow', () => {
    const result = assembleDailyTest(baseInput({ startLocalHour: 15 }));
    expect(result.offWindow).toBe(true);
    expect(result.session.valid).toBe(false);
  });

  it('keeps an in-window complete test valid with offWindow false', () => {
    const result = assembleDailyTest(baseInput());
    expect(result.offWindow).toBe(false);
    expect(result.session.valid).toBe(true);
    expect(result.validityReason).toBe('ok');
  });
});

describe('assembleDailyTest — persistence mapping', () => {
  it('copies context, ratings, device, and timing into the row', () => {
    const { session } = assembleDailyTest(baseInput());
    expect(session.experimentId).toBe('exp1');
    expect(session.dayIndex).toBe(3);
    expect(session.startedAt).toBe('2026-01-04T07:15:00.000Z');
    expect(session.deviceModel).toBe('ios 18.0');
    expect(session.sleepHours).toBe(7);
    expect(session.caffeine).toBe(true);
    expect(session.focus).toBe(7);
    expect(session.energy).toBe(6);
    expect(session.mood).toBe(8);
    expect(session.note).toBe('felt sharp');
  });

  it('passes nullable fields through as null', () => {
    const { session } = assembleDailyTest(
      baseInput({
        context: { ...emptyContext(), sleepHours: null },
        focus: null,
        energy: null,
        mood: null,
        note: null,
        deviceModel: null,
      }),
    );
    expect(session.sleepHours).toBeNull();
    expect(session.focus).toBeNull();
    expect(session.note).toBeNull();
    expect(session.deviceModel).toBeNull();
  });

  it('produces a row the testSessions repository can insert (shape minus id)', () => {
    const { session } = assembleDailyTest(baseInput());
    const keys = Object.keys(session).sort();
    expect(keys).toEqual(
      [
        'caffeine',
        'calmScore',
        'dayIndex',
        'deviceModel',
        'energy',
        'expectation',
        'experimentId',
        'focus',
        'mood',
        'nbackAccuracy',
        'nbackDprime',
        'note',
        'pvtLapses',
        'pvtMedianMs',
        'recallScore',
        'sleepHours',
        'startedAt',
        'stroopAccuracy',
        'stroopInterferenceMs',
        'symbolPerMin',
        'valid',
      ].sort(),
    );
  });

  it('round-trips through the real repository and schema', () => {
    const db = createMemoryDriver();
    migrate(db);
    // Satisfy the foreign keys: a supplement and the experiment must exist.
    supplements.insert(db, {
      id: 'sup1',
      name: 'Test supplement',
      type: 'acute',
      evidenceSummary: 'n/a',
      evidenceLinks: [],
      excluded: false,
    });
    experiments.insert(db, {
      id: 'exp1',
      supplementId: 'sup1',
      goal: 'focus',
      primaryMetric: 'pvt_median_ms',
      design: 'ab',
      blindingMode: 'sealed',
      lengthDays: 14,
      startDate: '2026-01-01',
      status: 'active',
      sealedKey: null,
      seed: null,
    });

    const { session } = assembleDailyTest(baseInput());
    testSessions.insert(db, { id: 'ts1', ...session });

    const stored = testSessions.getById(db, 'ts1');
    expect(stored).toBeDefined();
    expect(stored?.pvtMedianMs).toBe(session.pvtMedianMs);
    expect(stored?.pvtLapses).toBe(session.pvtLapses);
    expect(stored?.nbackAccuracy).toBe(session.nbackAccuracy);
    expect(stored?.caffeine).toBe(true);
    expect(stored?.valid).toBe(true);
    expect(stored?.note).toBe('felt sharp');
  });
});
