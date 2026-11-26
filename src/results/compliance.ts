/**
 * Shared compliance copy. The app is a self-measurement tool, not a medical or
 * dosing service: every results and evidence surface shows this line, and no
 * surface ever suggests a dose or recommends taking anything.
 */

/** The standing disclaimer shown throughout the results and evidence screens. */
export const COMPLIANCE_DISCLAIMER =
  'Not medical advice. Results apply only to you, under the conditions you tested.';

/**
 * Extra line for open-label runs. Runs are solo: the app randomized the days,
 * but the user knew which were ON, so expectation can play a part. Never call a
 * run "placebo-controlled".
 */
export const UNBLINDED_CAVEAT =
  'You knew which days were ON, so expectation can play a part. The app picked the days at random and judged you on brain tests, which keeps it small.';
