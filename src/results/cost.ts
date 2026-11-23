/**
 * Monthly cost line for the verdict.
 *
 * The data model does not store a price, so the per-dose cost is supplied by
 * the caller (from experiment setup) in whole cents to avoid floating-point
 * money error. This helper turns a per-dose cost into the "$X/month" line the
 * verdict shows, assuming one dose per ON day at the run's observed ON-day
 * cadence. When no price is known it returns null and the verdict omits the
 * line rather than inventing a number.
 */

/** 30.4 days ≈ one calendar month, averaged over a year. */
const DAYS_PER_MONTH = 30.4;

export type MonthlyCostInput = {
  /** Cost of one dose, in whole cents. */
  centsPerDose: number;
  /** ON (supplement) days in the run. */
  onDays: number;
  /** Total run length in days. */
  lengthDays: number;
};

/**
 * Monthly cost in whole cents, projecting the run's ON-day dosing cadence onto
 * a 30.4-day month: (centsPerDose * onDays / lengthDays) * DAYS_PER_MONTH.
 * Returns null when inputs are missing or non-positive.
 */
export function monthlyCostCents(input: MonthlyCostInput | null | undefined): number | null {
  if (!input) return null;
  const { centsPerDose, onDays, lengthDays } = input;
  if (centsPerDose <= 0 || onDays <= 0 || lengthDays <= 0) return null;
  const perDay = (centsPerDose * onDays) / lengthDays;
  return Math.round(perDay * DAYS_PER_MONTH);
}

/** Format whole cents as a US dollar string, e.g. 1299 -> "$12.99", 1200 -> "$12". */
export function formatDollars(cents: number): string {
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}

/** The "$X/month" line, or null when no price is known. */
export function monthlyCostLine(input: MonthlyCostInput | null | undefined): string | null {
  const cents = monthlyCostCents(input);
  if (cents === null) return null;
  return `${formatDollars(cents)}/month`;
}
