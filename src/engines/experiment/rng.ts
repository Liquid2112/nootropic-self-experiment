/**
 * Small seedable pseudo-random generator for reproducible schedules.
 *
 * Schedules must be reproducible in tests (same seed -> same schedule) and the
 * engine must run on-device without Node's crypto module, so this uses the
 * well-known mulberry32 generator: a 32-bit state stepped by a fixed integer
 * mix. It is NOT cryptographically secure and is not meant to be — it only has
 * to spread ON/OFF days evenly and be deterministic from a seed.
 */

export type Rng = {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
};

/** Derive a 32-bit unsigned integer seed from an arbitrary string or number. */
export function normalizeSeed(seed: string | number): number {
  if (typeof seed === 'number') {
    // Fold into 32 bits; NaN/Infinity collapse to 0 so a degenerate seed still
    // produces a usable (if constant) generator rather than throwing.
    return Number.isFinite(seed) ? seed >>> 0 : 0;
  }
  // FNV-1a over the string's char codes.
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Create a deterministic RNG from a string or numeric seed. */
export function createRng(seed: string | number): Rng {
  let state = normalizeSeed(seed);
  function next(): number {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    nextInt(maxExclusive: number): number {
      if (maxExclusive <= 0) {
        return 0;
      }
      return Math.floor(next() * maxExclusive);
    },
  };
}

/**
 * Fisher–Yates shuffle returning a new array, driven by the given RNG so the
 * result is reproducible for a fixed seed.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
