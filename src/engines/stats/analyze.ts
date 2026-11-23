/**
 * Top-level analysis: take one metric's daily series plus the ON indicator,
 * day index, sleep, and caffeine covariates, fit the linear model, and return
 * the estimate, 90% HAC CI, standardized effect size, block-mean difference,
 * plain-language sentence, and verdict. This is the single function the result
 * layer calls per metric.
 *
 * The design matrix columns are [const, ON, t, sleep, caffeine], matching the
 * model y_t = b0 + b1*ON_t + b2*t + b3*sleep_t + b4*caffeine_t + e_t.
 */

import {
  confidenceInterval90,
  type ConfidenceInterval,
  defaultLag,
  hacCovariance,
} from './hac';
import { METRICS, type MetricKey } from './metrics';
import { fitOls, residualSd } from './ols';
import {
  type AdherenceInput,
  blockMeanDifference,
  classifyVerdict,
  effectSize,
  formatEffect,
  meetsAdherence,
  type VerdictState,
  VERDICT_SENTENCE,
} from './verdict';
import type { Verdict as DbVerdict } from '@/db/types';

/** One day of inputs for the model. `y` is the metric value that day. */
export type DayObservation = {
  y: number;
  on: 0 | 1;
  t: number;
  sleep: number;
  caffeine: 0 | 1;
};

export type AnalyzeOptions = {
  /** Newey-West lag; defaults to floor(4*(n/100)^(2/9)). */
  lag?: number;
  /** Adherence counts; when supplied and below 80% the verdict is gated. */
  adherence?: AdherenceInput;
};

export type MetricAnalysis = {
  metric: MetricKey;
  /** b1, the raw ON effect in the metric's own units. */
  estimate: number;
  /** All five fitted coefficients [b0, b1, b2, b3, b4]. */
  coefficients: number[];
  ci: ConfidenceInterval;
  /** HAC standard error of b1. */
  standardError: number;
  /** b1 / residual SD. */
  effectSize: number;
  residualSd: number;
  /** mean(ON) - mean(OFF) for block/cumulative designs. */
  blockMeanDiff: number;
  /** Lag actually used by the HAC estimator. */
  lag: number;
  /** Internal verdict state. */
  verdictState: VerdictState;
  /** Plain-language verdict sentence. */
  verdictSentence: string;
  /** Plain-unit effect sentence, e.g. "reaction time 18 ms faster (range 4-32 ms)". */
  effectSentence: string;
  /** Whether adherence passed the gate (true when no adherence data supplied). */
  adherenceMet: boolean;
};

/** Map the engine verdict state onto the foundation's stored `Verdict` enum. */
export function toDbVerdict(state: VerdictState): DbVerdict {
  switch (state) {
    case 'measurable_improvement':
      return 'works';
    case 'no_meaningful_effect':
      return 'no_effect';
    case 'measured_worse':
      return 'harmful';
    case 'not_enough_data':
    default:
      return 'inconclusive';
  }
}

/**
 * Fit and classify one metric. Throws (via fitOls) on too-few days or collinear
 * columns; the caller decides how to surface those. When `adherence` is given
 * and below 80%, the verdict is forced to 'not_enough_data' regardless of the
 * fit, per the adherence gate.
 */
export function analyzeMetric(
  metric: MetricKey,
  days: DayObservation[],
  options: AnalyzeOptions = {},
): MetricAnalysis {
  const spec = METRICS[metric];
  const y = days.map((d) => d.y);
  const on = days.map((d) => d.on);
  const x = days.map((d) => [1, d.on, d.t, d.sleep, d.caffeine]);

  const fit = fitOls(x, y);
  const b1 = fit.coefficients[1]!;
  const lag = options.lag ?? defaultLag(fit.n);
  const hac = hacCovariance(x, fit, lag);
  const se = hac.standardErrors[1]!;
  const ci = confidenceInterval90(b1, se);
  const resid = residualSd(fit);
  const es = effectSize(b1, resid);
  const blockMeanDiff = blockMeanDifference(y, on);

  let verdictState = classifyVerdict(
    { estimate: b1, ci, effectSize: es, direction: spec.betterDirection },
    resid,
  );

  // Adherence gate: below 80% no verdict is allowed; fall back to not-enough-data.
  const adherenceMet = options.adherence ? meetsAdherence(options.adherence) : true;
  if (!adherenceMet) {
    verdictState = 'not_enough_data';
  }

  return {
    metric,
    estimate: b1,
    coefficients: fit.coefficients,
    ci,
    standardError: se,
    effectSize: es,
    residualSd: resid,
    blockMeanDiff,
    lag: hac.lag,
    verdictState,
    verdictSentence: VERDICT_SENTENCE[verdictState],
    effectSentence: formatEffect(spec, b1, ci),
    adherenceMet,
  };
}
