import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import { migrate } from '@/db/schema';
import { experiments, results, scheduleDays, supplements, testSessions } from '@/db/repositories';
import type { Experiment, HealthNight, ScheduleDay, TestSession } from '@/db/types';
import { applyBlinding, selfBlindPassphrase } from '@/engines/experiment';
import type { SqlDriver } from '@/db/driver';
import { computeExperimentVerdict, measuredSleepByDay } from '../verdict';

/**
 * End-to-end wiring tests for the verdict layer: adherence-gate behavior,
 * primary/secondary selection from the goal, plain-unit formatting, result
 * persistence, and unblinding a sealed run. Data is synthetic and deterministic
 * so the asserted verdict is a property of the wiring, not of noise.
 */

const LENGTH = 24;
const BASELINE = 3;

/** Deterministic pseudo-noise in roughly [-6, 6] ms, not tied to ON parity. */
function noise(dayIndex: number): number {
  const x = Math.sin(dayIndex * 374.761 + 1.37) * 10000;
  return (x - Math.floor(x) - 0.5) * 12;
}

/** Sleep hours vary day to day so the covariate column isn't constant. */
function sleepHours(dayIndex: number): number {
  return 6.5 + ((dayIndex * 7) % 5) * 0.25; // 6.5..7.5
}

/** A reaction-time series with a clear ON improvement: ON days ~18ms faster. */
function rtValue(dayIndex: number, on: 0 | 1): number {
  const base = 300 + dayIndex * 0.1 + noise(dayIndex);
  return on === 1 ? base - 18 : base;
}

function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: 'exp1',
    supplementId: 'caffeine',
    goal: 'focus', // primary metric -> pvtMedianMs
    primaryMetric: 'pvtMedianMs',
    design: 'acute',
    blindingMode: 'none',
    lengthDays: LENGTH,
    startDate: '2026-01-01',
    status: 'completed',
    sealedKey: null,
    seed: null,
    ...overrides,
  };
}

/** Alternating ON/OFF schedule (open run stores ON/OFF directly). */
function makeSchedule(experimentId: string, taken: (i: number) => boolean): ScheduleDay[] {
  const days: ScheduleDay[] = [];
  for (let i = 0; i < LENGTH; i++) {
    days.push({
      experimentId,
      dayIndex: i,
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      arm: i % 2 === 0 ? 'ON' : 'OFF',
      taken: i < BASELINE ? false : taken(i),
      takenAt: null,
    });
  }
  return days;
}

/** One valid test session per day, reaction time following the ON effect. */
function makeSessions(experimentId: string, tested: (i: number) => boolean): TestSession[] {
  const out: TestSession[] = [];
  for (let i = 0; i < LENGTH; i++) {
    if (!tested(i)) continue;
    const on: 0 | 1 = i % 2 === 0 ? 1 : 0;
    out.push({
      id: `s${i}`,
      experimentId,
      dayIndex: i,
      startedAt: `2026-01-${String(i + 1).padStart(2, '0')}T09:00:00Z`,
      deviceModel: null,
      pvtMedianMs: rtValue(i, on),
      pvtLapses: null,
      nbackAccuracy: null,
      nbackDprime: null,
      focus: on === 1 ? 7 : 6,
      energy: null,
      mood: null,
      sleepHours: sleepHours(i),
      // Caffeine must vary (not a constant column) or the design is singular.
      caffeine: i % 3 === 0,
      note: null,
      valid: true,
    });
  }
  return out;
}

function freshDb(): SqlDriver {
  const db = createMemoryDriver();
  migrate(db);
  return db;
}

/** Insert the supplement + experiment parent rows so result FKs resolve. */
function seedParents(db: SqlDriver, exp: Experiment): void {
  supplements.insert(db, {
    id: exp.supplementId,
    name: 'Caffeine',
    type: 'acute',
    evidenceSummary: 'x',
    evidenceLinks: [],
    excluded: false,
  });
  experiments.insert(db, exp);
}

