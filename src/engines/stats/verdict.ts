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
 * Appended to a cumulative run's verdict sentence. A block design has only a
 * handful of independent units (the ON/OFF blocks), so it can declare a clear
 * effect but has limited power to detect a small one — the user should know a
 * "no meaningful effect" from a cumulative run is weaker evidence than from a
 * day-by-day acute run.
 */
export const CUMULATIVE_POWER_NOTE =
  'A cumulative run compares a few multi-day blocks, so it can miss small effects.';

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
 * Plain-unit sentence, e.g. "reaction time 18 ms faster (range 4 to 32 ms faster)".
 * Reports the point estimate's magnitude in the metric's own units and the
 * improvement direction as a word, then the 90% CI as a signed range so an
 * interval that straddles zero reads honestly — e.g. "30 ms faster to 10 ms
 * slower" — instead of being collapsed to a one-sided "faster". The range words
 * follow the same per-metric vocabulary as the point estimate.
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
  const range = formatSignedRange(spec, ci);
  return `${spec.label} ${round(mag)}${unit} ${verb} (range ${range})`;
}

/**
 * Format a CI as a signed range in the metric's own direction words. When both
 * bounds point the same way the direction word is printed once with the
 * magnitudes ascending ("4 to 32 ms faster"); when the interval straddles zero
 * each side keeps its own word, improvement side first ("30 ms faster to 10 ms
 * slower"), so a crossing interval never reads as a one-sided win.
 */
function formatSignedRange(spec: MetricSpec, ci: ConfidenceInterval): string {
  const lo = Math.min(ci.low, ci.high);
  const hi = Math.max(ci.low, ci.high);
  const unit = spec.unit ? ` ${spec.unit}` : '';
  const loImproved = isImprovement(spec.betterDirection, lo);
  const hiImproved = isImprovement(spec.betterDirection, hi);

  if (loImproved === hiImproved) {
    // Same direction: one word, magnitudes ascending.
    const word = improvementWord(spec, loImproved);
    const a = Math.min(Math.abs(lo), Math.abs(hi));
    const b = Math.max(Math.abs(lo), Math.abs(hi));
    return `${round(a)} to ${round(b)}${unit} ${word}`;
  }

  // Straddles zero: name the improvement end first, then the regression end.
  const improvingBound = spec.betterDirection === 'lower' ? lo : hi;
  const regressingBound = spec.betterDirection === 'lower' ? hi : lo;
  const improvingWord = improvementWord(spec, true);
  const regressingWord = improvementWord(spec, false);
  return (
    `${round(Math.abs(improvingBound))}${unit} ${improvingWord} to ` +
    `${round(Math.abs(regressingBound))}${unit} ${regressingWord}`
  );
}

function improvementWord(spec: MetricSpec, improved: boolean): string {
  if (spec.key === 'pvtMedianMs') return improved ? 'faster' : 'slower';
  if (spec.key === 'pvtLapses') return improved ? 'fewer' : 'more';
  if (spec.key === 'healthSleepHours') return improved ? 'longer' : 'shorter';
  if (spec.key === 'stroopInterferenceMs') return improved ? 'smaller' : 'larger';
  if (spec.key === 'symbolPerMin') return improved ? 'faster' : 'slower';
  if (spec.key === 'recallScore') return improved ? 'more' : 'fewer';
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
 * (relative to the residual scale) is "wide" -> not enough data.
 *
 * Recalibrated for realistic run lengths. The original 0.6 (twice the 0.3
 * meaningful bar) was unreachable: at 28 days a true-null 90% HAC interval is
 * ~1.2 SD wide, so a do-nothing supplement almost always failed the width test
 * and was told to "extend 2 weeks" (about 82% of simulated null runs) instead
 * of the honest "no meaningful effect" (about 0.2%). Reaching <0.6 SD would
 * need ~120 days. 1.4 SD sits just above the typical true-null width at 21-28
 * days, so a genuine null that has run its course lands on "no meaningful
 * effect" while a truly under-powered run (a far wider interval) still reads as
 * not-enough-data. See the simulation harness for the before/after rates.
 */
export const WIDE_CI_EFFECT_WIDTH = 1.4;

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
