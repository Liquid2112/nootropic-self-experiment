/**
 * Pre-test context capture — pure logic.
 *
 * Before each daily test the user answers quick questions that confound
 * cognitive scores if ignored: how many hours they slept, whether they have had
 * caffeine, how sharp they expect to be today (the belief check: runs are
 * open-label, so expectation is measured instead of blinded away), and whether
 * they are on a phone or a tablet. Form factor is relevant
 * because screen size and touch latency differ. This module defines the captured
 * shape, the sleep picker options, and validation; the persistence mapping
 * (context -> TestSession columns) lives in session.ts.
 */

export type FormFactor = 'phone' | 'tablet';

/** Quick-pick sleep buckets, in hours. The picker offers these, not free text. */
export const SLEEP_HOUR_OPTIONS = [4, 5, 6, 7, 8, 9, 10] as const;

export type DailyContext = {
  /** Hours slept, from the quick picker. null when the user skipped it. */
  sleepHours: number | null;
  /** Whether the user has had caffeine today. */
  caffeine: boolean;
  /** Phone or tablet, chosen by the user (device model is captured separately). */
  formFactor: FormFactor;
  /** Expected sharpness today, 1 (foggy) to 5 (sharp). null when skipped. */
  expectation?: number | null;
};

/** The belief-check scale: 1 (foggy) to 5 (sharp). */
export const EXPECTATION_OPTIONS = [1, 2, 3, 4, 5] as const;

/** A fresh context with sensible defaults for the pre-test questions. */
export function emptyContext(): DailyContext {
  return { sleepHours: null, caffeine: false, formFactor: 'phone', expectation: null };
}

export type ContextValidation = {
  valid: boolean;
  /** Machine-readable reasons a field is not yet acceptable. */
  issues: string[];
};

/**
 * Validate the captured context before a test may start. Sleep hours, when
 * provided, must be a plausible non-negative number within the picker range;
 * caffeine and form factor always have a value. Sleep may be left null (the
 * user declined to answer) and the test still proceeds — the column is
 * nullable — so a null sleep is valid, only an out-of-range number is not.
 */
export function validateContext(context: DailyContext): ContextValidation {
  const issues: string[] = [];
  if (context.sleepHours !== null) {
    if (!Number.isFinite(context.sleepHours) || context.sleepHours < 0) {
      issues.push('sleep_hours_invalid');
    } else if (context.sleepHours > 24) {
      issues.push('sleep_hours_out_of_range');
    }
  }
  if (
    context.expectation != null &&
    !(EXPECTATION_OPTIONS as readonly number[]).includes(context.expectation)
  ) {
    issues.push('expectation_invalid');
  }
  if (context.formFactor !== 'phone' && context.formFactor !== 'tablet') {
    issues.push('form_factor_invalid');
  }
  return { valid: issues.length === 0, issues };
}
