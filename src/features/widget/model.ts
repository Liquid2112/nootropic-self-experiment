/**
 * Home-screen widget and Live Activity model — pure logic.
 *
 * The widget's job is retention: it keeps the run in front of the user every
 * time they unlock their phone, so it shows exactly four things — today's
 * instruction, the check-in countdown, the streak, and the days left until the
 * verdict reveal. Everything here is a plain function of the experiment, its
 * schedule and the activity already recorded, so it is unit tested without the
 * native widget module (see ./native.ts for the glue).
 *
 * Reveal rule: nothing here reads a test score, and only today's ON/OFF call
 * is shown (the same call `instructionForDay` makes on the Today screen), never
 * a future day's.
 */
import type { BlindingMode, Experiment, ScheduleDay } from '@/db/types';
import { BASELINE_DAYS, addDays, baselineDayIndex } from '@/engines/experiment';
import { findDayForDate, type CheckInWindow } from '@/features/daily-loop';

/** Which part of the run the user is in. */
export type WidgetPhase = 'empty' | 'baseline' | 'run' | 'between' | 'ready' | 'paused';

/**
 * Props handed to the native widget. Plain JSON (numbers, strings, booleans)
 * because they cross the bridge and are stored in the widget's timeline.
 */
export type WidgetSnapshot = {
  phase: WidgetPhase;
  /** "Day 9 of 28", "Baseline 2 of 3", "Verdict ready". */
  headline: string;
  /** Short instruction: "ON day", "OFF day", "Test only". */
  instruction: string;
  /** One-line nudge under the instruction. */
  nudge: string;
  doseDone: boolean;
  checkInDone: boolean;
  /** Current streak in days. */
  streak: number;
  /** Whole days until the verdict unlocks (0 once it's ready). */
  daysToVerdict: number;
  /** "Dec 19": the reveal date, so the user has a date to look forward to. */
  verdictDateLabel: string;
  /** 0..1 progress through the whole run, baseline included. */
  progress: number;
  /** Today's check-in window, epoch ms (0 when there's no check-in today). */
  windowStartMs: number;
  windowEndMs: number;
  /** Deep link the widget opens. */
  url: string;
};

/** Deep links the widget and Live Activity open. */
export const WIDGET_LINKS = {
  today: 'placebo://',
  checkIn: 'placebo://daily-test',
  verdict: 'placebo://verdict',
  start: 'placebo://welcome',
} as const;

