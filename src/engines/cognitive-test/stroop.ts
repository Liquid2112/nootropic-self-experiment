/**
 * Color-word Stroop — pure logic.
 *
 * A color word ("RED") is printed in an ink color; the user taps the INK, not
 * the word. On congruent trials the word and ink agree, on incongruent trials
 * they clash and reading has to be suppressed. The Stroop interference effect
 * (incongruent minus congruent median RT, on correct trials) is the classic
 * index of attentional control / inhibition (Stroop, 1935; MacLeod, 1991):
 * smaller is better.
 *
 * Practice note: interference shrinks with repetition, which is why the run
 * starts with a baseline and the analysis carries a time trend.
 */
import { createRng } from './rng';
import { medianOf, shuffle } from './shuffle';

export const STROOP_COLORS = ['red', 'blue', 'green', 'yellow'] as const;
export type StroopColor = (typeof STROOP_COLORS)[number];

/** Default trial count: ~30 s at a comfortable pace. */
export const STROOP_DEFAULT_TRIALS = 24;
/** Taps faster than this are anticipations, not reads of the ink. */
export const STROOP_MIN_RT_MS = 200;
/** Fewer correct trials than this in either condition and interference is not scored. */
export const STROOP_MIN_CORRECT_PER_CONDITION = 4;

export type StroopTrial = { word: StroopColor; ink: StroopColor; congruent: boolean };
export type StroopResponse = { choice: StroopColor | null; rtMs: number };

export type StroopScore = {
  /** Share of trials answered with the correct ink, 0..1. */
  accuracy: number | null;
  congruentMedianMs: number | null;
  incongruentMedianMs: number | null;
  /** Incongruent minus congruent median RT (ms). Lower is better. */
  interferenceMs: number | null;
};

/**
 * Half congruent, half incongruent, shuffled. No ink repeats on consecutive
 * trials, so a tap can't be carried over from the trial before.
 */
export function generateStroopTrials(options: { seed: number; trials?: number }): StroopTrial[] {
  const rng = createRng(options.seed);
  const total = Math.max(2, options.trials ?? STROOP_DEFAULT_TRIALS);
  const flags = shuffle(
    Array.from({ length: total }, (_, i) => i < Math.floor(total / 2)),
    rng,
  );
  const trials: StroopTrial[] = [];
  let lastInk: StroopColor | null = null;
  for (const congruent of flags) {
    const inks = STROOP_COLORS.filter((c) => c !== lastInk);
    const ink = inks[rng.nextInt(0, inks.length - 1)]!;
    let word: StroopColor = ink;
    if (!congruent) {
      const others = STROOP_COLORS.filter((c) => c !== ink);
      word = others[rng.nextInt(0, others.length - 1)]!;
    }
    trials.push({ word, ink, congruent });
    lastInk = ink;
  }
  return trials;
}

export function scoreStroop(trials: readonly StroopTrial[], responses: readonly StroopResponse[]): StroopScore {
  const congruentRts: number[] = [];
  const incongruentRts: number[] = [];
  let answered = 0;
  let correct = 0;
  trials.forEach((trial, i) => {
    const r = responses[i];
    if (!r || r.choice === null) return;
    answered += 1;
    if (r.choice !== trial.ink) return;
    correct += 1;
    if (r.rtMs < STROOP_MIN_RT_MS) return;
    (trial.congruent ? congruentRts : incongruentRts).push(r.rtMs);
  });
  const congruentMedianMs = medianOf(congruentRts);
  const incongruentMedianMs = medianOf(incongruentRts);
  const enough =
    congruentRts.length >= STROOP_MIN_CORRECT_PER_CONDITION &&
    incongruentRts.length >= STROOP_MIN_CORRECT_PER_CONDITION;
  return {
    accuracy: answered > 0 ? correct / trials.length : null,
    congruentMedianMs,
    incongruentMedianMs,
    interferenceMs:
      enough && congruentMedianMs !== null && incongruentMedianMs !== null
        ? incongruentMedianMs - congruentMedianMs
        : null,
  };
}
