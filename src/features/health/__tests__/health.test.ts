import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import { migrate } from '@/db/schema';
import { experiments, healthNights } from '@/db/repositories';
import type { Experiment, HealthNight, ScheduleDay, TestSession } from '@/db/types';
import { computeExperimentVerdict } from '@/results/verdict';
import {
  connectHealth,
  healthConnection,
  healthCoverage,
  healthPrimaryFor,
  measuredSleepSource,
  meanForNight,
  nightAfterByDay,
  sleepHoursForNight,
  summarizeNights,
  syncHealth,
  unionLength,
  type Clock,
  type HealthAdapter,
  type RawHealthData,
} from '..';

/** A UTC clock so the tests don't depend on the machine's timezone. */
const utc: Clock = {
  dayStart: (d) => Date.parse(`${d}T00:00:00Z`),
  dayOf: (ms) => new Date(ms).toISOString().slice(0, 10),
};
const at = (iso: string) => Date.parse(iso);

describe('nightly summaries', () => {
  it('counts overlapping intervals once', () => {
    expect(unionLength([[0, 10], [5, 15], [20, 25]])).toBe(20);
  });

  it('sums asleep time for the night ending on the wake date, ignoring naps and awake time', () => {
    const sleep = [
      { startMs: at('2026-12-01T23:00:00Z'), endMs: at('2026-12-02T03:00:00Z'), asleep: true },
      { startMs: at('2026-12-02T03:00:00Z'), endMs: at('2026-12-02T03:30:00Z'), asleep: false },
      { startMs: at('2026-12-02T03:30:00Z'), endMs: at('2026-12-02T07:00:00Z'), asleep: true },
      // Same night written again by a second device.
      { startMs: at('2026-12-02T00:00:00Z'), endMs: at('2026-12-02T02:00:00Z'), asleep: true },
      // An afternoon nap belongs to no night.
      { startMs: at('2026-12-02T15:00:00Z'), endMs: at('2026-12-02T16:00:00Z'), asleep: true },
    ];
    expect(sleepHoursForNight(sleep, '2026-12-02', utc)).toBe(7.5);
    expect(sleepHoursForNight(sleep, '2026-12-03', utc)).toBeNull();
  });

  it('averages HRV / resting HR across the night window', () => {
    const hrv = [
      { atMs: at('2026-12-02T02:00:00Z'), value: 40 },
      { atMs: at('2026-12-02T05:00:00Z'), value: 50 },
      { atMs: at('2026-12-02T20:00:00Z'), value: 99 }, // next night
    ];
    expect(meanForNight(hrv, '2026-12-02', utc)).toBe(45);
    expect(meanForNight(hrv, '2026-12-03', utc)).toBe(99);
  });

  it('summarizes a date range into rows per metric', () => {
    const raw: RawHealthData = {
      sleep: [{ startMs: at('2026-12-01T23:00:00Z'), endMs: at('2026-12-02T07:00:00Z'), asleep: true }],
      restingHr: [{ atMs: at('2026-12-02T08:00:00Z'), value: 55 }],
      hrv: [],
    };
    const rows = summarizeNights(raw, '2026-12-01', '2026-12-03', 'healthkit', 'now', utc);
    expect(rows.map((r) => `${r.date}:${r.metric}:${r.value}`)).toEqual([
      '2026-12-02:sleep_hours:8',
      '2026-12-02:resting_hr:55',
    ]);
  });
});

describe('dose lag', () => {
  it("matches each day to the night that ends the next morning", () => {
    const schedule: ScheduleDay[] = [
      { experimentId: 'e', dayIndex: 0, date: '2026-12-01', arm: 'ON', taken: true, takenAt: null },
      { experimentId: 'e', dayIndex: 1, date: '2026-12-02', arm: 'OFF', taken: true, takenAt: null },
    ];
    const nights: HealthNight[] = [
      { date: '2026-12-01', metric: 'sleep_hours', value: 6, source: 'x', syncedAt: '' },
      { date: '2026-12-02', metric: 'sleep_hours', value: 8, source: 'x', syncedAt: '' },
      { date: '2026-12-03', metric: 'sleep_hours', value: 7, source: 'x', syncedAt: '' },
    ];
    expect([...nightAfterByDay(schedule, nights, 'sleep_hours')]).toEqual([
      [0, 8],
      [1, 7],
    ]);
  });
});

