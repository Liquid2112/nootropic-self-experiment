import { METRICS } from '../metrics';
import {
  ADHERENCE_THRESHOLD,
  adherenceRate,
  blockMeanDifference,
  classifyVerdict,
  effectSize,
  formatEffect,
  meetsAdherence,
  VERDICT_SENTENCE,
} from '../verdict';

describe('effectSize', () => {
  it('is b1 divided by residual SD', () => {
    expect(effectSize(18, 6)).toBeCloseTo(3, 12);
    expect(effectSize(-18, 6)).toBeCloseTo(-3, 12);
  });

  it('throws when residual SD is non-positive', () => {
    expect(() => effectSize(1, 0)).toThrow();
  });
});

describe('blockMeanDifference', () => {
  it('computes mean(ON) - mean(OFF)', () => {
    // ON values {10,12} mean 11; OFF values {4,6} mean 5; diff 6.
    expect(blockMeanDifference([10, 4, 12, 6], [1, 0, 1, 0])).toBeCloseTo(6, 12);
  });

  it('throws on an all-ON or all-OFF design', () => {
    expect(() => blockMeanDifference([1, 2, 3], [1, 1, 1])).toThrow();
    expect(() => blockMeanDifference([1, 2, 3], [0, 0, 0])).toThrow();
  });
});

describe('formatEffect', () => {
  it('reads a reaction-time decrease as "faster" with a signed range', () => {
    const s = formatEffect(METRICS.pvtMedianMs, -18, { low: -32, high: -4 });
    // Both bounds are improvements (negative = faster): one word, ascending.
    expect(s).toBe('reaction time 18 ms faster (range 4 to 32 ms faster)');
  });

  it('reads a reaction-time increase as "slower"', () => {
    const s = formatEffect(METRICS.pvtMedianMs, 12, { low: 3, high: 21 });
    expect(s).toContain('slower');
  });

  it('preserves the sign when the interval straddles zero (finding 5)', () => {
    // 30 ms faster to 10 ms slower must NOT collapse to a one-sided "faster".
    const s = formatEffect(METRICS.pvtMedianMs, -10, { low: -30, high: 10 });
    expect(s).toBe('reaction time 10 ms faster (range 30 ms faster to 10 ms slower)');
    expect(s).toContain('faster to');
    expect(s).toContain('slower');
  });

  it('a straddling higher-is-better interval names both directions', () => {
    // focus: +2 higher to -1 lower.
    const s = formatEffect(METRICS.focus, 0.5, { low: -1, high: 2 });
    expect(s).toBe('focus rating 0.5 higher (range 2 higher to 1 lower)');
  });

  it('reads fewer lapses as an improvement word', () => {
    const s = formatEffect(METRICS.pvtLapses, -2, { low: -3, high: -1 });
    expect(s).toContain('fewer');
  });

  it('reads a higher slider rating as "higher"', () => {
    const s = formatEffect(METRICS.focus, 1.2, { low: 0.4, high: 2.0 });
    expect(s).toContain('higher');
  });
});

describe('adherence gate', () => {
  it('rate is min(taken, tested) / scheduled', () => {
    expect(
      adherenceRate({ scheduledDays: 10, takenDays: 9, testedDays: 8 }),
    ).toBeCloseTo(0.8, 12);
  });

  it('passes at exactly 80%', () => {
    expect(
      meetsAdherence({ scheduledDays: 10, takenDays: 8, testedDays: 10 }),
    ).toBe(true);
  });

  it('blocks below 80%', () => {
    expect(
      meetsAdherence({ scheduledDays: 10, takenDays: 7, testedDays: 10 }),
    ).toBe(false);
  });

  it('treats a zero-day schedule as zero adherence', () => {
    expect(adherenceRate({ scheduledDays: 0, takenDays: 0, testedDays: 0 })).toBe(0);
    expect(ADHERENCE_THRESHOLD).toBe(0.8);
  });
});

describe('classifyVerdict', () => {
  const resid = 1;

  it('measurable improvement: CI excludes zero, effect >= 0.3, improving direction', () => {
    // Reaction time lower-is-better; whole CI below zero; |es| = 0.5.
    const v = classifyVerdict(
      { estimate: -0.5, ci: { low: -0.8, high: -0.2 }, effectSize: -0.5, direction: 'lower' },
      resid,
    );
    expect(v).toBe('measurable_improvement');
    expect(VERDICT_SENTENCE[v]).toBe('Measurable improvement for you.');
  });

  it('measured worse: CI excludes zero in the worse direction', () => {
    // Reaction time went UP (worse for lower-is-better); CI above zero.
    const v = classifyVerdict(
      { estimate: 0.5, ci: { low: 0.2, high: 0.8 }, effectSize: 0.5, direction: 'lower' },
      resid,
    );
    expect(v).toBe('measured_worse');
  });

  it('no meaningful effect: CI includes zero but is narrower than the width bar', () => {
    const v = classifyVerdict(
      { estimate: 0.05, ci: { low: -0.1, high: 0.2 }, effectSize: 0.05, direction: 'higher' },
      resid,
    );
    expect(v).toBe('no_meaningful_effect');
  });

  it('no meaningful effect: a realistic-width null CI (finding 3)', () => {
    // A ~1.2 SD-wide interval straddling zero is the typical 28-day true-null
    // shape. Under the recalibrated 1.4 width bar it is declared "no meaningful
    // effect" rather than the old "extend 2 weeks".
    const v = classifyVerdict(
      { estimate: 0.1, ci: { low: -0.5, high: 0.7 }, effectSize: 0.1, direction: 'higher' },
      resid,
    );
    expect(v).toBe('no_meaningful_effect');
  });

  it('not enough data: CI includes zero and is wider than the width bar', () => {
    // Width 1.6 SD > 1.4 -> genuinely under-powered, still "not enough data".
    const v = classifyVerdict(
      { estimate: 0.1, ci: { low: -0.8, high: 0.8 }, effectSize: 0.1, direction: 'higher' },
      resid,
    );
    expect(v).toBe('not_enough_data');
  });

  it('a statistically clear but tiny improvement is not "meaningful"', () => {
    // CI excludes zero, improving, but |es| < 0.3.
    const v = classifyVerdict(
      { estimate: -0.1, ci: { low: -0.18, high: -0.02 }, effectSize: -0.1, direction: 'lower' },
      resid,
    );
    expect(v).toBe('no_meaningful_effect');
  });
});
