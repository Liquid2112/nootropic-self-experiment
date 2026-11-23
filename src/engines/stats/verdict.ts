/**
 * Effect size, block-mean difference, plain-language formatting, the adherence
 * gate, and the verdict rule. These turn the OLS + HAC numbers into the single
 * payoff the app shows: a comparable effect size and one sentence the user can
 * act on.
 */

import { type ConfidenceInterval } from './hac';
import { type BetterDirection, isImprovement, type MetricSpec } from './metrics';

/** The four verdict states, matching the spec wording. */
export type VerdictState =
  | 'measurable_improvement'
  | 'no_meaningful_effect'
  | 'not_enough_data'
  | 'measured_worse';

/** Canonical plain-language sentence for each verdict state. */
export const VERDICT_SENTENCE: Record<VerdictState, string> = {
  measurable_improvement: 'Measurable improvement for you.',
  no_meaningful_effect: 'No meaningful effect detected.',
  not_enough_data: 'Not enough data: extend 2 weeks or improve adherence.',
  measured_worse: 'Measured worse on ON days.',
};

/**
 * Standardized effect size: b1 divided by the residual SD (a Cohen's-d-style
 * scale that makes metrics in different units comparable). Caller passes the
 * residual SD from residualSd(fit).
 */
export function effectSize(b1: number, resid: number): number {
  if (resid <= 0) throw new Error('Residual SD must be positive');
  return b1 / resid;
}

/**
 * Simple block-mean difference mean(ON) - mean(OFF), used for block/cumulative
 * designs alongside the regression estimate. `on` is the 0/1 ON indicator per
 * day. Throws if either group is empty (all-ON or all-OFF), which the caller
 * treats as a degenerate design.
 */
export function blockMeanDifference(y: number[], on: number[]): number {
  if (y.length !== on.length) throw new Error('y and on length mismatch');
  let sumOn = 0;
  let nOn = 0;
  let sumOff = 0;
  let nOff = 0;
  for (let i = 0; i < y.length; i++) {
    if (on[i] === 1) {
      sumOn += y[i]!;
      nOn++;
    } else {
      sumOff += y[i]!;
      nOff++;
    }
  }
  if (nOn === 0 || nOff === 0) {
    throw new Error('Block-mean difference needs both ON and OFF days');
  }
  return sumOn / nOn - sumOff / nOff;
}

/**
 * Plain-unit sentence, e.g. "reaction time 18 ms faster (range 4-32 ms)".
 * Reports the magnitude in the metric's own units, the improvement direction
 * as a word, and the 90% CI as a range. For "lower is better" metrics a
 * negative delta reads as "faster"/"fewer"; for "higher is better" a positive
 * delta reads as "higher".
 */
export function formatEffect(
  spec: MetricSpec,
  estimate: number,
  ci: ConfidenceInterval,
): string {
  const improved = isImprovement(spec.betterDirection, estimate);
  const verb = improvementWord(spec, improved);
  const mag = Math.abs(estimate);
  const unit = spec.unit ? ` ${spec.unit}` : '';
  const lo = Math.min(Math.abs(ci.low), Math.abs(ci.high));
  const hi = Math.max(Math.abs(ci.low), Math.abs(ci.high));
  const rangeUnit = spec.unit ? ` ${spec.unit}` : '';
  return (
    `${spec.label} ${round(mag)}${unit} ${verb} ` +
    `(range ${round(lo)}-${round(hi)}${rangeUnit})`
  );
}

function improvementWord(spec: MetricSpec, improved: boolean): string {
  if (spec.key === 'pvtMedianMs') return improved ? 'faster' : 'slower';
  if (spec.key === 'pvtLapses') return improved ? 'fewer' : 'more';
  return improved ? 'higher' : 'lower';
}

function round(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Adherence inputs: how many scheduled days were taken and tested. */
export type AdherenceInput = {
  scheduledDays: number;
  takenDays: number;
  testedDays: number;
};

export const ADHERENCE_THRESHOLD = 0.8;

/**
 * Adherence rate = min(taken, tested) / scheduled. A verdict needs both the
 * supplement taken AND a test logged on a day to count, so the binding
 * constraint is whichever is lower. Returns 0 for a zero-day schedule.
 */
export function adherenceRate(a: AdherenceInput): number {
  if (a.scheduledDays <= 0) return 0;
  return Math.min(a.takenDays, a.testedDays) / a.scheduledDays;
}

/** True when adherence meets the >= 80% gate. */
export function meetsAdherence(a: AdherenceInput): boolean {
  return adherenceRate(a) >= ADHERENCE_THRESHOLD;
}

export type VerdictInput = {
  /** The ON-effect point estimate b1. */
  estimate: number;
  /** 90% CI for b1. */
  ci: ConfidenceInterval;
  /** Standardized effect size (b1 / residual SD). */
  effectSize: number;
  /** Which direction is improvement for this metric. */
  direction: BetterDirection;
};

/**
 * Width threshold: a CI that spans more than this many effect-size units
 * (relative to the residual scale) is "wide" -> not enough data. 0.6 is twice
 * the 0.3 meaningful-effect bar, so an interval wider than a meaningful effect
 * in each direction is judged uninformative.
 */
export const WIDE_CI_EFFECT_WIDTH = 0.6;

/** The meaningful standardized-effect threshold from the spec. */
export const MEANINGFUL_EFFECT_SIZE = 0.3;

/**
 * Verdict rule for the primary metric, exactly per spec:
 *  - CI excludes zero AND |effect size| >= 0.3 in the improving direction
 *      -> measurable_improvement
 *  - CI excludes zero in the WORSE direction -> measured_worse
 *  - CI includes zero but is narrow -> no_meaningful_effect
 *  - CI wide -> not_enough_data
 *
 * `residualSd` scales the wide-CI test into effect-size units. Pass it so the
 * width test is comparable across metrics.
 */
export function classifyVerdict(input: VerdictInput, residualSd: number): VerdictState {
  const { estimate, ci, effectSize: es, direction } = input;
  const excludesZero = ci.low > 0 || ci.high < 0;
  const improved = isImprovement(direction, estimate);

  if (excludesZero) {
    if (improved) {
      // A clear, large-enough move in the good direction.
      if (Math.abs(es) >= MEANINGFUL_EFFECT_SIZE) return 'measurable_improvement';
      // Statistically non-zero but too small to matter.
      return 'no_meaningful_effect';
    }
    // Clear move in the bad direction.
    return 'measured_worse';
  }

  // CI includes zero: decide narrow (no effect) vs wide (not enough data).
  const widthEs = residualSd > 0 ? (ci.high - ci.low) / residualSd : Infinity;
  if (widthEs > WIDE_CI_EFFECT_WIDTH) return 'not_enough_data';
  return 'no_meaningful_effect';
}
