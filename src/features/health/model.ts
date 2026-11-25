/**
 * Apple Health / Health Connect — pure logic.
 *
 * Turns raw samples (sleep intervals, resting heart rate, HRV) into one value
 * per night, and lines each night up with the dose that could have caused it.
 *
 * Dose lag (the important part): last night's sleep reflects YESTERDAY's dose.
 * A night is keyed by the local date it ended on (the wake-up morning), and the
 * outcome for schedule day D is the night that ends on D + 1. Overnight HRV and
 * resting heart rate are treated the same way, since both are measured mostly
 * while asleep.
 *
 * Blinding: nothing here knows which arm a day was. Values are only paired with
 * arms inside the verdict, after unblinding.
 */
import type { HealthMetric, HealthNight, ScheduleDay } from '@/db/types';
import { addDays } from '@/engines/experiment';

const HOUR = 3_600_000;

/** One interval from the sleep record, already classified. */
export type SleepInterval = { startMs: number; endMs: number; asleep: boolean };
/** One point sample (resting HR in bpm, HRV in ms). */
export type PointSample = { atMs: number; value: number };

export type RawHealthData = {
  sleep: SleepInterval[];
  restingHr: PointSample[];
  hrv: PointSample[];
};

/**
 * Local-time helpers are injected so tests are timezone independent: `dayStart`
 * returns local midnight (epoch ms) for a YYYY-MM-DD, `dayOf` the local date of
 * an instant.
 */
export type Clock = {
  dayStart: (isoDate: string) => number;
  dayOf: (ms: number) => string;
};

export const localClock: Clock = {
  dayStart(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
  },
  dayOf(ms) {
    const t = new Date(ms);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  },
};

/**
 * The night that ends on `wakeDate` runs from 6 pm the evening before to 2 pm
 * on the wake date. Afternoon naps fall outside it, so they don't inflate a
 * night. Point samples use the full day that ends at 2 pm, so a resting heart
 * rate Apple writes in the morning still lands on the right night.
 */
export function sleepWindow(wakeDate: string, clock: Clock): [number, number] {
  const start = clock.dayStart(wakeDate);
  return [start - 6 * HOUR, start + 14 * HOUR];
}

export function pointWindow(wakeDate: string, clock: Clock): [number, number] {
  const start = clock.dayStart(wakeDate);
  return [start - 10 * HOUR, start + 14 * HOUR];
}

/** Total length of the union of intervals (overlaps counted once), in ms. */
export function unionLength(intervals: [number, number][]): number {
  const sorted = intervals.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0;
  let curStart = -Infinity;
  let curEnd = -Infinity;
  for (const [a, b] of sorted) {
    if (a > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = a;
      curEnd = b;
    } else if (b > curEnd) {
      curEnd = b;
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total;
}

/**
 * Hours asleep in the night ending on `wakeDate`, or null with no data. Watch
 * and phone often both write sleep, so overlapping intervals count once.
 */
export function sleepHoursForNight(sleep: SleepInterval[], wakeDate: string, clock: Clock): number | null {
  const [from, to] = sleepWindow(wakeDate, clock);
  const clipped: [number, number][] = sleep
    .filter((s) => s.asleep && s.endMs > from && s.startMs < to)
    .map((s) => [Math.max(s.startMs, from), Math.min(s.endMs, to)]);
  if (clipped.length === 0) return null;
  const hours = unionLength(clipped) / HOUR;
  // Under an hour is a partial record (watch died, put on late), not a night.
  return hours >= 1 ? Math.round(hours * 100) / 100 : null;
}

/** Mean of the point samples in the night ending on `wakeDate`, or null. */
export function meanForNight(samples: PointSample[], wakeDate: string, clock: Clock): number | null {
  const [from, to] = pointWindow(wakeDate, clock);
  const values = samples.filter((s) => s.atMs >= from && s.atMs < to).map((s) => s.value);
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

/** Every night (wake date) from `fromDate` to `toDate` inclusive, summarized. */
export function summarizeNights(
  raw: RawHealthData,
  fromDate: string,
  toDate: string,
  source: string,
  syncedAt: string,
  clock: Clock = localClock,
): HealthNight[] {
  const nights: HealthNight[] = [];
  for (let date = fromDate; date <= toDate; date = addDays(date, 1)) {
    const values: [HealthMetric, number | null][] = [
      ['sleep_hours', sleepHoursForNight(raw.sleep, date, clock)],
      ['resting_hr', meanForNight(raw.restingHr, date, clock)],
      ['hrv_ms', meanForNight(raw.hrv, date, clock)],
    ];
    for (const [metric, value] of values) {
      if (value !== null) nights.push({ date, metric, value, source, syncedAt });
    }
  }
  return nights;
}

/**
 * The value that belongs to each schedule day: the night that ENDS the morning
 * after it. Days whose night has no data are left out.
 */
export function nightAfterByDay(
  schedule: ScheduleDay[],
  nights: HealthNight[],
  metric: HealthMetric,
): Map<number, number> {
  const byDate = new Map(nights.filter((n) => n.metric === metric).map((n) => [n.date, n.value]));
  const out = new Map<number, number>();
  for (const day of schedule) {
    const value = byDate.get(addDays(day.date, 1));
    if (value !== undefined) out.set(day.dayIndex, value);
  }
  return out;
}

// --- pre-registration ----------------------------------------------------------

/**
 * Which Health metric becomes the primary outcome for a goal, if any. Sleep is
 * judged on hours asleep; calm on overnight HRV (higher = more recovered and
 * less stressed). Focus and memory keep their cognitive tests.
 */
export const HEALTH_PRIMARY_BY_GOAL: Partial<Record<string, string>> = {
  sleep: 'health_sleep_hours',
  calm: 'health_hrv_ms',
};

/**
 * Should connecting Health switch this run's primary metric? Only if the goal
 * has a Health outcome and day 1 hasn't started yet: the primary metric must be
 * locked in before any data is collected, never picked after seeing results.
 * Connecting mid-run still syncs data, which then shows as a secondary measure.
 */
export function healthPrimaryFor(
  experiment: { goal: string; startDate: string; primaryMetric: string },
  todayIsoDate: string,
): string | null {
  const metric = HEALTH_PRIMARY_BY_GOAL[experiment.goal];
  if (!metric) return null;
  if (todayIsoDate >= experiment.startDate) return null;
  if (experiment.primaryMetric === metric) return null;
  return metric;
}

/** True when this run's primary outcome comes from Health. */
export function usesHealthPrimary(primaryMetric: string): boolean {
  return primaryMetric.startsWith('health_');
}
