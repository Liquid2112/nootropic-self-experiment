/**
 * Calm check — a four-item state-anxiety self-report, pure logic.
 *
 * Two calm items and two tension items, each answered on the four-point
 * intensity scale used by brief state-anxiety measures ("not at all" to "very
 * much"), with the tension items reverse-scored. The short-form approach
 * follows Marteau & Bekker (1992), who showed a handful of balanced items
 * tracks the full state-anxiety scale closely. The wording here is our own.
 *
 * Score: 0..100, higher is calmer.
 */

export type CalmItem = { id: string; prompt: string; reverse: boolean };

export const CALM_ITEMS: readonly CalmItem[] = [
  { id: 'calm', prompt: 'I feel calm', reverse: false },
  { id: 'tense', prompt: 'I feel tense', reverse: true },
  { id: 'at_ease', prompt: 'I feel at ease', reverse: false },
  { id: 'worried', prompt: 'I feel worried', reverse: true },
];

export const CALM_SCALE = ['Not at all', 'A little', 'Quite a bit', 'Very much'] as const;

/**
 * `answers[i]` is the 0..3 index into CALM_SCALE for CALM_ITEMS[i], or null when
 * skipped. Returns null unless every item is answered.
 */
export function scoreCalm(answers: readonly (number | null)[]): number | null {
  if (answers.length !== CALM_ITEMS.length) return null;
  let total = 0;
  for (let i = 0; i < CALM_ITEMS.length; i += 1) {
    const a = answers[i];
    if (a === null || a === undefined || !Number.isInteger(a) || a < 0 || a > 3) return null;
    total += CALM_ITEMS[i]!.reverse ? 3 - a : a;
  }
  const max = CALM_ITEMS.length * 3;
  return Math.round((total / max) * 100);
}
