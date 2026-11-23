/**
 * Check-in window — pure logic.
 *
 * Each experiment has a time-of-day window in which the daily test should be
 * taken, so repeated measurements are comparable (circadian effects are large
 * relative to the effect being measured). A test taken outside that window is
 * still recorded but flagged, so the analysis can down-weight or exclude it.
 *
 * The window is an explicit [startHour, endHour) range in the device's local
 * time. It is passed in rather than read from the Experiment row because the
 * schema does not store it yet; a later migration can persist it and feed it
 * here without changing this logic.
 */

export type CheckInWindow = {
  /** Inclusive start hour, 0..23, local time. */
  startHour: number;
  /** Exclusive end hour, 1..24, local time. endHour > startHour. */
  endHour: number;
};

/** A reasonable default morning window when the experiment has not set one. */
export const DEFAULT_CHECK_IN_WINDOW: CheckInWindow = { startHour: 6, endHour: 11 };

function assertWindow(window: CheckInWindow): void {
  const { startHour, endHour } = window;
  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < 0 ||
    startHour > 23 ||
    endHour < 1 ||
    endHour > 24 ||
    endHour <= startHour
  ) {
    throw new Error(
      `CheckInWindow is invalid: startHour=${startHour} endHour=${endHour} (need 0<=start<end<=24)`,
    );
  }
}

/**
 * Whether the given local hour falls inside the window [startHour, endHour).
 * Hour is 0..23 (the device's local hour at test start).
 */
export function isWithinWindow(localHour: number, window: CheckInWindow): boolean {
  assertWindow(window);
  return localHour >= window.startHour && localHour < window.endHour;
}

/**
 * Flag a test as off-window by comparing its start time to the window. The
 * caller supplies the local hour the test started (derived from the device
 * clock) so this stays pure and timezone-free.
 *
 * Returns true when the test is OUTSIDE the window (i.e. should be flagged).
 */
export function isOffWindow(startLocalHour: number, window: CheckInWindow): boolean {
  return !isWithinWindow(startLocalHour, window);
}

/**
 * Extract the local hour (0..23) from a Date. Isolated here so screens pass a
 * Date and tests pass a fixed one.
 */
export function localHourOf(date: Date): number {
  return date.getHours();
}
