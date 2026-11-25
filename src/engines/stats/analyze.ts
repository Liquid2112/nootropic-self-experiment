/**
 * Top-level analysis: take one metric's daily series plus the ON indicator,
 * day index, sleep, and caffeine covariates, fit the linear model, and return
 * the estimate, 90% HAC CI, standardized effect size, block-mean difference,
 * plain-language sentence, and verdict. This is the single function the result
 * layer calls per metric.
 *
 * The design matrix starts as [const, ON, t, sleep, caffeine], matching the
 * model y_t = b0 + b1*ON_t + b2*t + b3*sleep_t + b4*caffeine_t + e_t. Covariate
 * columns (t, sleep, caffeine) that are constant or collinear with a kept
 * column are dropped before fitting so a real run (caffeine always "yes",
 * sleep never logged, or a caffeine covariate that tracks the ON days) degrades
 * to the regressors that do vary instead of throwing. const and ON are always
 * kept; if ON itself is degenerate the fit still throws, since there is no
 * honest ON effect to report then.
 */

import {
  confidenceInterval90,
  confidenceInterval90T,
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
  CUMULATIVE_POWER_NOTE,
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

/** Which study design produced the series; drives the false-positive control. */
export type DesignKind = 'acute' | 'cumulative';

export type AnalyzeOptions = {
  /** Newey-West lag; defaults to floor(4*(n/100)^(2/9)). */
  lag?: number;
  /** Adherence counts; when supplied and below 80% the verdict is gated. */
  adherence?: AdherenceInput;
  /**
   * Study design. 'acute' (the default) analyzes the daily series with a
   * finite-sample t correction on the verdict interval. 'cumulative' analyzes
   * the block means (one observation per ON/OFF block) so serial correlation
   * within a block cannot masquerade as an effect.
   */
  design?: DesignKind;
};

export type MetricAnalysis = {
  metric: MetricKey;
  /** b1, the raw ON effect in the metric's own units. */
  estimate: number;
  /** All fitted coefficients for the columns actually used. */
  coefficients: number[];
  /** Reported 90% HAC CI (normal-quantile, matches the stats reference). */
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
  /** Covariate columns dropped before fitting (constant or collinear). */
  droppedCovariates: CovariateName[];
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

/** The optional covariate columns, in design-matrix order after [const, ON]. */
export type CovariateName = 't' | 'sleep' | 'caffeine';
const COVARIATES: readonly CovariateName[] = ['t', 'sleep', 'caffeine'];

/** True when a column has (near-)zero variance: every entry equals the first. */
function isConstantColumn(col: number[]): boolean {
  if (col.length === 0) return true;
  const first = col[0]!;
  const scale = Math.max(1, Math.abs(first));
  return col.every((v) => Math.abs(v - first) <= 1e-9 * scale);
}

/**
 * Is `candidate` an (near-)exact linear combination of the already-kept
 * columns? Tests collinearity by regressing the candidate on the kept columns
 * and checking the residual is negligible relative to the candidate's own
 * spread. Keeps the guard local and dependency-free; the kept set is tiny
 * (<= 4 columns) so the extra fit is cheap.
 */
function isCollinearWith(candidate: number[], kept: number[][]): boolean {
  if (kept.length === 0) return false;
  const design = candidate.map((_, i) => kept.map((c) => c[i]!));
  let fit;
  try {
    fit = fitOls(design, candidate);
  } catch {
    // Can't even fit the kept columns onto the candidate -> treat as collinear
    // so we don't then feed a rank-deficient design into the main fit.
    return true;
  }
  let ssr = 0;
  let sst = 0;
  const mean = candidate.reduce((s, v) => s + v, 0) / candidate.length;
  for (let i = 0; i < candidate.length; i++) {
    ssr += fit.residuals[i]! * fit.residuals[i]!;
    sst += (candidate[i]! - mean) * (candidate[i]! - mean);
  }
  if (sst <= 1e-12) return true; // constant candidate is trivially collinear with const
  return ssr / sst < 1e-8; // R^2 ~ 1 -> collinear
}

/**
 * Build the design matrix keeping [const, ON] plus each covariate that varies
 * and is not collinear with the columns already kept. Returns the columns, the
 * column labels, and which covariates were dropped.
 */
function buildDesign(days: DayObservation[]): {
  x: number[][];
  dropped: CovariateName[];
} {
  const constCol = days.map(() => 1);
  const onCol = days.map((d) => d.on as number);
  const keptCols: number[][] = [constCol, onCol];
  const dropped: CovariateName[] = [];

  const colFor = (name: CovariateName): number[] =>
    days.map((d) => (name === 't' ? d.t : name === 'sleep' ? d.sleep : d.caffeine));

  for (const name of COVARIATES) {
    const col = colFor(name);
    if (isConstantColumn(col) || isCollinearWith(col, keptCols)) {
      dropped.push(name);
      continue;
    }
    keptCols.push(col);
  }

  // Row-major: one row per day across the kept columns.
  const x = days.map((_, i) => keptCols.map((c) => c[i]!));
  return { x, dropped };
}

/**
 * Collapse the daily series into one mean per contiguous same-arm block, with
 * the block's arm as its ON indicator. A cumulative run is a block design
 * (e.g. ON-7, OFF-7, ON-7, OFF-7), so the independent units are the blocks, not
 * the autocorrelated days inside them.
 */
export function blockMeans(days: DayObservation[]): { y: number; on: 0 | 1 }[] {
  const blocks: { y: number; on: 0 | 1 }[] = [];
  let sum = 0;
  let count = 0;
  let arm: 0 | 1 | null = null;
  const flush = () => {
    if (count > 0 && arm !== null) blocks.push({ y: sum / count, on: arm });
  };
  for (const d of days) {
    if (arm === null || d.on === arm) {
      arm = d.on;
      sum += d.y;
      count += 1;
    } else {
      flush();
      arm = d.on;
      sum = d.y;
      count = 1;
    }
  }
  flush();
  return blocks;
}

/**
 * Fit and classify one metric. Throws (via fitOls) on too-few days or a
 * degenerate ON column; the caller decides how to surface those. When
 * `adherence` is given and below 80%, the verdict is forced to
 * 'not_enough_data' regardless of the fit, per the adherence gate.
 */
export function analyzeMetric(
  metric: MetricKey,
  days: DayObservation[],
  options: AnalyzeOptions = {},
): MetricAnalysis {
  const spec = METRICS[metric];
  const design = options.design ?? 'acute';

  if (design === 'cumulative') {
    return analyzeCumulative(metric, days, options);
  }

  const y = days.map((d) => d.y);
  const on = days.map((d) => d.on);
  const { x, dropped } = buildDesign(days);

  const fit = fitOls(x, y);
  const b1 = fit.coefficients[1]!;
  const lag = options.lag ?? defaultLag(fit.n);
  const hac = hacCovariance(x, fit, lag);
  const se = hac.standardErrors[1]!;
  const ci = confidenceInterval90(b1, se);
  // The verdict decision uses a finite-sample t critical value with (n-k) dof
  // and an n/(n-k) scale correction. At the ~20-30 day samples these runs
  // produce, the plain normal interval under-covers and a do-nothing
  // supplement reads as a "measurable improvement" far more than the nominal
  // 5%; widening the decision interval pulls that rate back toward 5%.
  const verdictCi = confidenceInterval90T(b1, se, fit.n, fit.k);
  const resid = residualSd(fit);
  const es = effectSize(b1, resid);
  const blockMeanDiff = safeBlockMeanDiff(y, on);

  let verdictState = classifyVerdict(
    { estimate: b1, ci: verdictCi, effectSize: es, direction: spec.betterDirection },
    resid,
  );

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
    droppedCovariates: dropped,
  };
}

/**
 * Cumulative analysis: fit the ON effect on the BLOCK MEANS, not the daily
 * series. With only ~4 blocks this has low power, so the classification uses a
 * t critical value on (nBlocks - 2) degrees of freedom and the verdict sentence
 * carries a note that a cumulative run can miss small effects.
 */
function analyzeCumulative(
  metric: MetricKey,
  days: DayObservation[],
  options: AnalyzeOptions,
): MetricAnalysis {
  const spec = METRICS[metric];
  const blocks = blockMeans(days);
  const yB = blocks.map((b) => b.y);
  const onB = blocks.map((b) => b.on);

  // Two columns only: [const, ON]. Covariates don't survive block averaging.
  const x = blocks.map((b) => [1, b.on as number]);
  const fit = fitOls(x, yB);
  const b1 = fit.coefficients[1]!;
  const se = fit.n > fit.k ? blockSlopeSe(yB, onB, fit, b1) : 0;
  const ci = confidenceInterval90(b1, se);
  const verdictCi = confidenceInterval90T(b1, se, fit.n, fit.k);
  const resid = residualSd(fit);
  const es = effectSize(b1, resid);
  const blockMeanDiff = safeBlockMeanDiff(yB, onB);

  let verdictState = classifyVerdict(
    { estimate: b1, ci: verdictCi, effectSize: es, direction: spec.betterDirection },
    resid,
  );

  const adherenceMet = options.adherence ? meetsAdherence(options.adherence) : true;
  if (!adherenceMet) {
    verdictState = 'not_enough_data';
  }

  // Surface the low-power cost of a block design on any non-null verdict.
  const sentence =
    verdictState === 'not_enough_data'
      ? VERDICT_SENTENCE[verdictState]
      : `${VERDICT_SENTENCE[verdictState]} ${CUMULATIVE_POWER_NOTE}`;

  return {
    metric,
    estimate: b1,
    coefficients: fit.coefficients,
    ci,
    standardError: se,
    effectSize: es,
    residualSd: resid,
    blockMeanDiff,
    lag: 0,
    verdictState,
    verdictSentence: sentence,
    effectSentence: formatEffect(spec, b1, ci),
    adherenceMet,
    droppedCovariates: ['t', 'sleep', 'caffeine'],
  };
}

/** Ordinary (non-HAC) SE of the ON slope on the block means. */
function blockSlopeSe(y: number[], on: number[], fit: { residuals: number[] }, _b1: number): number {
  const n = y.length;
  const k = 2;
  if (n <= k) return 0;
  let ssr = 0;
  for (const r of fit.residuals) ssr += r * r;
  const sigma2 = ssr / (n - k);
  const meanOn = on.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  for (const v of on) sxx += (v - meanOn) * (v - meanOn);
  if (sxx <= 1e-12) return 0;
  return Math.sqrt(sigma2 / sxx);
}

/** Block-mean difference that yields 0 rather than throwing on a one-arm run. */
function safeBlockMeanDiff(y: number[], on: number[]): number {
  try {
    return blockMeanDifference(y, on);
  } catch {
    return 0;
  }
}
