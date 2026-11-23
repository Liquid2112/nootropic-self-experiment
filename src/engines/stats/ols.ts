/**
 * Ordinary least squares via the normal equations (X'X) b = X'y, solved with
 * the small Gaussian-elimination routine in matrix.ts. Returns the coefficient
 * vector plus residuals and fitted values, which the HAC estimator and the
 * effect-size helper consume.
 */

import { invert, matMul, matVec, SingularMatrixError, transpose } from './matrix';

export type OlsFit = {
  /** Estimated coefficients, one per design column (same order as X's columns). */
  coefficients: number[];
  /** Fitted values X b, one per observation. */
  fitted: number[];
  /** Residuals y - fitted, one per observation. */
  residuals: number[];
  /** (X'X)^-1, reused by the HAC covariance estimator. */
  xtxInv: number[][];
  /** Number of observations. */
  n: number;
  /** Number of parameters (design columns). */
  k: number;
};

export class OlsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OlsError';
  }
}

/**
 * Fit y = X b. `x` is n rows by k columns (caller includes the intercept column
 * explicitly). Throws OlsError when the system is under-determined (n < k) or
 * the design has collinear columns (singular X'X).
 */
export function fitOls(x: number[][], y: number[]): OlsFit {
  const n = x.length;
  if (n === 0) throw new OlsError('No observations');
  const k = x[0]!.length;
  if (y.length !== n) throw new OlsError('x and y length mismatch');
  for (const row of x) {
    if (row.length !== k) throw new OlsError('Ragged design matrix');
  }
  if (n < k) {
    throw new OlsError(`Too few observations: n=${n} < k=${k}`);
  }

  const xt = transpose(x); // k x n
  const xtx = matMul(xt, x); // k x k
  const xty = matVec(xt, y); // k

  let xtxInv: number[][];
  let coefficients: number[];
  try {
    xtxInv = invert(xtx);
    coefficients = matVec(xtxInv, xty);
  } catch (err) {
    if (err instanceof SingularMatrixError) {
      throw new OlsError(
        'Design matrix is collinear or rank-deficient (singular X\'X)',
      );
    }
    throw err;
  }

  const fitted = matVec(x, coefficients);
  const residuals = y.map((yi, i) => yi - fitted[i]!);

  return { coefficients, fitted, residuals, xtxInv, n, k };
}

/**
 * Residual standard deviation using the OLS convention sqrt(SSR / (n - k)).
 * This is the scale the standardized effect size divides by.
 */
export function residualSd(fit: OlsFit): number {
  const dof = fit.n - fit.k;
  if (dof <= 0) throw new OlsError('Non-positive residual degrees of freedom');
  let ssr = 0;
  for (const r of fit.residuals) ssr += r * r;
  return Math.sqrt(ssr / dof);
}
