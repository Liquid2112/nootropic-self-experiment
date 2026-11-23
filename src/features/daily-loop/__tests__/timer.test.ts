import { hasHighResTimer, now, reactionTime } from '../timer';

describe('timer', () => {
  it('reports a numeric timestamp', () => {
    expect(typeof now()).toBe('number');
  });

  it('computes reaction time as tap minus onset', () => {
    expect(reactionTime(1000, 1250.5)).toBeCloseTo(250.5, 5);
  });

  it('advances monotonically across two reads', () => {
    const a = now();
    const b = now();
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it('reports whether a high-res clock backs now()', () => {
    // Node 20 provides globalThis.performance.now, so this is true in CI; the
    // assertion only checks the return type so it holds either way.
    expect(typeof hasHighResTimer()).toBe('boolean');
  });
});
