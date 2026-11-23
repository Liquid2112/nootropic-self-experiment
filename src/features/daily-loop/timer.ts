/**
 * High-resolution timing for the PVT.
 *
 * Reaction time must be measured from the exact moment the stimulus is painted
 * to the exact moment the tap lands, using a monotonic high-resolution clock —
 * NOT React state-update latency, which batches and lags by tens of ms. The
 * PVT reads `now()` at stimulus onset and again at the tap; the difference is
 * the recorded RT.
 *
 * `performance.now()` is the high-resolution monotonic source on React Native
 * (Hermes) and in the browser. When it is unavailable (an older runtime or a
 * headless test environment without it) we fall back to Date.now(), which is
 * still monotonic enough for a coarse fallback and keeps unit tests running.
 */

/** A monotonic high-resolution timestamp in milliseconds (may be fractional). */
export function now(): number {
  const perf = getPerformance();
  if (perf && typeof perf.now === 'function') {
    return perf.now();
  }
  return Date.now();
}

/** True when a real high-resolution clock is available (not the Date fallback). */
export function hasHighResTimer(): boolean {
  const perf = getPerformance();
  return !!perf && typeof perf.now === 'function';
}

/**
 * Reaction time between a stimulus-onset timestamp and a tap timestamp, both
 * from `now()`. Negative inputs (tap before onset) are impossible from a real
 * clock; the caller is expected to pass onset <= tap.
 */
export function reactionTime(onset: number, tap: number): number {
  return tap - onset;
}

type PerformanceLike = { now: () => number };

function getPerformance(): PerformanceLike | undefined {
  const candidate = (globalThis as { performance?: unknown }).performance;
  if (candidate && typeof (candidate as PerformanceLike).now === 'function') {
    return candidate as PerformanceLike;
  }
  return undefined;
}
