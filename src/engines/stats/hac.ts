/**
 * Newey-West heteroskedasticity- and autocorrelation-consistent (HAC) standard
 * errors. Daily self-experiment data is serially correlated (yesterday's state
 * carries into today), so plain OLS SEs understate uncertainty; the HAC
 * sandwich widens them using a Bartlett-weighted sum of lagged score
 * cross-products.
 *
 * This matches statsmodels' OLS.fit(cov_type='HAC',
 * cov_kwds={'maxlags': L, 'use_correction': False}): the plain Newey-West
 * estimator with Bartlett weights w_l = 1 - l/(L+1) and no small-sample
 * correction. The covariance is
 *     cov = (X'X)^-1 * S * (X'X)^-1,
 * where the "meat" S is the RAW (un-averaged) weighted sum of score
 * cross-products. See gen_reference.py for the reference this is validated
 * against.
 */

import type { OlsFit } from './ols';

/** Default Newey-West lag: floor(4 * (n/100)^(2/9)), the common rule of thumb. */
export function defaultLag(n: number): number {
  return Math.floor(4 * Math.pow(n / 100, 2 / 9));
}

export type HacResult = {
  /** Full k x k robust covariance matrix of the coefficients. */
  cov: number[][];
  /** Robust standard errors (sqrt of the covariance diagonal). */
  standardErrors: number[];
  /** The lag actually used. */
  lag: number;
};

/**
 * Compute the Newey-West HAC covariance for a fitted OLS model. `x` is the same
 * n x k design passed to fitOls (row-major). `lag` defaults to defaultLag(n)
 * and is clamped to [0, n-1].
 */
export function hacCovariance(
  x: number[][],
  fit: OlsFit,
  lag: number = defaultLag(fit.n),
): HacResult {
  const n = fit.n;
  const k = fit.k;
  const L = Math.max(0, Math.min(lag, n - 1));
  const u = fit.residuals;

  // Score contributions g_t = x_t * u_t (k-vector per observation).
  const g: number[][] = new Array(n);
  for (let t = 0; t < n; t++) {
    const xt = x[t]!;
    const ut = u[t]!;
    const row = new Array<number>(k);
    for (let j = 0; j < k; j++) row[j] = xt[j]! * ut;
    g[t] = row;
  }

  // Gamma_0 = sum_t g_t g_t'.
  const S: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const addOuter = (a: number[], b: number[], weight: number) => {
    for (let i = 0; i < k; i++) {
      const ai = a[i]!;
      const Srow = S[i]!;
      for (let j = 0; j < k; j++) {
        Srow[j]! += weight * ai * b[j]!;
      }
    }
  };
  for (let t = 0; t < n; t++) addOuter(g[t]!, g[t]!, 1);

  // Bartlett-weighted lagged terms: for each lag l, add w_l * (Gamma_l + Gamma_l').
  for (let l = 1; l <= L; l++) {
    const w = 1 - l / (L + 1);
    for (let t = l; t < n; t++) {
      // Gamma_l = sum g_t g_{t-l}'; add Gamma_l and its transpose.
      addOuter(g[t]!, g[t - l]!, w);
      addOuter(g[t - l]!, g[t]!, w);
    }
  }

  // Sandwich: cov = (X'X)^-1 S (X'X)^-1. xtxInv is symmetric.
  const inv = fit.xtxInv;
  // M = inv * S  (k x k)
  const M: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += inv[i]![p]! * S[p]![j]!;
      M[i]![j] = s;
    }
  }
  // cov = M * inv
  const cov: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += M[i]![p]! * inv[p]![j]!;
      cov[i]![j] = s;
    }
  }

  const standardErrors = cov.map((row, i) => Math.sqrt(Math.max(0, row[i]!)));
  return { cov, standardErrors, lag: L };
}

/** Standard-normal 0.95 quantile, used for a two-sided 90% confidence interval. */
export const Z_90 = 1.6448536269514722;

export type ConfidenceInterval = { low: number; high: number };

/** Two-sided 90% CI for a coefficient given its point estimate and HAC SE. */
export function confidenceInterval90(estimate: number, se: number): ConfidenceInterval {
  return { low: estimate - Z_90 * se, high: estimate + Z_90 * se };
}
