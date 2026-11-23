import {
  MAX_RUN,
  balancedCounts,
  buildAcuteSequence,
  hasTooLongRun,
} from '../acute';
import type { RunLength, TrueArm } from '../types';

function counts(seq: readonly TrueArm[]): { on: number; off: number } {
  return {
    on: seq.filter((a) => a === 'ON').length,
    off: seq.filter((a) => a === 'OFF').length,
  };
}

describe('acute: balanced counts', () => {
  it('splits 28 as 14/14', () => {
    expect(balancedCounts(28)).toEqual({ on: 14, off: 14 });
  });
  it('splits 21 as 11/10 (balanced within one)', () => {
    expect(balancedCounts(21)).toEqual({ on: 11, off: 10 });
  });
});

describe('acute: hasTooLongRun invariant helper', () => {
  it('flags a run longer than MAX_RUN', () => {
    expect(hasTooLongRun(['ON', 'ON', 'ON', 'ON'])).toBe(true);
  });
  it('allows exactly MAX_RUN in a row', () => {
    expect(hasTooLongRun(['ON', 'ON', 'ON', 'OFF'])).toBe(false);
  });
});

describe.each<RunLength>([21, 28])('acute schedule for %d days', (length) => {
  it('is exactly balanced', () => {
    const seq = buildAcuteSequence(length, 'seed-A');
    const { on, off } = counts(seq);
    const expected = balancedCounts(length);
    expect(seq).toHaveLength(length);
    expect({ on, off }).toEqual(expected);
  });

  it('never has more than MAX_RUN identical arms in a row', () => {
    // Check across many seeds so the constraint holds generally, not by luck.
    for (let s = 0; s < 50; s += 1) {
      const seq = buildAcuteSequence(length, `seed-${s}`);
      expect(hasTooLongRun(seq)).toBe(false);
    }
    expect(MAX_RUN).toBe(3);
  });

  it('is reproducible: same seed -> same schedule', () => {
    expect(buildAcuteSequence(length, 'fixed')).toEqual(
      buildAcuteSequence(length, 'fixed'),
    );
  });

  it('generally differs for different seeds', () => {
    const a = buildAcuteSequence(length, 'alpha');
    const b = buildAcuteSequence(length, 'beta');
    expect(a).not.toEqual(b);
  });
});

describe('acute: degenerate seeds still produce valid schedules', () => {
  it('handles NaN and a constant numeric seed', () => {
    for (const seed of [Number.NaN, 0, 1]) {
      const seq = buildAcuteSequence(28, seed);
      expect(seq).toHaveLength(28);
      expect(counts(seq)).toEqual({ on: 14, off: 14 });
      expect(hasTooLongRun(seq)).toBe(false);
    }
  });
});