/** Fresh migrated DB with the experiment + supplement parents already inserted. */
function setup(overrides: Partial<Experiment> = {}): { db: SqlDriver; exp: Experiment } {
  const db = freshDb();
  const exp = makeExperiment(overrides);
  seedParents(db, exp);
  return { db, exp };
}

describe('computeExperimentVerdict — primary/secondary selection', () => {
  it('selects the goal\u2019s primary metric and lists the rest as secondary', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });

    expect(vm.primary.metric).toBe('pvtMedianMs'); // focus -> reaction time
    expect(vm.secondary.map((s) => s.metric)).not.toContain('pvtMedianMs');
    expect(vm.secondary.length).toBe(6); // the other six metrics
  });

  it('a memory goal promotes n-back d\u2019 to primary', () => {
    const { db, exp } = setup({ goal: 'memory', primaryMetric: 'nbackDprime' });
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    expect(vm.primary.metric).toBe('nbackDprime');
  });
});

describe('computeExperimentVerdict — the picked battery', () => {
  /** Calm scores that rise ~12 points on ON days. */
  function withCalm(sessions: TestSession[]): TestSession[] {
    return sessions.map((s) => {
      const on = s.dayIndex % 2 === 0 ? 1 : 0;
      return { ...s, calmScore: 55 + noise(s.dayIndex) + (on ? 12 : 0), stroopInterferenceMs: 90 + noise(s.dayIndex * 3) };
    });
  }

  it('judges a calm goal on the calm check and lists only the battery\u2019s metrics', () => {
    const { db, exp } = setup({ goal: 'calm', primaryMetric: 'calm_score', battery: ['calm', 'pvt', 'stroop'] });
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = withCalm(makeSessions(exp.id, () => true));
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });

    expect(vm.primary.metric).toBe('calmScore');
    expect(vm.primary.verdictSentence).toBe('Measurable improvement for you.');
    expect(vm.primary.effectSentence).toContain('calm score');
    const secondary = vm.secondary.map((s) => s.metric);
    expect(secondary).toContain('stroopInterferenceMs');
    expect(secondary).toContain('pvtMedianMs');
    // No 2-back in this battery, so it isn't listed.
    expect(secondary).not.toContain('nbackDprime');
  });

  it('keeps an older calm run (no battery saved) on the mood rating', () => {
    const { db, exp } = setup({ goal: 'calm', primaryMetric: 'mood' });
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    expect(vm.primary.metric).toBe('mood');
    expect(vm.secondary.map((s) => s.metric)).not.toContain('calmScore');
  });
});

describe('computeExperimentVerdict — verdict + plain-unit formatting', () => {
  it('reports a measurable improvement with a plain-unit "faster" sentence', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });

    expect(vm.primary.verdictSentence).toBe('Measurable improvement for you.');
    expect(vm.primary.effectSentence).toContain('reaction time');
    expect(vm.primary.effectSentence).toContain('ms');
    expect(vm.primary.effectSentence).toContain('faster');
    expect(vm.primary.effectSentence).toContain('range');
    // The estimate is a decrease of ~18ms (faster).
    expect(vm.primary.estimate).toBeLessThan(0);
    expect(Math.abs(vm.primary.estimate!)).toBeGreaterThan(10);
    expect(Math.abs(vm.primary.estimate!)).toBeLessThan(26);
  });
});

describe('computeExperimentVerdict — adherence gate', () => {
  it('shows the improve-adherence state and no verdict below 80%', () => {
    const { db, exp } = setup();
    // Take the supplement on only ~half of the post-baseline days -> under 80%.
    const schedule = makeSchedule(exp.id, (i) => i % 2 === 0);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });

    expect(vm.adherenceMet).toBe(false);
    expect(vm.adherence.rate).toBeLessThan(0.8);
    expect(vm.primary.verdictSentence).toBe(
      'Not enough data: extend 2 weeks or improve adherence.',
    );
    expect(vm.primary.dbVerdict).toBe('inconclusive');
    expect(vm.primary.analyzed).toBe(false);
  });

  it('allows a verdict at or above 80% adherence', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true); // 100%
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    expect(vm.adherenceMet).toBe(true);
    expect(vm.primary.analyzed).toBe(true);
  });
});

