/**
 * N-back (2-back) with letters — pure logic.
 *
 * A stream of letters is shown one at a time; the user responds ("match") when
 * the current letter is the same as the one shown N positions earlier. This
 * module provides the two UI-free pieces a screen drives: a seedable sequence
 * generator with a controllable target (match) rate, and a scoring function
 * that classifies each response into the signal-detection cells and returns
 * accuracy and d-prime.
 *
 * Signal-detection framing (per trial that is eligible for a response, i.e.
 * index >= N):
 *  - target trial: current letter matches the one N back; a response is a HIT,
 *    no response is a MISS.
 *  - non-target trial: no match; a response is a FALSE ALARM, no response is a
 *    CORRECT REJECTION.
 *
 * d-prime = z(hitRate) - z(falseAlarmRate), using the log-linear correction
 * (Hautus, 1995) so hit/FA rates of exactly 0 or 1 give finite z values:
 *   hitRate = (hits + 0.5) / (targets + 1)
 *   faRate  = (falseAlarms + 0.5) / (nonTargets + 1)
 */
import { createRng, type Rng } from './rng';

/** The N in N-back. The spec task is 2-back. */
export const NBACK_N = 2;
/** Default number of trials (letters) in a run. */
export const NBACK_DEFAULT_TRIALS = 20;
/** Default fraction of eligible trials (index >= N) that are targets. */
export const NBACK_DEFAULT_TARGET_RATE = 0.3;
/**
 * Letter pool. Visually/ phonetically confusable letters are left out so a
 * "match" is unambiguous to the user.
 */
export const NBACK_LETTERS = [
  'B',
  'C',
  'F',
  'H',
  'K',
  'L',
  'N',
  'P',
  'R',
  'T',
  'W',
  'X',
] as const;

export type NbackSequenceOptions = {
  /** How many letters to emit. Defaults to NBACK_DEFAULT_TRIALS. */
  trials?: number;
  /** Seed for a reproducible stream. Required for deterministic test runs. */
  seed: number;
  /** The N in N-back. Defaults to NBACK_N. */
  n?: number;
  /**
   * Target rate over eligible trials (index >= n). Defaults to
   * NBACK_DEFAULT_TARGET_RATE. Clamped to [0, 1].
   */
  targetRate?: number;
  /** Letter pool to draw from. Defaults to NBACK_LETTERS. */
  letters?: readonly string[];
};

export type NbackSequence = {
  /** The letters shown, in order. */
  letters: string[];
  /**
   * isTarget[i] is true when letters[i] matches letters[i - n]. The first n
   * entries are always false (not eligible for a match).
   */
  isTarget: boolean[];
};

/**
 * Per-trial response. A screen records, for each eligible trial, whether the
 * user signalled a match. The non-eligible leading n trials carry no response.
 */
export type NbackResponse = {
  /** True if the user indicated "match" on this trial. */
  responded: boolean;
};

export type NbackScore = {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  /** Eligible trials scored (index >= n). */
  trials: number;
  /** Percent correct over eligible trials, 0..100. null when no eligible trials. */
  accuracy: number | null;
  /** d-prime with log-linear correction. null when no eligible trials. */
  dPrime: number | null;
};

function pickDifferent(rng: Rng, pool: readonly string[], avoid: string): string {
  if (pool.length === 0) {
    throw new Error('nback: letter pool is empty');
  }
  if (pool.length === 1) {
    // Only one letter available: cannot avoid a match. Return it; the caller's
    // target bookkeeping still reflects the real match state via isTarget.
    return pool[0] as string;
  }
  let letter = pool[rng.nextInt(0, pool.length - 1)] as string;
  while (letter === avoid) {
    letter = pool[rng.nextInt(0, pool.length - 1)] as string;
  }
  return letter;
}

/**
 * Generate a reproducible letter stream whose eligible trials (index >= n) hit
 * the requested target rate as closely as integer counts allow. For each
 * eligible position we decide target vs non-target by comparing a draw to the
 * rate, then either repeat the letter n back (target) or pick a different one.
 */
