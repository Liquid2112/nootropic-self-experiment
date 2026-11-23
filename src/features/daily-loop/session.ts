/**
 * Daily test session assembly — pure logic.
 *
 * This is the seam between the raw data a screen collects (PVT reaction times,
 * N-back responses, self-report sliders, pre-test context, device, timing) and
 * the single test_session row that gets persisted. It:
 *
 *  1. filters sub-100 ms PVT taps (validity.ts) before scoring,
 *  2. scores PVT and 2-back with the cognitive-test engine,
 *  3. runs the session-level validity rules (abandoned / too-many-discarded),
 *  4. flags off-window tests against the check-in window,
 *  5. maps everything to the TestSession shape the repository inserts.
 *
 * No database, no React Native, no clock reads of its own — every input is
 * supplied, so a test pins the whole mapping.
 */
import type { TestSession } from '@/db';
import {
  filterPlausibleReactionTimes,
  scoreNback,
  scorePvt,
  validateSession,
  type NbackResponse,
  type NbackSequence,
} from '@/engines/cognitive-test';
import type { DailyContext } from './context';
import { isOffWindow, type CheckInWindow } from './window';

export type DailyTestInput = {
  experimentId: string;
  dayIndex: number;
  /** ISO timestamp when the test started. */
  startedAt: string;
  /** Local hour (0..23) the test started, for the off-window check. */
  startLocalHour: number;
  /** The experiment's check-in window. */
  window: CheckInWindow;
  /** Device model label, or null when unknown. */
  deviceModel: string | null;

  /** PVT: trials the schedule planned. */
  pvtPlannedTrials: number;
  /** PVT: raw reaction times the user produced (ms, high-res clock). */
  pvtReactionTimesMs: number[];

  /** 2-back: the generated sequence. */
  nbackSequence: NbackSequence;
  /** 2-back: per-trial responses, aligned to the sequence. */
  nbackResponses: NbackResponse[];
  /** The N used to generate/score the 2-back (defaults to 2 in the engine). */
  nbackN?: number;

  /** Pre-test context (sleep, caffeine, form factor). */
  context: DailyContext;
  /** Self-report ratings, each 0..10, or null when skipped. */
  focus: number | null;
  energy: number | null;
  mood: number | null;
  /** Optional free note. */
  note: string | null;
};

export type DailyTestResult = {
  /** The row ready to insert via testSessions.insert. */
  session: Omit<TestSession, 'id'>;
  /** True when the test was taken outside the check-in window. */
  offWindow: boolean;
  /** Why the session is invalid, when it is: 'abandoned' | 'too_many_discarded' | 'ok'. */
  validityReason: string;
};

/**
 * Assemble the persisted session from raw test data. `valid` is the AND of the
 * engine's session validity and the off-window flag: a test taken outside the
 * window is marked invalid so it does not silently enter the analysis, while
 * offWindow is also returned separately so the UI can explain why.
 */
export function assembleDailyTest(input: DailyTestInput): DailyTestResult {
  // 1. Filter implausible PVT taps, then score.
  const usableRts = filterPlausibleReactionTimes(input.pvtReactionTimesMs);
  const pvt = scorePvt(usableRts);

  // 2. Score the 2-back.
  const nback = scoreNback(input.nbackSequence, input.nbackResponses, input.nbackN);

  // 3. Session-level validity from PVT completion/discard.
  const discarded = input.pvtReactionTimesMs.length - usableRts.length;
  const validity = validateSession({
    plannedTrials: input.pvtPlannedTrials,
    completedTrials: input.pvtReactionTimesMs.length,
    discardedTrials: discarded,
  });

  // 4. Off-window flag.
  const offWindow = isOffWindow(input.startLocalHour, input.window);

  // 5. Map to the row. An off-window or engine-invalid test is not valid.
  const valid = validity.valid && !offWindow;

  const session: Omit<TestSession, 'id'> = {
    experimentId: input.experimentId,
    dayIndex: input.dayIndex,
    startedAt: input.startedAt,
    deviceModel: input.deviceModel,
    pvtMedianMs: pvt.medianMs,
    pvtLapses: pvt.lapses,
    nbackAccuracy: nback.accuracy,
    nbackDprime: nback.dPrime,
    focus: input.focus,
    energy: input.energy,
    mood: input.mood,
    sleepHours: input.context.sleepHours,
    caffeine: input.context.caffeine,
    note: input.note,
    valid,
  };

  return { session, offWindow, validityReason: validity.reason };
}