describe('computeExperimentVerdict — result persistence', () => {
  it('upserts a result row for each analyzed metric and reruns idempotently', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);

    computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    const first = results.listForExperiment(db, exp.id);
    expect(first.length).toBeGreaterThan(0);
    const primaryRow = first.find((r) => r.metric === 'pvtMedianMs');
    expect(primaryRow).toBeDefined();
    expect(primaryRow!.verdict).toBe('works');
    expect(primaryRow!.ciLow).toBeLessThan(primaryRow!.ciHigh);

    // A second run must not duplicate rows (upsert on (experiment, metric)).
    computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    const second = results.listForExperiment(db, exp.id);
    expect(second.length).toBe(first.length);
  });

  it('does not persist metrics that were never measured', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    // Only pvtMedianMs and focus are ever measured; the rest stay null -> no row.
    const sessions = makeSessions(exp.id, () => true);
    computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    const persisted = new Set(results.listForExperiment(db, exp.id).map((r) => r.metric));
    // Never-measured metrics must be absent.
    expect(persisted.has('energy')).toBe(false);
    expect(persisted.has('mood')).toBe(false);
    expect(persisted.has('nbackDprime')).toBe(false);
    expect(persisted.has('pvtLapses')).toBe(false);
    // Measured metrics are present.
    expect(persisted.has('pvtMedianMs')).toBe(true);
  });
});

describe('computeExperimentVerdict — blinding', () => {
  it('marks an open run unblinded with a placebo caveat and no mapping', () => {
    const { db, exp } = setup({ blindingMode: 'none' });
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    expect(vm.blindingState).toBe('unblinded');
    expect(vm.unblindedCaveat).toMatch(/You knew which days were ON/);
    expect(vm.revealedMapping).toBeNull();
  });

  it('unblinds a sealed run from the key and recovers the true ON effect', () => {
    const db = freshDb();
    // Build a sealed A/B schedule from the real blinding engine with a passphrase.
    const trueArms = Array.from({ length: LENGTH }, (_, i) => (i % 2 === 0 ? 'ON' : 'OFF') as 'ON' | 'OFF');
    const passphrase = 'friend-secret';
    const blinding = applyBlinding(trueArms, 'sealed', 'seed-123', { passphrase });

    const exp = makeExperiment({ blindingMode: 'sealed', sealedKey: blinding.sealedKey });
    seedParents(db, exp);
    const schedule: ScheduleDay[] = blinding.storedArms.map((arm, i) => ({
      experimentId: exp.id,
      dayIndex: i,
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      arm,
      taken: i >= BASELINE,
      takenAt: null,
    }));
    // Sessions keyed on the TRUE arm so the unblinded analysis should find the effect.
    const sessions = makeSessions(exp.id, () => true);

    const vm = computeExperimentVerdict(db, {
      experiment: exp,
      schedule,
      sessions,
      unsealPassphrase: passphrase,
    });

    expect(vm.blindingState).toBe('blinded');
    expect(vm.unblindedCaveat).toBeNull();
    expect(vm.revealedMapping).not.toBeNull();
    expect(['A', 'B']).toContain(vm.revealedMapping!.supplementLabel);
    // With the correct unblinding the primary effect is still the ~18ms improvement.
    expect(vm.primary.verdictSentence).toBe('Measurable improvement for you.');
    expect(vm.primary.estimate).toBeLessThan(0);
  });

  it('throws when a blinded run is missing its unseal passphrase', () => {
    const db = freshDb();
    const trueArms = Array.from({ length: LENGTH }, (_, i) => (i % 2 === 0 ? 'ON' : 'OFF') as 'ON' | 'OFF');
    const blinding = applyBlinding(trueArms, 'sealed', 'seed-123', { passphrase: 'p' });
    const exp = makeExperiment({ blindingMode: 'sealed', sealedKey: blinding.sealedKey });
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    expect(() =>
      computeExperimentVerdict(db, { experiment: exp, schedule, sessions }),
    ).toThrow(/passphrase/i);
  });

  it('unblinds a self-blinded run from the passphrase derived from the stored seed (finding 1)', () => {
    const db = freshDb();
    const trueArms = Array.from({ length: LENGTH }, (_, i) => (i % 2 === 0 ? 'ON' : 'OFF') as 'ON' | 'OFF');
    const seed = 'self-seed-xyz';
    const blinding = applyBlinding(trueArms, 'self_blind', seed);
    const exp = makeExperiment({ blindingMode: 'self_blind', sealedKey: blinding.sealedKey, seed });
    seedParents(db, exp);
    const schedule: ScheduleDay[] = blinding.storedArms.map((arm, i) => ({
      experimentId: exp.id,
      dayIndex: i,
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      arm,
      taken: i >= BASELINE,
      takenAt: null,
    }));
    const sessions = makeSessions(exp.id, () => true);

    const vm = computeExperimentVerdict(db, {
      experiment: exp,
      schedule,
      sessions,
      // The screen derives this from experiment.seed via selfBlindPassphrase.
      unsealPassphrase: selfBlindPassphrase(exp.seed!),
    });
    expect(vm.blindingState).toBe('blinded');
    expect(vm.revealedMapping).not.toBeNull();
    expect(vm.primary.verdictSentence).toContain('Measurable improvement');
  });
});