export type WidgetInput = {
  experiment: Pick<Experiment, 'blindingMode' | 'lengthDays' | 'startDate'> | null;
  schedule: ScheduleDay[];
  /** Local YYYY-MM-DD for "today". */
  isoDate: string;
  /** Whether today's check-in is already done (from the gamification state). */
  checkInDone: boolean;
  /** Current streak (from the gamification state). */
  streak: number;
  window: CheckInWindow;
  /** Local midnight of `isoDate` in epoch ms; the window is offset from it. */
  dayStartMs: number;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-12-19" -> "Dec 19". */
export function shortDateLabel(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1] ?? ''} ${d ?? ''}`.trim();
}

/** The date the verdict unlocks: the day after the last scheduled day. */
export function verdictDate(experiment: Pick<Experiment, 'startDate' | 'lengthDays'>): string {
  return addDays(experiment.startDate, experiment.lengthDays);
}

/** Whole calendar days from `from` to `to` (YYYY-MM-DD), never negative. */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(...(ymd(from) as [number, number, number]));
  const b = Date.UTC(...(ymd(to) as [number, number, number]));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function ymd(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y ?? 1970, (m ?? 1) - 1, d ?? 1];
}

/**
 * The short instruction the widget shows. Mirrors `instructionForDay`: an open
 * run names today's ON/OFF, a legacy blinded run only a neutral day letter.
 */
export function shortInstruction(blindingMode: BlindingMode, day: ScheduleDay): string {
  if (blindingMode === 'none') {
    if (day.arm === 'ON') return 'ON day';
    if (day.arm === 'OFF') return 'OFF day';
    return `Day ${day.arm}`;
  }
  return day.arm === 'A' || day.arm === 'ON' ? 'Day A' : 'Day B';
}

/**
 * What the widget shows while the run is paused after a logged bad reaction.
 * Deliberately vague: the widget sits on the lock screen where others can see
 * it, so it never mentions the reaction.
 */
export function pausedSnapshot(): WidgetSnapshot {
  return {
    phase: 'paused',
    headline: 'Run paused',
    instruction: 'No dose',
    nudge: 'Open Placebo for details',
    doseDone: false,
    checkInDone: false,
    streak: 0,
    daysToVerdict: 0,
    verdictDateLabel: '',
    progress: 0,
    windowStartMs: 0,
    windowEndMs: 0,
    url: WIDGET_LINKS.today,
  };
}

/** Build the snapshot the widget renders for one day. */
export function buildWidgetSnapshot(input: WidgetInput): WidgetSnapshot {
  const { experiment, schedule, isoDate, window, dayStartMs } = input;
  const windowStartMs = dayStartMs + window.startHour * 3_600_000;
  const windowEndMs = dayStartMs + window.endHour * 3_600_000;

  if (!experiment) {
    return {
      phase: 'empty',
      headline: 'Is it working, or is it you?',
      instruction: 'Start an experiment',
      nudge: 'Find out in 28 days',
      doseDone: false,
      checkInDone: false,
      streak: 0,
      daysToVerdict: 0,
      verdictDateLabel: '',
      progress: 0,
      windowStartMs: 0,
      windowEndMs: 0,
      url: WIDGET_LINKS.start,
    };
  }

  const reveal = verdictDate(experiment);
  const verdictDateLabel = shortDateLabel(reveal);
  const daysToVerdict = daysBetween(isoDate, reveal);
  const baselineStart = addDays(experiment.startDate, -BASELINE_DAYS);
  const totalSpan = BASELINE_DAYS + experiment.lengthDays;
  const progress = Math.min(1, Math.max(0, (totalSpan - daysToVerdict) / totalSpan));
  const common = {
    streak: input.streak,
    daysToVerdict,
    verdictDateLabel,
    progress: isoDate < baselineStart ? 0 : progress,
  };

  const today = findDayForDate(schedule, isoDate);
  if (today) {
    const checkInDone = input.checkInDone;
    const doseDone = today.taken;
    return {
      ...common,
      phase: 'run',
      headline: `Day ${today.dayIndex + 1} of ${experiment.lengthDays}`,
      instruction: shortInstruction(experiment.blindingMode, today),
      nudge: nudgeFor({ doseDone, checkInDone, daysToVerdict, streak: input.streak }),
      doseDone,
      checkInDone,
      windowStartMs,
      windowEndMs,
      url: checkInDone ? WIDGET_LINKS.today : WIDGET_LINKS.checkIn,
    };
  }

  const baselineIndex = baselineDayIndex(experiment.startDate, isoDate);
  if (baselineIndex !== null) {
    const n = BASELINE_DAYS + baselineIndex + 1;
    return {
      ...common,
      phase: 'baseline',
      headline: `Baseline ${n} of ${BASELINE_DAYS}`,
      instruction: 'Test only',
      nudge: input.checkInDone
        ? 'Baseline logged. No capsule yet.'
        : 'No capsule yet. Just the 2-minute test.',
      doseDone: false,
      checkInDone: input.checkInDone,
      windowStartMs,
      windowEndMs,
      url: input.checkInDone ? WIDGET_LINKS.today : WIDGET_LINKS.checkIn,
    };
  }

  const finished = schedule.length > 0 && schedule.every((d) => d.date < isoDate);
  if (finished) {
    return {
      ...common,
      phase: 'ready',
      headline: 'Verdict ready',
      instruction: 'Reveal it',
      nudge: 'Was it working, or was it you?',
      doseDone: false,
      checkInDone: false,
      daysToVerdict: 0,
      progress: 1,
      windowStartMs: 0,
      windowEndMs: 0,
      url: WIDGET_LINKS.verdict,
    };
  }

  return {
    ...common,
    phase: 'between',
    headline: 'Next day soon',
    instruction: 'Nothing today',
    nudge: `Verdict on ${verdictDateLabel}`,
    doseDone: false,
    checkInDone: false,
    windowStartMs: 0,
    windowEndMs: 0,
    url: WIDGET_LINKS.today,
  };
}

/**
 * The one-line nudge. Ordered by what's left to do, then by the loss the user
 * would feel (the streak), then by the reward ahead (the reveal).
 */
export function nudgeFor(s: {
  doseDone: boolean;
  checkInDone: boolean;
  daysToVerdict: number;
  streak: number;
}): string {
  if (!s.doseDone && !s.checkInDone) return 'Dose + 90-sec check-in';
  if (!s.checkInDone) return 'Check-in left: 2 minutes';
  if (!s.doseDone) return 'Log your dose';
  if (s.daysToVerdict <= 3) return `${s.daysToVerdict} day${s.daysToVerdict === 1 ? '' : 's'} to the reveal`;
  if (s.streak >= 3) return `${s.streak}-day streak. See you tomorrow.`;
  return 'All done today';
}

export type TimelineEntry = { dateMs: number; props: WidgetSnapshot };

/**
 * Timeline for the iOS widget: the current state, then the check-in window
 * opening and closing, then each of the next few midnights. iOS renders each
 * entry at its date without waking the app, so the widget stays right even if
 * the user doesn't open Placebo for a day.
 *
 * Future days start with nothing done. The streak carries over to the first
 * midnight only if today already counts; otherwise it has ended by then.
 */
export function buildTimeline(
  base: Omit<WidgetInput, 'isoDate' | 'dayStartMs'> & { nowMs: number; isoDate: string; dayStartMs: number },
  activeToday: boolean,
  daysAhead = 3,
): TimelineEntry[] {
  const today = buildWidgetSnapshot(base);
  const entries: TimelineEntry[] = [{ dateMs: base.nowMs, props: today }];

  if (today.windowStartMs > base.nowMs && !today.checkInDone) {
    entries.push({
      dateMs: today.windowStartMs,
      props: { ...today, nudge: 'Check-in is open now' },
    });
  }
  if (today.windowEndMs > base.nowMs && !today.checkInDone && today.windowEndMs < base.dayStartMs + 86_400_000) {
    entries.push({
      dateMs: today.windowEndMs,
      props: { ...today, nudge: 'Window closed. Check in anyway.' },
    });
  }

  for (let i = 1; i <= daysAhead; i += 1) {
    const isoDate = addDays(base.isoDate, i);
    const dayStartMs = base.dayStartMs + i * 86_400_000;
    const streak = i === 1 && activeToday ? base.streak : 0;
    entries.push({
      dateMs: dayStartMs,
      props: buildWidgetSnapshot({ ...base, isoDate, dayStartMs, checkInDone: false, streak }),
    });
  }
  return entries;
}

// --- Live Activity -----------------------------------------------------------

/** Props for the check-in Live Activity (lock screen + Dynamic Island). */
export type LiveActivityProps = {
  headline: string;
  instruction: string;
  streak: number;
  daysToVerdict: number;
  /** When the check-in window closes, epoch ms; drives the countdown timer. */
  closesAtMs: number;
  url: string;
};

export type LiveActivityPlan =
  | { action: 'start' | 'update'; props: LiveActivityProps; staleAtMs: number }
  | { action: 'end' }
  | { action: 'none' };

/**
 * Decide what the check-in Live Activity should do right now. It runs only
 * while today's check-in window is open and the check-in isn't done: a ticking
 * "closes in 1:42:10" on the lock screen is the strongest same-day nudge iOS
 * allows. It ends as soon as the check-in is saved or the window closes.
 */
export function planLiveActivity(
  snapshot: WidgetSnapshot,
  nowMs: number,
  hasRunning: boolean,
): LiveActivityPlan {
  const open =
    (snapshot.phase === 'run' || snapshot.phase === 'baseline') &&
    !snapshot.checkInDone &&
    nowMs >= snapshot.windowStartMs &&
    nowMs < snapshot.windowEndMs;
  if (!open) {
    return hasRunning ? { action: 'end' } : { action: 'none' };
  }
  return {
    action: hasRunning ? 'update' : 'start',
    staleAtMs: snapshot.windowEndMs,
    props: {
      headline: snapshot.headline,
      instruction: snapshot.instruction,
      streak: snapshot.streak,
      daysToVerdict: snapshot.daysToVerdict,
      closesAtMs: snapshot.windowEndMs,
      url: WIDGET_LINKS.checkIn,
    },
  };
}