describe('pre-registration', () => {
  const exp = { goal: 'sleep', startDate: '2026-12-04', primaryMetric: 'energy' };
  it('switches sleep and calm runs to a Health outcome only before day 1', () => {
    expect(healthPrimaryFor(exp, '2026-12-02')).toBe('health_sleep_hours');
    expect(healthPrimaryFor({ ...exp, goal: 'calm' }, '2026-12-02')).toBe('health_hrv_ms');
    expect(healthPrimaryFor(exp, '2026-12-04')).toBeNull();
    expect(healthPrimaryFor({ ...exp, goal: 'focus' }, '2026-12-02')).toBeNull();
  });
});

// --- store -------------------------------------------------------------------

function fakeAdapter(raw: RawHealthData, grant = true): HealthAdapter {
  return {
    source: 'healthkit',
    label: 'Apple Health',
    available: async () => true,
    requestAccess: async () => grant,
    read: async () => raw,
  };
}

function setupDb(goal = 'sleep', startDate = '2026-12-04') {
  const db = createMemoryDriver();
  migrate(db);
  db.run("INSERT INTO supplement (id, name, type, evidence_summary) VALUES ('mag', 'Magnesium', 'cumulative', '')");
  experiments.insert(db, {
    id: 'e1',
    supplementId: 'mag',
    goal,
    primaryMetric: 'energy',
    design: 'acute',
    blindingMode: 'none',
    lengthDays: 21,
    startDate,
    status: 'active',
    sealedKey: null,
    seed: 's',
  });
  return db;
}

describe('connectHealth / syncHealth', () => {
  const raw: RawHealthData = {
    sleep: [{ startMs: at('2026-12-01T23:00:00Z'), endMs: at('2026-12-02T06:30:00Z'), asleep: true }],
    restingHr: [],
    hrv: [{ atMs: at('2026-12-02T03:00:00Z'), value: 48 }],
  };

  it('locks a sleep run onto Health sleep when connected during the baseline', async () => {
    const db = setupDb();
    const res = await connectHealth(db, fakeAdapter(raw), new Date('2026-12-02T09:00:00Z'), utc);
    expect(res).toEqual({ connected: true, primaryMetric: 'health_sleep_hours', nights: 1 });
    expect(experiments.getById(db, 'e1')?.primaryMetric).toBe('health_sleep_hours');
    expect(healthConnection(db)?.source).toBe('healthkit');
    expect(healthNights.listBetween(db, '2026-12-01', '2026-12-31')).toHaveLength(2);
    expect(healthCoverage(db, experiments.getById(db, 'e1')!, '2026-12-02')).toEqual({ synced: 1, expected: 1 });
  });

  it('keeps the pre-registered metric when connected mid-run', async () => {
    const db = setupDb('sleep', '2026-11-20');
    const res = await connectHealth(db, fakeAdapter(raw), new Date('2026-12-02T09:00:00Z'), utc);
    expect(res.primaryMetric).toBeNull();
    expect(experiments.getById(db, 'e1')?.primaryMetric).toBe('energy');
  });

  it('does nothing when access is declined or before connecting', async () => {
    const db = setupDb();
    expect((await connectHealth(db, fakeAdapter(raw, false), new Date(), utc)).connected).toBe(false);
    expect(await syncHealth(db, fakeAdapter(raw), new Date(), utc)).toEqual({ nights: 0 });
  });

  it('lets the check-in skip the sleep question once last night synced', async () => {
    const db = setupDb();
    expect(measuredSleepSource(db, '2026-12-02')).toBeNull();
    await connectHealth(db, fakeAdapter(raw), new Date('2026-12-02T09:00:00Z'), utc);
    expect(measuredSleepSource(db, '2026-12-02')).toBe('Apple Health');
    expect(measuredSleepSource(db, '2026-12-03')).toBeNull();
  });
});