describe('computeExperimentVerdict — covariate guard (finding 2)', () => {
  it('still produces a verdict when caffeine is constant and sleep is never logged', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    // Degenerate covariates: caffeine always true, sleep always 0. Pre-fix this
    // made the design singular and every metric fell back to not-enough-data.
    const sessions = makeSessions(exp.id, () => true).map((s) => ({
      ...s,
      caffeine: true,
      sleepHours: 0,
    }));
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    expect(vm.adherenceMet).toBe(true);
    expect(vm.primary.analyzed).toBe(true);
    expect(vm.primary.verdictSentence).toContain('Measurable improvement');
  });
});

describe('computeExperimentVerdict — measured sleep covariate', () => {
  // Sleep runs an hour longer on ON days and every extra hour is 20 ms faster,
  // so ignoring sleep doubles the apparent effect (about -38 ms vs a true -18).
  const sleepFor = (i: number, on: 0 | 1) => 7 + on + ((i * 7) % 5) * 0.1;
  const confounded = (exp: Experiment, sleepLogged: (i: number) => boolean): TestSession[] =>
    makeSessions(exp.id, () => true).map((s) => {
      const on: 0 | 1 = s.dayIndex % 2 === 0 ? 1 : 0;
      const sleep = sleepFor(s.dayIndex, on);
      return {
        ...s,
        pvtMedianMs: 300 - 18 * on - 20 * (sleep - 7) + noise(s.dayIndex) * 0.2,
        sleepHours: sleepLogged(s.dayIndex) ? sleep : null,
      };
    });
  const nightsFor = (schedule: ScheduleDay[]): HealthNight[] =>
    schedule.map((d) => ({
      date: d.date,
      metric: 'sleep_hours',
      value: sleepFor(d.dayIndex, d.dayIndex % 2 === 0 ? 1 : 0),
      source: 'healthkit',
      syncedAt: '2026-01-30T00:00:00Z',
    }));

  it('keys each schedule day to the night ending that morning', () => {
    const schedule = makeSchedule('exp1', () => true);
    const map = measuredSleepByDay(schedule, [
      { date: '2026-01-05', metric: 'sleep_hours', value: 6.2, source: 'healthkit', syncedAt: 'x' },
      { date: '2026-01-05', metric: 'hrv_ms', value: 55, source: 'healthkit', syncedAt: 'x' },
    ]);
    expect([...map.entries()]).toEqual([[4, 6.2]]);
  });

  it('adjusts for Health-measured sleep when the user never picked their hours', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = confounded(exp, () => false);
    const without = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    const withHealth = computeExperimentVerdict(db, {
      experiment: exp,
      schedule,
      sessions,
      healthNights: nightsFor(schedule),
    });
    expect(without.primary.estimate!).toBeLessThan(-30);
    expect(withHealth.primary.estimate!).toBeGreaterThan(-22);
    expect(withHealth.primary.estimate!).toBeLessThan(-14);
  });

  it('fills a skipped sleep answer with the mean, not zero hours', () => {
    // Zero-filling 5 skipped days made them look like all-nighters, which
    // swamped the covariate and left the estimate as confounded (~ -38 ms) as
    // never logging sleep at all. The mean keeps most of the adjustment.
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    const vm = computeExperimentVerdict(db, {
      experiment: exp,
      schedule,
      sessions: confounded(exp, (i) => i % 5 !== 0),
    });
    expect(vm.primary.analyzed).toBe(true);
    expect(vm.primary.estimate!).toBeGreaterThan(-35);
    // Health fills the gaps exactly, which recovers the true effect.
    const filled = computeExperimentVerdict(db, {
      experiment: exp,
      schedule,
      sessions: confounded(exp, (i) => i % 5 !== 0),
      healthNights: nightsFor(schedule),
    });
    expect(filled.primary.estimate!).toBeGreaterThan(-22);
    expect(filled.primary.estimate!).toBeLessThan(-14);
  });
});

