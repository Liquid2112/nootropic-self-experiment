import type { ScheduleDay } from '@/db';
import { buildAcuteSequence } from './acute';
import { applyBlinding, type SealOptions } from './blinding';
import { buildCumulativeSequence } from './cumulative';
import type {
  GenerateScheduleInput,
  GeneratedDay,
  GeneratedSchedule,
  RunLength,
  TrueArm,
} from './types';

/**
 * Top-level experiment-design engine.
 *
 * `generateSchedule` turns {design, blindingMode, lengthDays, startDate, seed}
 * into an ordered list of generated days (dayIndex, date, stored arm label,
 * baseline flag) plus the blinding state and sealed key the run needs. It is a
 * pure function: same input -> same output, no DB or RN dependency.
 *
 * BASELINE HANDLING: the 3-day baseline is a lead-in BEFORE the run, not part
 * of it. The randomized ON/OFF balance and the block layout cover the full run
 * length (14/14 for 28 days, 10/11 for 21), and every generated day is a real
 * arm day. The baseline occupies the `BASELINE_DAYS` calendar days before
 * `startDate`: the user takes nothing new and just does the daily test so
 * practice effects flatten. Baseline check-ins are stored with negative day
 * indices (-3..-1), so they never join a schedule day and never enter the
 * analysis or the adherence gate. See `baselineDayIndex`.
 */

/** Number of lead-in baseline days at the start of a run. */
export const BASELINE_DAYS = 3;

/**
 * Whole calendar days from ISO date `from` to ISO date `to` (negative when `to`
 * is earlier). UTC math, so it is free of time-zone/DST drift.
 */
export function daysBetween(from: string, to: string): number {
  const parse = (iso: string): number => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) {
      throw new Error(`Expected an ISO YYYY-MM-DD date, got "${iso}"`);
    }
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  return Math.round((parse(to) - parse(from)) / (24 * 60 * 60 * 1000));
}

/**
 * The baseline day index for `isoDate`, or null when that date is not a
 * baseline day. Baseline days are the `BASELINE_DAYS` days right before the
 * run's `startDate` and get indices -BASELINE_DAYS..-1 (so -3 is baseline day 1
 * of 3 and -1 is the last one before the run starts).
 */
export function baselineDayIndex(startDate: string, isoDate: string): number | null {
  const offset = daysBetween(startDate, isoDate);
  return offset < 0 && offset >= -BASELINE_DAYS ? offset : null;
}

/** The two run lengths the MVP supports. */
const SUPPORTED_LENGTHS: readonly number[] = [21, 28];

function isRunLength(value: number): value is RunLength {
  return SUPPORTED_LENGTHS.includes(value);
}

/**
 * Add `days` whole days to an ISO `YYYY-MM-DD` date and return a new ISO date.
 * Uses UTC math so it is free of time-zone/DST drift (dates are calendar days,
 * not instants).
 */
export function addDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`startDate must be an ISO YYYY-MM-DD date, got "${isoDate}"`);
  }
  const y = match[1] as string;
  const m = match[2] as string;
  const d = match[3] as string;
  const base = Date.UTC(Number(y), Number(m) - 1, Number(d));
  const shifted = new Date(base + days * 24 * 60 * 60 * 1000);
  const yy = shifted.getUTCFullYear().toString().padStart(4, '0');
  const mm = (shifted.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getUTCDate().toString().padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Build the true ON/OFF arm sequence for a design. */
function buildTrueArms(
  design: GenerateScheduleInput['design'],
  lengthDays: RunLength,
  seed: string | number,
): TrueArm[] {
  return design === 'acute'
    ? buildAcuteSequence(lengthDays, seed)
    : buildCumulativeSequence(lengthDays);
}

/**
 * Generate a full schedule. `sealOptions` carries the friend's passphrase for
 * 'sealed' (friend-blinded) runs; it is required there and optional otherwise.
 */
export function generateSchedule(
  input: GenerateScheduleInput,
  sealOptions: SealOptions = {},
): GeneratedSchedule {
  if (!isRunLength(input.lengthDays)) {
    throw new Error(
      `lengthDays must be one of ${SUPPORTED_LENGTHS.join(', ')}, got ${input.lengthDays}`,
    );
  }

  const trueArms = buildTrueArms(input.design, input.lengthDays, input.seed);
  const blinding = applyBlinding(trueArms, input.blindingMode, input.seed, sealOptions);

  const days: GeneratedDay[] = blinding.storedArms.map((arm, dayIndex) => ({
    dayIndex,
    date: addDays(input.startDate, dayIndex),
    arm,
  }));

  return {
    design: input.design,
    blindingMode: input.blindingMode,
    lengthDays: input.lengthDays,
    days,
    blindingState: blinding.blindingState,
    sealedKey: blinding.sealedKey,
  };
}

/**
 * Map generated days into full `schedule_day` domain rows for one experiment.
 * The engine owns dayIndex/date/arm; the DB layer owns identity and progress
 * (`taken`/`takenAt`), so those default to not-yet-taken here.
 */
export function toScheduleDayRows(
  experimentId: string,
  schedule: GeneratedSchedule,
): ScheduleDay[] {
  return schedule.days.map((day) => ({
    experimentId,
    dayIndex: day.dayIndex,
    date: day.date,
    arm: day.arm,
    taken: false,
    takenAt: null,
  }));
}

/**
 * Mid-point window check. During the mid-point window the app shows ADHERENCE
 * ONLY (no results) so a user cannot peek at the trend and unblind themselves.
 *
 * The window is days 10..14 inclusive (0-indexed day indices), the span the
 * spec names, intersected with the actual run so a 21-day run does not report a
 * mid-point past its own end.
 */
export const MIDPOINT_START_DAY = 10;
export const MIDPOINT_END_DAY = 14;

export function isMidpointDay(dayIndex: number, lengthDays: RunLength): boolean {
  const lastDay = lengthDays - 1;
  const end = Math.min(MIDPOINT_END_DAY, lastDay);
  return dayIndex >= MIDPOINT_START_DAY && dayIndex <= end;
}
