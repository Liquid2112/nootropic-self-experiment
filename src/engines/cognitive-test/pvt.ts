/**
 * Psychomotor Vigilance Task (PVT) — pure logic.
 *
 * A stimulus appears after a random inter-stimulus interval (ISI); the user
 * taps as soon as they see it, and the reaction time (RT) is the gap between
 * stimulus onset and tap. This module provides the two UI-free pieces a screen
 * drives: a seedable schedule generator (so a test run is reproducible) and a
 * scoring function over the RTs the screen collects.
 *
 * Standard PVT summary measures implemented here:
 *  - median RT (ms): robust central tendency, insensitive to trial order.
 *  - lapses: the count of trials with RT greater than 500 ms (the classic PVT
 *    lapse threshold).
 */
import { createRng } from './rng';

/** Lowest ISI the schedule generator will emit (ms). */
export const PVT_MIN_ISI_MS = 1000;
/** Highest ISI the schedule generator will emit (ms). */
export const PVT_MAX_ISI_MS = 4000;
/** Default number of trials in a PVT run. */
export const PVT_DEFAULT_TRIALS = 12;
/** RT strictly above this (ms) counts as a lapse. */
export const PVT_LAPSE_THRESHOLD_MS = 500;

export type PvtScheduleOptions = {
  /** How many stimuli to schedule. Defaults to PVT_DEFAULT_TRIALS. */
  trials?: number;
  /** Seed for reproducible ISIs. Required for deterministic test runs. */
  seed: number;
  /** Inclusive ISI bounds in ms. Defaults to [PVT_MIN_ISI_MS, PVT_MAX_ISI_MS]. */
  minIsiMs?: number;
  maxIsiMs?: number;
};

export type PvtScore = {
  /** Median of the scored reaction times, ms. null when no RTs remain. */
  medianMs: number | null;
  /** Count of scored RTs strictly greater than PVT_LAPSE_THRESHOLD_MS. */
  lapses: number;
  /** How many RTs were scored (after any upstream validity filtering). */
  count: number;
};

/**
 * Generate a reproducible list of inter-stimulus intervals (ms), one per trial.
 * Each ISI is a uniform integer in [minIsiMs, maxIsiMs]. A screen waits the
 * i-th ISI before showing the i-th stimulus.
 */
export function generatePvtSchedule(options: PvtScheduleOptions): number[] {
  const trials = options.trials ?? PVT_DEFAULT_TRIALS;
  const minIsiMs = options.minIsiMs ?? PVT_MIN_ISI_MS;
  const maxIsiMs = options.maxIsiMs ?? PVT_MAX_ISI_MS;

  if (trials < 0) {
    throw new Error(`generatePvtSchedule: trials (${trials}) must be >= 0`);
  }
  if (minIsiMs > maxIsiMs) {
    throw new Error(
      `generatePvtSchedule: minIsiMs (${minIsiMs}) must be <= maxIsiMs (${maxIsiMs})`
    );
  }

  const rng = createRng(options.seed);
  const schedule: number[] = [];
  for (let i = 0; i < trials; i += 1) {
    schedule.push(rng.nextInt(minIsiMs, maxIsiMs));
  }
  return schedule;
}

/** Median of a numeric list. Returns null for an empty list. Does not mutate. */
function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    // noUncheckedIndexedAccess: mid is in range for a non-empty list.
    return sorted[mid] as number;
  }
  const lo = sorted[mid - 1] as number;
  const hi = sorted[mid] as number;
  return (lo + hi) / 2;
}

/**
 * Score a PVT run from the reaction times the screen collected. The RTs are
 * taken as-is (apply validity filtering first — see validity.ts), so this is a
 * pure summary: median RT and lapse count. Order of the RTs does not affect the
 * result.
 */
export function scorePvt(reactionTimesMs: number[]): PvtScore {
  const lapses = reactionTimesMs.filter(
    (rt) => rt > PVT_LAPSE_THRESHOLD_MS
  ).length;
  return {
    medianMs: median(reactionTimesMs),
    lapses,
    count: reactionTimesMs.length,
  };
}