// --- verdict -----------------------------------------------------------------

function verdictDb(exp: Experiment) {
  const db = createMemoryDriver();
  migrate(db);
  db.run("INSERT INTO supplement (id, name, type, evidence_summary) VALUES ('mag', 'Magnesium', 'acute', '')");
  experiments.insert(db, exp);
  return db;
}

describe('verdict on Health data', () => {
  const LENGTH = 22;
  const iso = (i: number) => `2026-01-${String(i + 1).padStart(2, '0')}`;
  const experiment: Experiment = {
    id: 'h1',
    supplementId: 'mag',
    goal: 'sleep',
    primaryMetric: 'health_sleep_hours',
    design: 'acute',
    blindingMode: 'none',
    lengthDays: LENGTH,
    startDate: '2026-01-01',
    status: 'completed',
    sealedKey: null,
    seed: null,
  };
  const schedule: ScheduleDay[] = Array.from({ length: LENGTH }, (_, i) => ({
    experimentId: 'h1',
    dayIndex: i,
    date: iso(i),
    arm: i % 2 === 0 ? 'ON' : 'OFF',
    taken: true,
    takenAt: null,
  }));
  const sessions: TestSession[] = schedule.map((d) => ({
    id: `s${d.dayIndex}`,
    experimentId: 'h1',
    dayIndex: d.dayIndex,
    startedAt: `${d.date}T09:00:00Z`,
    deviceModel: null,
    pvtMedianMs: 300 + Math.sin(d.dayIndex * 7.3) * 6,
    pvtLapses: null,
    nbackAccuracy: null,
    nbackDprime: null,
    focus: null,
    energy: 5 + (d.dayIndex % 3),
    mood: null,
    sleepHours: 7,
    caffeine: d.dayIndex % 3 === 0,
    note: null,
    valid: true,
  }));
  // Sleep is 0.8 h longer on the night AFTER each ON day.
  const nights: HealthNight[] = schedule.map((d) => ({
    date: iso(d.dayIndex + 1),
    metric: 'sleep_hours',
    value: 6.8 + (d.arm === 'ON' ? 0.8 : 0) + Math.sin(d.dayIndex * 3.1) * 0.15,
    source: 'healthkit',
    syncedAt: '',
  }));

  it('judges the pre-registered Health metric, paired with the night after the dose', () => {
    const db = verdictDb(experiment);
    const vm = computeExperimentVerdict(db, { experiment, schedule, sessions, healthNights: nights });
    expect(vm.primary.metric).toBe('healthSleepHours');
    expect(vm.primaryNote).toBeNull();
    expect(vm.primary.estimate!).toBeGreaterThan(0.6);
    expect(vm.primary.effectSentence).toMatch(/^sleep [\d.]+ h longer/);
    expect(vm.secondary.map((s) => s.metric)).toContain('energy');
  });

  it('falls back to the check-in metric, and says so, when too few nights synced', () => {
    const db = verdictDb(experiment);
    const vm = computeExperimentVerdict(db, {
      experiment,
      schedule,
      sessions,
      healthNights: nights.slice(0, 5),
    });
    expect(vm.primary.metric).toBe('energy');
    expect(vm.primaryNote).toMatch(/Not enough nights of sleep data/);
  });

  it('leaves runs without Health exactly as before', () => {
    const db = verdictDb(experiment);
    const vm = computeExperimentVerdict(db, {
      experiment: { ...experiment, primaryMetric: 'energy' },
      schedule,
      sessions,
    });
    expect(vm.primary.metric).toBe('energy');
    expect(vm.secondary.some((s) => s.metric.startsWith('health'))).toBe(false);
    expect(vm.primaryNote).toBeNull();
  });
});
