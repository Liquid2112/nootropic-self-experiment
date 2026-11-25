/**
 * Free standalone reaction test: the same psychomotor vigilance task (PVT) the
 * daily check-in uses, run on its own with no experiment, no supplement, and no
 * paywall. It is the free hook: quick to try, easy to share, and a natural lead
 * into running a real experiment.
 *
 * Pure scoring only; the screen lives in app/reaction-test.tsx.
 */
import {
  filterPlausibleReactionTimes,
  scorePvt,
  validateSession,
} from '@/engines/cognitive-test';

export type QuickTestScore =
  | { ok: true; medianMs: number; lapses: number; trials: number }
  | { ok: false; reason: 'abandoned' | 'too_many_false_starts' };

/**
 * Score one run. Taps under 100 ms are false starts and are dropped; a run with
 * too few trials or too many false starts gets no score, so a spammed tap can't
 * post a fake best.
 */
export function scoreQuickTest(reactionTimesMs: number[], plannedTrials: number): QuickTestScore {
  const plausible = filterPlausibleReactionTimes(reactionTimesMs);
  const validity = validateSession({
    plannedTrials,
    completedTrials: reactionTimesMs.length,
    discardedTrials: reactionTimesMs.length - plausible.length,
  });
  if (!validity.valid) {
    return { ok: false, reason: validity.reason === 'abandoned' ? 'abandoned' : 'too_many_false_starts' };
  }
  const score = scorePvt(plausible);
  if (score.medianMs === null) {
    return { ok: false, reason: 'abandoned' };
  }
  return { ok: true, medianMs: Math.round(score.medianMs), lapses: score.lapses, trials: score.count };
}

/** A short, honest label for a median. Phone touch latency adds tens of ms. */
export function speedLabel(medianMs: number): string {
  if (medianMs < 250) return 'Lightning fast';
  if (medianMs < 300) return 'Sharp';
  if (medianMs < 375) return 'Solid';
  return 'A bit slow today';
}

/** How a new run compares with the previous best (lower is better). */
export function comparedToBest(medianMs: number, previousBestMs: number | null): string | null {
  if (previousBestMs === null) return 'Your first score. Try again tomorrow to see how it moves.';
  const diff = Math.round(previousBestMs - medianMs);
  if (diff > 0) return `New personal best, ${diff} ms faster than before.`;
  if (diff === 0) return 'Tied your personal best.';
  return `${-diff} ms off your best of ${Math.round(previousBestMs)} ms.`;
}

/** Text for the share sheet. */
export function shareText(medianMs: number): string {
  return `My reaction time today: ${medianMs} ms (${speedLabel(medianMs).toLowerCase()}). How fast are you?`;
}
