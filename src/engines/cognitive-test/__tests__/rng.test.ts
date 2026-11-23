import { createRng } from '../rng';

/**
 * The RNG underpins every "seedable, reproducible" claim the task engines make,
 * so these guard determinism and range.
 */
describe('createRng', () => {
  it('is reproducible: same seed gives the same stream', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('gives different streams for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays in [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i += 1) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt() stays within inclusive bounds', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const v = rng.nextInt(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextInt() can return both endpoints over many draws', () => {
    const rng = createRng(42);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      seen.add(rng.nextInt(0, 2));
    }
    expect(seen.has(0)).toBe(true);
    expect(seen.has(2)).toBe(true);
  });

  it('throws when max < min', () => {
    const rng = createRng(1);
    expect(() => rng.nextInt(5, 1)).toThrow();
  });
});
