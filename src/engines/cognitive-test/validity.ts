/**
 * Validity rules that keep the data clean.
 *
 * Two layers:
 *  1. Trial level — a reaction time below a physiological floor (100 ms) is an
 *     anticipation / accidental tap, not a response to the stimulus. Drop those
 *     individual trials before scoring.
 *  2. Session level — a run is only trustworthy if the user actually completed
 *     enough of it and not too many trials had to be discarded. validateSession
 *     reports valid/invalid with a machine-readable reason a UI can show.
 */

/** Reaction times at or below this (ms) are physiologically implausible. */
export const MIN_PLAUSIBLE_RT_MS = 100;
/** A session needs at least this fraction of its planned trials completed. */
export const DEFAULT_MIN_COMPLETION_RATE = 0.75;
/** A session is invalid once more than this fraction of trials are discarded. */
export const DEFAULT_MAX_DISCARD_RATE = 0.25;

export type ValidityReason =
  | 'ok'
  | 'abandoned'
  | 'too_many_discarded';

export type SessionValidity = {
  valid: boolean;
  reason: ValidityReason;
  /** Trials the user actually completed (before discard filtering). */
  completed: number;
  /** Trials dropped by trial-level rules (e.g. sub-100 ms RTs). */
  discarded: number;
  /** Trials that survived discard filtering and feed scoring. */
  usable: number;
};

export type ValidateSessionInput = {
  /** How many trials the schedule planned. */
  plannedTrials: number;
  /** How many trials the user actually completed (responded to / finished). */
  completedTrials: number;
  /** How many completed trials were dropped by trial-level rules. */
  discardedTrials: number;
  /** Override the minimum completion rate (fraction of plannedTrials). */
  minCompletionRate?: number;
  /** Override the maximum discard rate (fraction of completedTrials). */
  maxDiscardRate?: number;
};

/**
 * Keep only reaction times at or above the physiological floor. Sub-100 ms taps
 * are anticipations and must be removed before PVT/N-back scoring. Does not
 * mutate the input.
 */
export function filterPlausibleReactionTimes(reactionTimesMs: number[]): number[] {
  return reactionTimesMs.filter((rt) => rt >= MIN_PLAUSIBLE_RT_MS);
}

/**
 * Decide whether a completed test session is valid.
 *
 * Invalid when:
 *  - 'abandoned': the user completed fewer than minCompletionRate of the planned
 *    trials (stopped partway).
 *  - 'too_many_discarded': more than maxDiscardRate of the completed trials were
 *    dropped by trial-level rules, so too little clean data remains.
 *
 * Abandonment is checked first: a run that was barely started is abandoned even
 * if every trial it did collect was clean.
 */
export function validateSession(input: ValidateSessionInput): SessionValidity {
  const {
    plannedTrials,
    completedTrials,
    discardedTrials,
  } = input;
  const minCompletionRate = input.minCompletionRate ?? DEFAULT_MIN_COMPLETION_RATE;
  const maxDiscardRate = input.maxDiscardRate ?? DEFAULT_MAX_DISCARD_RATE;

  if (plannedTrials < 0 || completedTrials < 0 || discardedTrials < 0) {
    throw new Error('validateSession: trial counts must be non-negative');
  }
  if (completedTrials > plannedTrials) {
    throw new Error(
      `validateSession: completedTrials (${completedTrials}) cannot exceed plannedTrials (${plannedTrials})`
    );
  }
  if (discardedTrials > completedTrials) {
    throw new Error(
      `validateSession: discardedTrials (${discardedTrials}) cannot exceed completedTrials (${completedTrials})`
    );
  }

  const usable = completedTrials - discardedTrials;

  // Abandoned: too little of the planned run was completed. A zero-trial plan is
  // treated as abandoned since there is nothing to measure.
  const completionRate = plannedTrials === 0 ? 0 : completedTrials / plannedTrials;
  if (completionRate < minCompletionRate) {
    return {
      valid: false,
      reason: 'abandoned',
      completed: completedTrials,
      discarded: discardedTrials,
      usable,
    };
  }

  // Too many discarded among the completed trials.
  const discardRate = completedTrials === 0 ? 0 : discardedTrials / completedTrials;
  if (discardRate > maxDiscardRate) {
    return {
      valid: false,
      reason: 'too_many_discarded',
      completed: completedTrials,
      discarded: discardedTrials,
      usable,
    };
  }

  return {
    valid: true,
    reason: 'ok',
    completed: completedTrials,
    discarded: discardedTrials,
    usable,
  };
}
