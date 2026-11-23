/**
 * A tiny seedable pseudo-random generator so trial schedules and stimulus
 * streams are reproducible in tests. This is `mulberry32`: a well-known 32-bit
 * generator that is fast, deterministic from a single integer seed, and good
 * enough for shuffling trials and picking inter-stimulus intervals. It is NOT
 * cryptographic and must not be used for anything security-sensitive.
 *
 * shortcut: not cryptographic — if a task ever needs unguessable sequences,
 * swap in a CSPRNG rather than extending this.
 */
export type Rng = {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number;
};

export function createRng(seed: number): Rng {
  // mulberry32 keeps a single 32-bit state word.
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    if (max < min) {
      throw new Error(`nextInt: max (${max}) must be >= min (${min})`);
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  return { next, nextInt };
}
