import { createRng, normalizeSeed, shuffle } from '../rng';

describe('seedable RNG', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('abc');
    const b = createRng('abc');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('generally differs for different seeds', () => {
    const a = Array.from({ length: 10 }, (_, i) => i).map(() => createRng('seed-1').next());
    const b = createRng('seed-2');
    const bSeq = Array.from({ length: 10 }, () => b.next());
    expect(a).not.toEqual(bSeq);
  });

  it('nextInt stays in range and returns 0 for non-positive bound', () => {
    const rng = createRng(42);
    for (let i = 0; i < 100; i += 1) {
      const v = rng.nextInt(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
    expect(rng.nextInt(0)).toBe(0);
    expect(rng.nextInt(-3)).toBe(0);
  });

  it('normalizeSeed folds degenerate numeric seeds to a usable value', () => {
    expect(normalizeSeed(Number.NaN)).toBe(0);
    expect(normalizeSeed(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeSeed(7)).toBe(7);
  });

  it('shuffle is a permutation and reproducible', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = shuffle(items, createRng('x'));
    const s2 = shuffle(items, createRng('x'));
    expect(s1).toEqual(s2);
    expect([...s1].sort((p, q) => p - q)).toEqual(items);
    // original is untouched
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