export function generateNbackSequence(
  options: NbackSequenceOptions
): NbackSequence {
  const trials = options.trials ?? NBACK_DEFAULT_TRIALS;
  const n = options.n ?? NBACK_N;
  const targetRate = Math.min(1, Math.max(0, options.targetRate ?? NBACK_DEFAULT_TARGET_RATE));
  const pool = options.letters ?? NBACK_LETTERS;

  if (trials < 0) {
    throw new Error(`generateNbackSequence: trials (${trials}) must be >= 0`);
  }
  if (n < 1) {
    throw new Error(`generateNbackSequence: n (${n}) must be >= 1`);
  }
  if (pool.length === 0) {
    throw new Error('generateNbackSequence: letters pool must be non-empty');
  }

  const rng = createRng(options.seed);
  const letters: string[] = [];
  const isTarget: boolean[] = [];

  for (let i = 0; i < trials; i += 1) {
    if (i < n) {
      // Leading trials cannot be a match: fill with any letter.
      letters.push(pool[rng.nextInt(0, pool.length - 1)] as string);
      isTarget.push(false);
      continue;
    }
    const nBack = letters[i - n] as string;
    const wantTarget = rng.next() < targetRate;
    if (wantTarget) {
      letters.push(nBack);
      isTarget.push(true);
    } else {
      const letter = pickDifferent(rng, pool, nBack);
      letters.push(letter);
      // With a single-letter pool a forced repeat is still a real match.
      isTarget.push(letter === nBack);
    }
  }

  return { letters, isTarget };
}

/**
 * Inverse of the standard normal CDF (probit / z score) via Acklam's rational
 * approximation. Accurate to ~1e-9 over (0, 1); the log-linear correction keeps
 * the arguments strictly inside (0, 1), so the endpoints are never hit.
 */
export function normInv(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error(`normInv: p (${p}) must be in the open interval (0, 1)`);
  }

  // Coefficients for Acklam's algorithm.
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      ((((((c[0] as number) * q + (c[1] as number)) * q + (c[2] as number)) * q +
        (c[3] as number)) *
        q +
        (c[4] as number)) *
        q +
        (c[5] as number)) /
      (((((d[0] as number) * q + (d[1] as number)) * q + (d[2] as number)) * q +
        (d[3] as number)) *
        q +
        1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      (((((((a[0] as number) * r + (a[1] as number)) * r + (a[2] as number)) * r +
        (a[3] as number)) *
        r +
        (a[4] as number)) *
        r +
        (a[5] as number)) *
        q) /
      ((((((b[0] as number) * r + (b[1] as number)) * r + (b[2] as number)) * r +
        (b[3] as number)) *
        r +
        (b[4] as number)) *
        r +
        1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -((((((c[0] as number) * q + (c[1] as number)) * q + (c[2] as number)) * q +
      (c[3] as number)) *
      q +
      (c[4] as number)) *
      q +
      (c[5] as number)) /
    (((((d[0] as number) * q + (d[1] as number)) * q + (d[2] as number)) * q +
      (d[3] as number)) *
      q +
      1)
  );
}

/**
 * Score an N-back run. `responses` is aligned to `sequence.isTarget`: the
 * leading `n` (non-eligible) trials are ignored, and each eligible trial
 * (index >= n) is classified into a signal-detection cell. Returns accuracy
 * (percent correct over eligible trials) and d-prime (log-linear corrected).
 *
 * `n` defaults to NBACK_N (the 2-back of the spec). Pass the same `n` used to
 * generate the sequence when it differs.
 */
export function scoreNback(
  sequence: NbackSequence,
  responses: NbackResponse[],
  n: number = NBACK_N
): NbackScore {
  if (responses.length !== sequence.isTarget.length) {
    throw new Error(
      `scoreNback: responses length (${responses.length}) must match sequence length (${sequence.isTarget.length})`
    );
  }
  if (n < 1) {
    throw new Error(`scoreNback: n (${n}) must be >= 1`);
  }

  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  let correctRejections = 0;

  // Eligible trials start at index n: before that there is no letter n back,
  // so no response is possible and the trial does not enter the score.
  for (let i = n; i < sequence.isTarget.length; i += 1) {
    const isTarget = sequence.isTarget[i] as boolean;
    const responded = (responses[i] as NbackResponse).responded;
    if (isTarget && responded) {
      hits += 1;
    } else if (isTarget && !responded) {
      misses += 1;
    } else if (!isTarget && responded) {
      falseAlarms += 1;
    } else {
      correctRejections += 1;
    }
  }

  const trials = hits + misses + falseAlarms + correctRejections;
  if (trials === 0) {
    return {
      hits,
      misses,
      falseAlarms,
      correctRejections,
      trials: 0,
      accuracy: null,
      dPrime: null,
    };
  }

  const accuracy = ((hits + correctRejections) / trials) * 100;

  const targets = hits + misses;
  const nonTargets = falseAlarms + correctRejections;
  // Log-linear correction (Hautus 1995): add 0.5 to counts, 1 to totals, so the
  // rates stay strictly inside (0, 1) and z is always finite.
  const hitRate = (hits + 0.5) / (targets + 1);
  const faRate = (falseAlarms + 0.5) / (nonTargets + 1);
  const dPrime = normInv(hitRate) - normInv(faRate);

  return {
    hits,
    misses,
    falseAlarms,
    correctRejections,
    trials,
    accuracy,
    dPrime,
  };
}

