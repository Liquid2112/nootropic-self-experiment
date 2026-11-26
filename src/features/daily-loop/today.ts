/**
 * Today (home) screen model — pure logic.
 *
 * Given an experiment, its schedule, and the current date, this computes what
 * the daily hub shows: which day the user is on, the dose instruction for
 * today, whether the dose is already marked taken, and the consecutive-day
 * streak. All UI-free and deterministic so a test pins every branch.
 *
 * Reveal rule: runs are solo and open-label, so today's ON/OFF call is shown,
 * but only today's. Nothing here returns a future day's arm.
 */
import type { BlindingMode, Experiment, ScheduleDay } from '@/db';
import { BASELINE_DAYS, baselineDayIndex } from '@/engines/experiment';

export type TodayView = {
  /** 1-based day number within the experiment. */
  dayNumber: number;
  /** Total planned days. */
  totalDays: number;
  /** Human instruction for today's dose. */
  instruction: string;
  /** Today's ON/OFF call, or null outside the run (baseline, finished). */
  arm: 'ON' | 'OFF' | null;
  /** True once the dose for today is marked taken. */
  taken: boolean;
  /** ISO timestamp the dose was marked taken, or null. */
  takenAt: string | null;
  /** Consecutive days (ending today) the dose was marked taken. */
  streak: number;
  /** True when today falls inside the experiment window (a scheduled day). */
  hasDayForToday: boolean;
  /**
   * True during the 3-day baseline before the run. There is no dose to mark;
   * the user only does the check-in. `dayNumber`/`totalDays` then count the
   * baseline (1..3 of 3) instead of the run.
   */
  isBaseline: boolean;
  /** True once every scheduled day is in the past: time for the verdict. */
  isFinished: boolean;
};

/** What the user reads on a baseline day. */
export function baselineInstruction(baselineDayNumber: number): string {
  return `Baseline day ${baselineDayNumber} of ${BASELINE_DAYS}: don't take the supplement yet. Just do today's check-in so the test settles in before the experiment starts.`;
}

/**
 * The day index a check-in on `isoDate` belongs to: the schedule day's index
 * during the run, a negative baseline index (-3..-1) during the baseline, or
 * null when the date is outside both (the check-in has no day to attach to).
 */
export function checkInDayIndex(
  experiment: Pick<Experiment, 'startDate'>,
  schedule: ScheduleDay[],
  isoDate: string,
): number | null {
  const day = findDayForDate(schedule, isoDate);
  if (day) {
    return day.dayIndex;
  }
  return baselineDayIndex(experiment.startDate, isoDate);
}

/**
 * Map an arm to the instruction the user reads.
 *
 * Runs are solo and open-label: the app randomizes the ON/OFF days and reveals
 * only today's call each morning, so the user can't save the supplement for
 * days they already feel good. Future days are never shown.
 *
 * Legacy blinded runs (A/B arms from before blinding was dropped) fall back to
 * a neutral "day A / day B" wording so nothing reveals a sealed assignment.
 */
export function instructionForDay(
  blindingMode: BlindingMode,
  day: ScheduleDay,
): string {
  if (blindingMode === 'none' && day.arm === 'ON') {
    return 'ON day. Take your usual dose, then do your check-in.';
  }
  if (blindingMode === 'none' && day.arm === 'OFF') {
    return 'OFF day. Skip it today, but still do your check-in.';
  }
  return day.arm === 'A' || day.arm === 'ON' ? 'Today is day A.' : 'Today is day B.';
}

/** Today's revealed arm for an open run, or null when there's none to show. */
export function revealedArm(blindingMode: BlindingMode, day: ScheduleDay | undefined): 'ON' | 'OFF' | null {
  if (!day || blindingMode !== 'none') return null;
  return day.arm === 'ON' ? 'ON' : day.arm === 'OFF' ? 'OFF' : null;
}

/** Find the schedule day whose date matches the given ISO date (YYYY-MM-DD). */
export function findDayForDate(
  schedule: ScheduleDay[],
  isoDate: string,
): ScheduleDay | undefined {
  return schedule.find((d) => d.date === isoDate);
}

/**
 * Consecutive-day streak of taken doses ending at (and including) the given
 * day index, walking backwards. A gap (an untaken day) or an OFF day with no
 * dose breaks the streak. OFF/untaken days that were never meant to be taken
 * do not extend the streak but the count reflects taken doses only.
 */
export function computeStreak(schedule: ScheduleDay[], uptoDayIndex: number): number {
  const byIndex = new Map(schedule.map((d) => [d.dayIndex, d]));
  let streak = 0;
  for (let i = uptoDayIndex; i >= 0; i -= 1) {
    const day = byIndex.get(i);
    if (day && day.taken) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export type BuildTodayViewInput = {
  experiment: Experiment;
  schedule: ScheduleDay[];
  /** Today's date as ISO YYYY-MM-DD (caller supplies, so tests are deterministic). */
  isoDate: string;
};

/**
 * Build the full Today view. When today is outside the schedule (before start
 * or after the run), hasDayForToday is false and the instruction says so; the
 * UI uses that to show a between-days or finished state.
 */
export function buildTodayView({
  experiment,
  schedule,
  isoDate,
}: BuildTodayViewInput): TodayView {
  const totalDays = experiment.lengthDays;
  const today = findDayForDate(schedule, isoDate);

  if (!today) {
    const baselineIndex = baselineDayIndex(experiment.startDate, isoDate);
    if (baselineIndex !== null) {
      const baselineDayNumber = BASELINE_DAYS + baselineIndex + 1;
      return {
        dayNumber: baselineDayNumber,
        totalDays: BASELINE_DAYS,
        instruction: baselineInstruction(baselineDayNumber),
        arm: null,
        taken: false,
        takenAt: null,
        streak: 0,
        hasDayForToday: false,
        isBaseline: true,
        isFinished: false,
      };
    }
    return {
      dayNumber: 0,
      totalDays,
      instruction: 'No scheduled dose for today.',
      arm: null,
      taken: false,
      takenAt: null,
      streak: computeLatestStreak(schedule, isoDate),
      hasDayForToday: false,
      isBaseline: false,
      isFinished: schedule.length > 0 && schedule.every((d) => d.date < isoDate),
    };
  }

  return {
    dayNumber: today.dayIndex + 1,
    totalDays,
    instruction: instructionForDay(experiment.blindingMode, today),
    arm: revealedArm(experiment.blindingMode, today),
    taken: today.taken,
    takenAt: today.takenAt,
    streak: computeStreak(schedule, today.dayIndex),
    hasDayForToday: true,
    isBaseline: false,
    isFinished: false,
  };
}

/**
 * Streak ending at the most recent scheduled day at or before isoDate. Used for
 * the between-days state where there is no day for today itself.
 */
function computeLatestStreak(schedule: ScheduleDay[], isoDate: string): number {
  const past = schedule
    .filter((d) => d.date <= isoDate)
    .sort((a, b) => b.dayIndex - a.dayIndex);
  const last = past[0];
  if (!last) {
    return 0;
  }
  return computeStreak(schedule, last.dayIndex);
}
