import type { ScheduleDay, TestSession } from '@/db/types';
import {
  adherencePercent,
  buildCalendar,
  isMidpointWindow,
  isRunComplete,
  summarizeAdherence,
} from '../adherence';

/**
 * Adherence calendar model tests: per-day status, the baseline carve-out, the
 * elapsed-window bound, and the mid-point / run-complete windows. The model
 * must never expose a metric value, so the day shape is asserted to carry only
 * status + tested.
 */

const LENGTH = 24;

function schedule(taken: (i: number) => boolean): ScheduleDay[] {
  return Array.from({ length: LENGTH }, (_, i) => ({
    experimentId: 'e',
    dayIndex: i,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    arm: i % 2 === 0 ? 'ON' : 'OFF',
    taken: taken(i),
    takenAt: null,
  }));
}

function session(dayIndex: number, valid = true): TestSession {
  return {
    id: `s${dayIndex}`,
    experimentId: 'e',
    dayIndex,
    startedAt: 'x',
    deviceModel: null,
    pvtMedianMs: 300,
    pvtLapses: null,
    nbackAccuracy: null,
    nbackDprime: null,
    focus: null,
    energy: null,
    mood: null,
    sleepHours: 7,
    caffeine: false,
    note: null,
    valid,
  };
}

describe('buildCalendar', () => {
  it('treats every schedule day as a run day: taken/missed up to today, future upcoming', () => {
    const cal = buildCalendar(schedule((i) => i % 2 === 0), [session(4)], 10);
    // baseline is before day 0 now, so day 0 is a real dosing day
    expect(cal[0]!.status).toBe('taken');
    expect(cal[1]!.status).toBe('missed');
    // day 4 taken (4 % 2 === 0), day 5 missed, both within today=10
    expect(cal[4]!.status).toBe('taken');
    expect(cal[5]!.status).toBe('missed');
    // day 20 is beyond today -> upcoming
    expect(cal[20]!.status).toBe('upcoming');
  });

  it('shows every day as upcoming during the baseline (todayIndex < 0)', () => {
    const cal = buildCalendar(schedule(() => false), [], -2);
    expect(cal.every((d) => d.status === 'upcoming')).toBe(true);
  });

  it('marks the tested ring only where a valid session exists', () => {
    const cal = buildCalendar(schedule(() => true), [session(5), session(6, false)], 23);
    expect(cal[5]!.tested).toBe(true);
    expect(cal[6]!.tested).toBe(false); // invalid session doesn't count
    expect(cal[7]!.tested).toBe(false);
  });

  it('exposes no metric value on any day (blind protection)', () => {
    const cal = buildCalendar(schedule(() => true), [session(4)], 23);
    for (const day of cal) {
      expect(Object.keys(day).sort()).toEqual(
        ['date', 'dayIndex', 'dayNumber', 'status', 'tested'].sort(),
      );
    }
  });
});

describe('summarizeAdherence', () => {
  it('counts every elapsed run day and excludes future days from the rate', () => {
    // today = 13: elapsed days are indices 0..13 = 14 days.
    const s = summarizeAdherence(schedule(() => true), Array.from({ length: LENGTH }, (_, i) => session(i)), 13);
    expect(s.scheduledDays).toBe(14);
    expect(s.takenDays).toBe(14);
    expect(s.testedDays).toBe(14);
    expect(s.rate).toBe(1);
    expect(s.meetsGate).toBe(true);
    expect(adherencePercent(s)).toBe(100);
  });

  it('rate is min(taken, tested)/scheduled', () => {
    // taken on all, tested on none -> tested is the binding count.
    const s = summarizeAdherence(schedule(() => true), [], 13);
    expect(s.takenDays).toBe(14);
    expect(s.testedDays).toBe(0);
    expect(s.rate).toBe(0);
    expect(s.meetsGate).toBe(false);
  });
});

describe('baseline check-ins', () => {
  it('ignores baseline sessions (negative day index) in the adherence rate', () => {
    const baseline = [session(-3), session(-2), session(-1)];
    const s = summarizeAdherence(schedule(() => true), [...baseline, session(0)], 1);
    expect(s.scheduledDays).toBe(2);
    expect(s.testedDays).toBe(1);
  });

  it('reports nothing elapsed while still in the baseline', () => {
    const s = summarizeAdherence(schedule(() => false), [session(-3)], -1);
    expect(s.scheduledDays).toBe(0);
    expect(s.meetsGate).toBe(false);
  });
});

describe('windows', () => {
  it('mid-point window is days 10-14 intersected with run length', () => {
    expect(isMidpointWindow(9, 28)).toBe(false);
    expect(isMidpointWindow(10, 28)).toBe(true);
    expect(isMidpointWindow(14, 28)).toBe(true);
    expect(isMidpointWindow(15, 28)).toBe(false);
    // 21-day run: still ends at 14.
    expect(isMidpointWindow(14, 21)).toBe(true);
  });

  it('run is complete once the last scheduled day is reached', () => {
    expect(isRunComplete(22, 24)).toBe(false);
    expect(isRunComplete(23, 24)).toBe(true);
    expect(isRunComplete(30, 24)).toBe(true);
  });
});
