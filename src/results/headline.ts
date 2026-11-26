/**
 * Pieces of a metric's effect for the big-number verdict hero: "18" "ms"
 * "faster" and the range, split out of the engine's effect sentence
 * ("reaction time 18 ms faster (range 4 to 32 ms faster)"). Pure, so the
 * hero never invents a number the engine didn't produce.
 */
import { METRICS, type MetricKey } from '@/engines/stats';

export type EffectHeadline = {
  /** The magnitude, as the engine rounded it. */
  value: string;
  /** The metric's unit ('' when unitless). */
  unit: string;
  /** Direction word: "faster", "higher", "fewer"... */
  word: string;
  /** The 90% range, already in direction words. */
  range: string;
};

export function effectHeadline(metric: MetricKey, effectSentence: string | null): EffectHeadline | null {
  if (!effectSentence) return null;
  const spec = METRICS[metric];
  if (!spec || !effectSentence.startsWith(`${spec.label} `)) return null;
  const rest = effectSentence.slice(spec.label.length + 1);
  const unit = spec.unit ? ` ${spec.unit}` : '';
  const match = /^(\d+(?:\.\d+)?)(.*) (\S+) \(range (.+)\)$/.exec(rest);
  if (!match || match[2] !== unit) return null;
  return { value: match[1]!, unit: spec.unit, word: match[3]!, range: match[4]! };
}

/**
 * Where a value sits on the "better ... no change ... worse" axis, from 0
 * (far better) to 1 (far worse), 0.5 being no change. `scale` is the largest
 * magnitude shown.
 */
export function axisPosition(metric: MetricKey, value: number, scale: number): number {
  const spec = METRICS[metric];
  const better = spec?.betterDirection === 'lower' ? -value : value;
  if (!(scale > 0)) return 0.5;
  return Math.max(0, Math.min(1, 0.5 - better / scale / 2));
}
