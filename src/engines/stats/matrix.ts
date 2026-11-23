/**
 * Minimal, self-contained linear-algebra used by the OLS fit. Kept small and
 * dependency-free on purpose: the stats engine solves one small normal-equation
 * system per metric, so Gaussian elimination with partial pivoting is both
 * sufficient and easy to test, rather than pulling in a matrix library.
 *
 * A matrix is a row-major number[][]; a vector is number[].
 */

/** Error thrown when a system cannot be solved (singular / collinear columns). */
export class SingularMatrixError extends Error {
  constructor(message = 'Matrix is singular or near-singular') {
    super(message);
    this.name = 'SingularMatrixError';
  }
}

/** Transpose an m x n matrix into n x m. */
export function transpose(a: number[][]): number[][] {
  const m = a.length;
  const n = m === 0 ? 0 : a[0]!.length;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(0));
  for (let i = 0; i < m; i++) {
    const row = a[i]!;
    for (let j = 0; j < n; j++) {
      out[j]![i] = row[j]!;
    }
  }
  return out;
}

/** Matrix product a (m x k) times b (k x n) -> m x n. */
export function matMul(a: number[][], b: number[][]): number[][] {
  const m = a.length;
  const k = m === 0 ? 0 : a[0]!.length;
  const n = b.length === 0 ? 0 : b[0]!.length;
  const out: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i++) {
    const arow = a[i]!;
    const orow = out[i]!;
    for (let p = 0; p < k; p++) {
      const aip = arow[p]!;
      const brow = b[p]!;
      for (let j = 0; j < n; j++) {
        orow[j]! += aip * brow[j]!;
      }
    }
  }
  return out;
}

/** Matrix (m x n) times vector (n) -> vector (m). */
export function matVec(a: number[][], x: number[]): number[] {
  return a.map((row) => {
    let s = 0;
    for (let j = 0; j < row.length; j++) s += row[j]! * x[j]!;
    return s;
  });
}

/**
 * Solve the linear system A x = b for a square A using Gaussian elimination
 * with partial pivoting. Throws SingularMatrixError when the matrix is singular
 * to machine precision (e.g. perfectly collinear design columns).
 */
export function solve(aInput: number[][], bInput: number[]): number[] {
  const n = aInput.length;
  if (n === 0) return [];
  // Work on copies so the caller's matrices are untouched.
  const a = aInput.map((row) => row.slice());
  const b = bInput.slice();

  for (let col = 0; col < n; col++) {
    // Partial pivot: pick the row with the largest magnitude in this column.
    let pivotRow = col;
    let pivotMag = Math.abs(a[col]![col]!);
    for (let r = col + 1; r < n; r++) {
      const mag = Math.abs(a[r]![col]!);
      if (mag > pivotMag) {
        pivotMag = mag;
        pivotRow = r;
      }
    }
    if (pivotMag < 1e-12) {
      throw new SingularMatrixError();
    }
    if (pivotRow !== col) {
      const tmp = a[col]!;
      a[col] = a[pivotRow]!;
      a[pivotRow] = tmp;
      const tb = b[col]!;
      b[col] = b[pivotRow]!;
      b[pivotRow] = tb;
    }
    // Eliminate below the pivot.
    const pivot = a[col]![col]!;
    for (let r = col + 1; r < n; r++) {
      const factor = a[r]![col]! / pivot;
      if (factor === 0) continue;
      const rrow = a[r]!;
      const prow = a[col]!;
      for (let c = col; c < n; c++) {
        rrow[c]! -= factor * prow[c]!;
      }
      b[r]! -= factor * b[col]!;
    }
  }

  // Back-substitution.
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row]!;
    for (let c = row + 1; c < n; c++) {
      sum -= a[row]![c]! * x[c]!;
    }
    x[row] = sum / a[row]![row]!;
  }
  return x;
}

/**
 * Invert a square matrix via Gaussian elimination (solve against identity
 * columns). Used to form (X'X)^-1 for the HAC sandwich. Throws on singular.
 */
export function invert(aInput: number[][]): number[][] {
  const n = aInput.length;
  const cols: number[][] = [];
  for (let j = 0; j < n; j++) {
    const e = new Array<number>(n).fill(0);
    e[j] = 1;
    cols.push(solve(aInput, e));
  }
  // cols[j] is the j-th column of the inverse; assemble row-major.
  const inv: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      inv[i]![j] = cols[j]![i]!;
    }
  }
  return inv;
}
