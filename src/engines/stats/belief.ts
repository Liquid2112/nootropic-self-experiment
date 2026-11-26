/**
 * Belief check: how much of an open-label ON effect could be expectation.
 *
 * Runs are solo and unblinded: the user knows which days are ON. Before each
 * check-in they rate how sharp they expect to be (1-5). Two fits on the same
 * days answer two questions:
 *
 *   raw:      y ~ 1 + ON + t               the ON difference as measured
 *   adjusted: y ~ 1 + ON + belief + t      the ON difference left once the
 *                                          day's expectation is held fixed
 *
 * The adjusted fit is deliberately the WORST CASE for the supplement. Belief is
 * rated after dosing, so part of a real effect can show up as "I feel sharp"
 * and get absorbed into the belief term. If the ON effect survives that, it is
 * hard to explain as expectation alone. If it shrinks a lot, the result may be
 * expectation, or a real effect the user can feel: the app can't tell those
 * apart without blinding, and the sentence says so.
 *
 * Pure: no DB, no RN.
 */
import { fitOls } from './ols';
import { METRICS, type MetricKey } from './metrics';

/** One check-in day with a belief rating. */
export type BeliefObservation = {
  y: number;
  on: 0 | 1;
  t: number;
  /** Expected sharpness, 1 (foggy) to 5 (sharp). */
  belief: number;
};

export type BeliefTier =
  /** The ON effect barely moves once belief is held fixed. */
  | 'holds_up'
  /** Belief accounts for some of the ON effect. */
  | 'partly_belief'
  /** Most of the ON effect moves into the belief term. */
  | 'mostly_belief'
  /** No ON difference to explain in the first place. */
  | 'no_effect_to_explain'
  /** The same rating every day: belief can't be separated out. */
  | 'flat_belief';

export type BeliefCheck = {
  metric: MetricKey;
  days: number;
  /** Mean belief on ON days minus OFF days, in rating points. */
  beliefGap: number;
  /** Metric change per +1 belief point, ON held fixed. Null for flat belief. */
  perPoint: number | null;
  /** ON effect without and with belief held fixed, in metric units. */
  onRaw: number;
  onAdjusted: number | null;
  /** Share of the raw ON effect that moved into belief, 0..1, or null. */
  beliefShare: number | null;
  tier: BeliefTier;
  /** Plain-language summary for the verdict screen. */
  sentence: string;
};

/** Fewer rated days than this and the check isn't shown. */
export const MIN_BELIEF_DAYS = 10;

/** An ON effect smaller than this many residual SDs counts as nothing to explain. */
const TINY_EFFECT_SD = 0.15;

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, v) => s + v, 0) / xs.length;
}

function variance(xs: number[]): number {
  const m = mean(xs);
  return mean(xs.map((v) => (v - m) * (v - m)));
}

/** Fit with the trend column when it varies, falling back to no trend. */
function fit(rows: number[][], y: number[]) {
  try {
    return fitOls(rows, y);
  } catch {
    return fitOls(
      rows.map((r) => r.slice(0, -1)),
      y,
    );
  }
}

function round(v: number): number {
  return Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
}

/**
 * Run the belief check on one metric. Returns null when there are too few
 * rated days, or ON or OFF is missing, so the screen can just leave it out.
 */
export function beliefCheck(metric: MetricKey, days: BeliefObservation[]): BeliefCheck | null {
  if (days.length < MIN_BELIEF_DAYS) return null;
  const onDays = days.filter((d) => d.on === 1);
  const offDays = days.filter((d) => d.on === 0);
  if (onDays.length < 3 || offDays.length < 3) return null;

  const spec = METRICS[metric];
  const y = days.map((d) => d.y);
  const beliefGap = mean(onDays.map((d) => d.belief)) - mean(offDays.map((d) => d.belief));

  let rawFit;
  try {
    rawFit = fit(
      days.map((d) => [1, d.on, d.t]),
      y,
    );
  } catch {
    return null;
  }
  const onRaw = rawFit.coefficients[1]!;
  const residSd = Math.sqrt(mean(rawFit.residuals.map((r) => r * r)));
  const base = { metric, days: days.length, beliefGap, onRaw };

  if (variance(days.map((d) => d.belief)) < 1e-9) {
    return {
      ...base,
      perPoint: null,
      onAdjusted: null,
      beliefShare: null,
      tier: 'flat_belief',
      sentence:
        'You gave the same "how sharp will I be" answer every day, so the app can’t tell how much expectation played a part.',
    };
  }

  let adjFit;
  try {
    adjFit = fit(
      days.map((d) => [1, d.on, d.belief, d.t]),
      y,
    );
  } catch {
    // Belief perfectly tracks ON (e.g. 5 on every ON day, 1 on every OFF day).
    return {
      ...base,
      perPoint: null,
      onAdjusted: null,
      beliefShare: null,
      tier: 'mostly_belief',
      sentence:
        'Your expectation lined up exactly with your ON days, so the app can’t separate the supplement from the belief that it works.',
    };
  }
  const onAdjusted = adjFit.coefficients[1]!;
  const perPoint = adjFit.coefficients[2]!;

  const better = (v: number) => (spec.betterDirection === 'lower' ? v < 0 : v > 0);
  const unit = spec.unit ? ` ${spec.unit}` : '';
  const perPointWord = better(perPoint) ? 'better' : 'worse';
  const beliefLine =
    Math.abs(beliefGap) < 0.5
      ? 'You expected about the same on ON and OFF days.'
      : beliefGap > 0
        ? `You expected to be sharper on ON days (${round(beliefGap)} points higher on a 1–5 scale).`
        : `You expected to be less sharp on ON days (${round(-beliefGap)} points lower on a 1–5 scale).`;
  const trackLine = `Each extra point of expected sharpness went with ${round(Math.abs(perPoint))}${unit} ${perPointWord} ${spec.label}.`;

  if (residSd > 0 && Math.abs(onRaw) < TINY_EFFECT_SD * residSd) {
    return {
      ...base,
      perPoint,
      onAdjusted,
      beliefShare: null,
      tier: 'no_effect_to_explain',
      sentence: `${beliefLine} ${trackLine} There was no real ON difference to explain, so belief doesn’t change the verdict.`,
    };
  }

  // Share of the raw effect that moved into belief. Only meaningful when the
  // adjusted effect points the same way; a flip counts as fully absorbed.
  const ratio = onAdjusted / onRaw;
  const beliefShare = Math.min(1, Math.max(0, 1 - ratio));
  const tier: BeliefTier =
    beliefShare < 0.25 ? 'holds_up' : beliefShare < 0.6 ? 'partly_belief' : 'mostly_belief';
  const pct = Math.round(beliefShare * 100);
  const verdictLine =
    tier === 'holds_up'
      ? 'Even counting all of that as placebo, your ON-day difference holds up.'
      : tier === 'partly_belief'
        ? `Counting all of that as placebo, about ${pct}% of your ON-day difference could be expectation. The rest holds up.`
        : `Counting all of that as placebo, most of your ON-day difference (about ${pct}%) could be expectation, or a real effect you can feel. Without a blind, the app can’t tell those apart.`;

  return {
    ...base,
    perPoint,
    onAdjusted,
    beliefShare,
    tier,
    sentence: `${beliefLine} ${trackLine} ${verdictLine}`,
  };
}