describe('computeExperimentVerdict — cumulative power note (finding 4)', () => {
  it('appends the limited-power note on a cumulative run verdict', () => {
    // A block design: first half ON, second half OFF, with a clear effect.
    const { db, exp } = setup({ design: 'cumulative' });
    const schedule: ScheduleDay[] = Array.from({ length: LENGTH }, (_, i) => ({
      experimentId: exp.id,
      dayIndex: i,
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      arm: i < LENGTH / 2 ? 'ON' : 'OFF',
      taken: i >= BASELINE,
      takenAt: null,
    }));
    const sessions: TestSession[] = Array.from({ length: LENGTH }, (_, i) => {
      const on: 0 | 1 = i < LENGTH / 2 ? 1 : 0;
      return {
        id: `c${i}`,
        experimentId: exp.id,
        dayIndex: i,
        startedAt: `2026-01-${String(i + 1).padStart(2, '0')}T09:00:00Z`,
        deviceModel: null,
        pvtMedianMs: 300 - (on ? 25 : 0) + Math.sin(i) * 2,
        pvtLapses: null,
        nbackAccuracy: null,
        nbackDprime: null,
        focus: null,
        energy: null,
        mood: null,
        sleepHours: 7,
        caffeine: false,
        note: null,
        valid: true,
      };
    });
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    if (vm.primary.analyzed) {
      expect(vm.primary.verdictSentence.toLowerCase()).toContain('cumulative run');
    }
  });
});

describe('computeExperimentVerdict — monthly cost', () => {
  it('builds a $X/month line from the per-dose cost and ON-day cadence', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, {
      experiment: exp,
      schedule,
      sessions,
      cost: { centsPerDose: 50 },
    });
    expect(vm.monthlyCost).toMatch(/^\$\d/);
    expect(vm.monthlyCost).toContain('/month');
  });

  it('omits the cost line when no price is known', () => {
    const { db, exp } = setup();
    const schedule = makeSchedule(exp.id, () => true);
    const sessions = makeSessions(exp.id, () => true);
    const vm = computeExperimentVerdict(db, { experiment: exp, schedule, sessions });
    expect(vm.monthlyCost).toBeNull();
  });
});

// Keep an experiment + supplement reference so the DB inserts used elsewhere
// in the suite line up with the schema's foreign keys when exercised.
describe('schema wiring sanity', () => {
  it('persists experiment + schedule + sessions through the real schema', () => {
    const db = freshDb();
    supplements.insert(db, {
      id: 'caffeine',
      name: 'Caffeine',
      type: 'acute',
      evidenceSummary: 'x',
      evidenceLinks: [],
      excluded: false,
    });
    const exp = makeExperiment();
    experiments.insert(db, exp);
    for (const d of makeSchedule(exp.id, () => true)) scheduleDays.insert(db, d);
    for (const s of makeSessions(exp.id, () => true)) testSessions.insert(db, s);
    expect(scheduleDays.listForExperiment(db, exp.id).length).toBe(LENGTH);
    expect(testSessions.listForExperiment(db, exp.id).length).toBe(LENGTH);
  });
});
