import type { Experiment, ScheduleDay } from '@/db';
import {
  buildTodayView,
  computeStreak,
  findDayForDate,
  instructionForDay,
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

describe('instructionForDay — blinding', () => {
  it('reveals ON/OFF only when unblinded', () => {
    expect(instructionForDay('none', day({ arm: 'ON' }))).toContain('ON day');
    expect(instructionForDay('none', day({ arm: 'OFF' }))).toContain('No capsule');
    expect(instructionForDay('none', day({ arm: 'A' }))).toContain('cup A');
    expect(instructionForDay('none', day({ arm: 'B' }))).toContain('cup B');
  });

  it('never leaks ON/OFF under self_blind or sealed', () => {
    for (const mode of ['self_blind', 'sealed'] as const) {
      for (const arm of ['ON', 'OFF', 'A', 'B'] as const) {
        const text = instructionForDay(mode, day({ arm }));
        expect(text).not.toMatch(/ON day|OFF day|No capsule/);
        expect(text).toMatch(/cup A|cup B/);
      }
    }
  });

  it('maps ON->cup A and OFF->cup B under blinding deterministically', () => {
    expect(instructionForDay('sealed', day({ arm: 'ON' }))).toContain('cup A');
    expect(instructionForDay('sealed', day({ arm: 'OFF' }))).toContain('cup B');
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
    expect(view.instruction).toMatch(/cup A|cup B/);
    expect(view.instruction).not.toMatch(/ON day|OFF day/);
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
    // Streak reflects the most recent taken run at/ before the date.
    expect(view.streak).toBe(0);
  });
});
