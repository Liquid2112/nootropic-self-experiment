import type { Experiment, ScheduleDay } from '@/db';
import {
  buildTodayView,
  checkInDayIndex,
  computeStreak,
  findDayForDate,
  instructionForDay,
  revealedArm,
} from '../today';

function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
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
    ...overrides,
  };
}

function day(overrides: Partial<ScheduleDay>): ScheduleDay {
  return {
    experimentId: 'exp1',
    dayIndex: 0,
    date: '2026-01-01',
    arm: 'A',
    taken: false,
    takenAt: null,
    ...overrides,
  };
}

describe('instructionForDay — solo open-label runs', () => {
  it('reveals today\'s ON/OFF call on an open run', () => {
    expect(instructionForDay('none', day({ arm: 'ON' }))).toContain('ON day');
    expect(instructionForDay('none', day({ arm: 'OFF' }))).toContain('OFF day');
    expect(instructionForDay('none', day({ arm: 'OFF' }))).toContain('check-in');
  });

  it('never mentions capsules or cups', () => {
    for (const mode of ['none', 'self_blind', 'sealed'] as const) {
      for (const arm of ['ON', 'OFF', 'A', 'B'] as const) {
        expect(instructionForDay(mode, day({ arm }))).not.toMatch(/capsule|cup/i);
      }
    }
  });

  it('keeps legacy blinded runs neutral', () => {
    for (const mode of ['self_blind', 'sealed'] as const) {
      for (const arm of ['ON', 'OFF', 'A', 'B'] as const) {
        const text = instructionForDay(mode, day({ arm }));
        expect(text).not.toMatch(/ON day|OFF day/);
        expect(text).toMatch(/day A|day B/);
      }
    }
  });
});

describe('revealedArm', () => {
  it('returns today\'s arm only for an open run', () => {
    expect(revealedArm('none', day({ arm: 'ON' }))).toBe('ON');
    expect(revealedArm('none', day({ arm: 'OFF' }))).toBe('OFF');
    expect(revealedArm('sealed', day({ arm: 'ON' }))).toBeNull();
    expect(revealedArm('none', undefined)).toBeNull();
  });
});

describe('findDayForDate', () => {
  it('finds the matching date or returns undefined', () => {
    const schedule = [day({ dayIndex: 0, date: '2026-01-01' }), day({ dayIndex: 1, date: '2026-01-02' })];
    expect(findDayForDate(schedule, '2026-01-02')?.dayIndex).toBe(1);
    expect(findDayForDate(schedule, '2026-01-09')).toBeUndefined();
  });
});

describe('computeStreak', () => {
  it('counts consecutive taken days back from the given index', () => {
    const schedule = [
      day({ dayIndex: 0, taken: true }),
      day({ dayIndex: 1, taken: true }),
      day({ dayIndex: 2, taken: true }),
    ];
    expect(computeStreak(schedule, 2)).toBe(3);
  });

  it('breaks the streak at the first untaken day', () => {
    const schedule = [
      day({ dayIndex: 0, taken: true }),
      day({ dayIndex: 1, taken: false }),
      day({ dayIndex: 2, taken: true }),
    ];
    expect(computeStreak(schedule, 2)).toBe(1);
    expect(computeStreak(schedule, 1)).toBe(0);
  });

  it('is zero when the end day itself is not taken', () => {
    const schedule = [day({ dayIndex: 0, taken: true }), day({ dayIndex: 1, taken: false })];
    expect(computeStreak(schedule, 1)).toBe(0);
  });
});

describe('buildTodayView', () => {
  const schedule = [
    day({ dayIndex: 0, date: '2026-01-01', arm: 'A', taken: true, takenAt: '2026-01-01T07:00:00Z' }),
    day({ dayIndex: 1, date: '2026-01-02', arm: 'B', taken: false }),
  ];

  it('reports Day X of N and a blinded instruction for a scheduled day', () => {
    const view = buildTodayView({
      experiment: makeExperiment(),
      schedule,
      isoDate: '2026-01-02',
    });
    expect(view.dayNumber).toBe(2);
    expect(view.totalDays).toBe(14);
    expect(view.hasDayForToday).toBe(true);
    expect(view.taken).toBe(false);
    expect(view.instruction).toMatch(/day A|day B/);
    expect(view.instruction).not.toMatch(/ON day|OFF day/);
    expect(view.arm).toBeNull();
  });

  it('reflects taken + takenAt and computes the streak', () => {
    const view = buildTodayView({
      experiment: makeExperiment(),
      schedule,
      isoDate: '2026-01-01',
    });
    expect(view.taken).toBe(true);
    expect(view.takenAt).toBe('2026-01-01T07:00:00Z');
    expect(view.streak).toBe(1);
  });

  it('handles a date outside the schedule as a between-days state', () => {
    const view = buildTodayView({
      experiment: makeExperiment(),
      schedule,
      isoDate: '2026-02-01',
    });
    expect(view.hasDayForToday).toBe(false);
    expect(view.dayNumber).toBe(0);
    expect(view.instruction).toMatch(/No scheduled dose/);
    expect(view.isFinished).toBe(true);
    // Streak reflects the most recent taken run at/ before the date.
    expect(view.streak).toBe(0);
  });

  it('shows a baseline day (no dose, check-in only) in the 3 days before the start', () => {
    const view = buildTodayView({
      experiment: makeExperiment({ blindingMode: 'none' }),
      schedule,
      isoDate: '2025-12-30',
    });
    expect(view.isBaseline).toBe(true);
    expect(view.hasDayForToday).toBe(false);
    expect(view.dayNumber).toBe(2);
    expect(view.totalDays).toBe(3);
    expect(view.instruction).toMatch(/Baseline day 2 of 3/);
    expect(view.instruction).toMatch(/don't take/);
    expect(view.instruction).not.toMatch(/ON day|cup/);
  });

  it('is not a baseline day on the run itself or long before it', () => {
    const onRun = buildTodayView({ experiment: makeExperiment(), schedule, isoDate: '2026-01-01' });
    expect(onRun.isBaseline).toBe(false);
    const early = buildTodayView({ experiment: makeExperiment(), schedule, isoDate: '2025-12-28' });
    expect(early.isBaseline).toBe(false);
    expect(early.hasDayForToday).toBe(false);
    expect(early.isFinished).toBe(false);
  });
});

describe('checkInDayIndex', () => {
  const schedule = [day({ dayIndex: 0, date: '2026-01-01' }), day({ dayIndex: 1, date: '2026-01-02' })];
  const experiment = makeExperiment();

  it('uses the schedule day index during the run', () => {
    expect(checkInDayIndex(experiment, schedule, '2026-01-02')).toBe(1);
  });

  it('uses a negative index during the baseline', () => {
    expect(checkInDayIndex(experiment, schedule, '2025-12-29')).toBe(-3);
    expect(checkInDayIndex(experiment, schedule, '2025-12-31')).toBe(-1);
  });

  it('returns null outside the baseline and the run', () => {
    expect(checkInDayIndex(experiment, schedule, '2025-12-01')).toBeNull();
    expect(checkInDayIndex(experiment, schedule, '2026-03-01')).toBeNull();
  });
});
