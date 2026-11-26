/**
 * Symbol-digit coding — pure logic.
 *
 * A key pairs nine abstract symbols with the digits 1-9. One symbol is shown at
 * a time and the user taps its digit, as many as they can in a fixed window.
 * This is the tap version of the Digit Symbol Substitution Test (Wechsler;
 * the oral/written SDMT, Smith 1982), one of the most drug-sensitive measures
 * of processing speed (Jaeger, 2018). Score: correct answers per minute.
 *
 * The key is reshuffled every day so the score tracks speed, not a memorized
 * mapping.
 */
import { createRng } from './rng';
import { shuffle } from './shuffle';

/** Number of symbols in the key (digits 1..9). */
export const SYMBOL_COUNT = 9;
/** Length of the timed window. */
export const SYMBOL_DURATION_MS = 45_000;
/** More items than anyone can finish in the window. */
export const SYMBOL_STREAM_LENGTH = 120;

export type SymbolSet = {
  /** key[symbolId] = digit (1..9). Symbol ids are 0..8 and index the glyphs. */
  key: number[];
  /** Symbol ids to show, in order. Never the same symbol twice in a row. */
  stream: number[];
};

export function generateSymbolSet(options: { seed: number; length?: number }): SymbolSet {
  const rng = createRng(options.seed);
  const key = shuffle(
    Array.from({ length: SYMBOL_COUNT }, (_, i) => i + 1),
    rng,
  );
  const length = options.length ?? SYMBOL_STREAM_LENGTH;
  const stream: number[] = [];
  let last = -1;
  for (let i = 0; i < length; i += 1) {
    let next: number;
    if (last < 0) {
      next = rng.nextInt(0, SYMBOL_COUNT - 1);
    } else {
      // Draw from the other eight and skip over the last one.
      next = rng.nextInt(0, SYMBOL_COUNT - 2);
      if (next >= last) next += 1;
    }
    stream.push(next);
    last = next;
  }
  return { key, stream };
}

export type SymbolScore = {
  /** Correct answers per minute. Higher is better. */
  correctPerMin: number | null;
  /** Share of answers that were correct, 0..1. */
  accuracy: number | null;
};

/**
 * Score the answers given within the window. `answers[i]` is the digit tapped
 * for stream[i]; the list stops where the window closed.
 */
export function scoreSymbol(
  set: SymbolSet,
  answers: readonly number[],
  durationMs: number = SYMBOL_DURATION_MS,
): SymbolScore {
  if (answers.length === 0 || durationMs <= 0) return { correctPerMin: null, accuracy: null };
  let correct = 0;
  answers.forEach((digit, i) => {
    const symbol = set.stream[i];
    if (symbol !== undefined && set.key[symbol] === digit) correct += 1;
  });
  return {
    correctPerMin: Math.round((correct / (durationMs / 60_000)) * 10) / 10,
    accuracy: correct / answers.length,
  };
}
