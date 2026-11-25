/**
 * Adherence calendar model.
 *
 * Turns the stored schedule_day + test_session rows into a per-day view model
 * for the Progress screen and a summary used by both the mid-point check and
 * the adherence gate. This is pure and database-free: the screen reads the rows
 * from the DAOs and passes them in, so the logic unit-tests without a RN
 * runtime.
 *
 * DELIBERATE BLIND PROTECTION: the per-day model carries only taken / missed /
 * tested status and the day number. It never carries a metric value, so the
 * calendar cannot reveal a trend and let the user unblind themselves before the
 * run ends.
 */

import { MIDPOINT_END_DAY, MIDPOINT_START_DAY } from '@/engines/experiment';
import {
  ADHERENCE_THRESHOLD,
  adherenceRate,
  type AdherenceInput,
} from '@/engines/stats';
import type { ScheduleDay, TestSession } from '@/db/types';

/** Status of one day for calendar rendering. Mirrors CalendarCell's DayStatus. */
export type DayStatus = 'taken' | 'missed' | 'upcoming';

export type CalendarDay = {
  /** 0-based schedule index. */
  dayIndex: number;
  /** 1-based number shown to the user. */
  dayNumber: number;
  date: string;
  status: DayStatus;
  /** A valid test session exists for this day. */
  tested: boolean;
};

export type AdherenceSummary = {
  scheduledDays: number;
  takenDays: number;
  testedDays: number;
  /** min(taken, tested) / scheduled, the gate's own definition. */
  rate: number;
  /** rate >= 80%. */
  meetsGate: boolean;
  /** Elapsed days (<= today), used so a mid-run summary isn't judged against future days. */
  elapsedDays: number;
};

/**
 * Build the per-day calendar model. `todayIndex` is the current 0-based day
 * (e.g. days since start); days at or before it are evaluated as taken/missed,
 * days after it are 'upcoming'. The 3-day baseline happens before day 0 and is
 * not part of the schedule, so every day here is a real run day. During the
 * baseline itself `todayIndex` is negative and every day reads 'upcoming'.
 */
export function buildCalendar(
  schedule: ScheduleDay[],
  sessions: TestSession[],
  todayIndex: number,
): CalendarDay[] {
  const testedByDay = new Set<number>();
  for (const s of sessions) {
    if (s.valid) testedByDay.add(s.dayIndex);
  }

  return [...schedule]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((d) => {
      let status: DayStatus;
      if (d.dayIndex > todayIndex) {
        status = 'upcoming';
      } else {
        status = d.taken ? 'taken' : 'missed';
      }
      return {
        dayIndex: d.dayIndex,
        dayNumber: d.dayIndex + 1,
        date: d.date,
        status,
        tested: testedByDay.has(d.dayIndex),
      };
    });
}

/**
 * Summarize adherence over the elapsed portion of the run. Baseline check-ins
 * (negative day indices, before the run) never match a schedule day, so they
 * neither count toward nor drag down the rate. `todayIndex`
 * bounds the window so a mid-run check is judged only against days that have
 * happened.
 */
export function summarizeAdherence(
  schedule: ScheduleDay[],
  sessions: TestSession[],
  todayIndex: number,
): AdherenceSummary {
  const testedByDay = new Set<number>();
  for (const s of sessions) {
    if (s.valid) testedByDay.add(s.dayIndex);
  }

  let scheduledDays = 0;
  let takenDays = 0;
  let testedDays = 0;
  let elapsedDays = 0;
  for (const d of schedule) {
    if (d.dayIndex > todayIndex) continue; // not reached yet
    scheduledDays += 1;
    elapsedDays += 1;
    if (d.taken) takenDays += 1;
    if (testedByDay.has(d.dayIndex)) testedDays += 1;
  }

  const input: AdherenceInput = { scheduledDays, takenDays, testedDays };
  const rate = adherenceRate(input);
  return {
    scheduledDays,
    takenDays,
    testedDays,
    rate,
    meetsGate: rate >= ADHERENCE_THRESHOLD,
    elapsedDays,
  };
}

/** Adherence as whole-number percent for display, e.g. 83. */
export function adherencePercent(summary: AdherenceSummary): number {
  return Math.round(summary.rate * 100);
}

/**
 * Whether the run is in the mid-point window (days 10-14 inclusive, intersected
 * with the run length). During this window the Progress screen shows adherence
 * only, never results.
 */
export function isMidpointWindow(todayIndex: number, lengthDays: number): boolean {
  const end = Math.min(MIDPOINT_END_DAY, lengthDays - 1);
  return todayIndex >= MIDPOINT_START_DAY && todayIndex <= end;
}

/** Whether the run has ended (the last scheduled day has passed). */
export function isRunComplete(todayIndex: number, lengthDays: number): boolean {
  return todayIndex >= lengthDays - 1;
}
