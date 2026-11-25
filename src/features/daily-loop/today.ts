/**
 * Today (home) screen model — pure logic.
 *
 * Given an experiment, its schedule, and the current date, this computes what
 * the daily hub shows: which day the user is on, the dose instruction for
 * today, whether the dose is already marked taken, and the consecutive-day
 * streak. All UI-free and deterministic so a test pins every branch.
 *
 * Blinding rule (critical): during a blinded run the user must never see which
 * arm today is. For a sealed/self-blind experiment the instruction is phrased
 * in terms of a numbered cup (A/B map to cups, not to ON/OFF), and the raw arm
 * is never returned to the UI. Only an unblinded ('none') run names ON/OFF.
 */
import type { BlindingMode, Experiment, ScheduleDay } from '@/db';
import { BASELINE_DAYS, baselineDayIndex } from '@/engines/experiment';

export type TodayView = {
  /** 1-based day number within the experiment. */
  dayNumber: number;
  /** Total planned days. */
  totalDays: number;
  /** Human instruction for today's dose. Never reveals the arm when blinded. */
  instruction: string;
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
 * Map an arm to the instruction the user reads, respecting blinding.
 *
 * - none (unblinded): the real arm is shown ("Take your capsule" / "No capsule
 *   today").
 * - self_blind / sealed: the arm is hidden behind cup labels. A/B map directly
 *   to cup A/B; an ON/OFF schedule under blinding is still phrased as a cup so
 *   the assignment is not leaked.
 */
export function instructionForDay(
  blindingMode: BlindingMode,
  day: ScheduleDay,
): string {
  if (blindingMode === 'none') {
    switch (day.arm) {
      case 'ON':
        return 'Take your capsule today (ON day).';
      case 'OFF':
        return 'No capsule today (OFF day).';
      case 'A':
        return 'Take the capsule from cup A today.';
      case 'B':
        return 'Take the capsule from cup B today.';
    }
  }
  // Blinded: never reveal ON/OFF. Present a cup to take from. An ON/OFF day is
  // mapped to a cup label by parity of the day so the user still has a concrete
  // instruction without learning the assignment.
  if (day.arm === 'A' || day.arm === 'ON') {
    return 'Take the capsule from cup A today.';
  }
  return 'Take the capsule from cup B today.';
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
        taken: false,
        takenAt: null,
        streak: 0,
        hasDayForToday: false,
        isBaseline: true,
      };
    }
    return {
      dayNumber: 0,
      totalDays,
      instruction: 'No scheduled dose for today.',
      taken: false,
      takenAt: null,
      streak: computeLatestStreak(schedule, isoDate),
      hasDayForToday: false,
      isBaseline: false,
    };
  }

  return {
    dayNumber: today.dayIndex + 1,
    totalDays,
    instruction: instructionForDay(experiment.blindingMode, today),
    taken: today.taken,
    takenAt: today.takenAt,
    streak: computeStreak(schedule, today.dayIndex),
    hasDayForToday: true,
    isBaseline: false,
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
