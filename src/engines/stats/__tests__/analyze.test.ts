import { analyzeMetric, type DayObservation, toDbVerdict } from '../analyze';
import { OlsError } from '../ols';
import { REFERENCE } from './reference';

/** Turn a reference case into DayObservation[] tagged with a metric's role. */
function daysOf(c: (typeof REFERENCE)[string]): DayObservation[] {
  return c.t.map((_, i) => ({
    y: c.y[i]!,
    on: c.on[i]! as 0 | 1,
    t: c.t[i]!,
    sleep: c.sleep[i]!,
    caffeine: c.caffeine[i]! as 0 | 1,
  }));
}

describe('analyzeMetric end-to-end', () => {
  it('recovers the injected ON effect and matches the reference CI', () => {
    const c = REFERENCE.known_effect_n60!;
    // Treat the series as reaction time (lower is better).
    const res = analyzeMetric('pvtMedianMs', daysOf(c), { lag: c.lag });
    expect(res.estimate).toBeCloseTo(c.coef[1]!, 8);
    expect(res.ci.low).toBeCloseTo(c.ci90B1[0], 7);
    expect(res.ci.high).toBeCloseTo(c.ci90B1[1], 7);
    expect(res.effectSize).toBeCloseTo(c.effectSizeB1, 6);
  });

  it('a reaction-time DECREASE reads as a measurable improvement', () => {
    const c = REFERENCE.known_effect_n60!;
    const res = analyzeMetric('pvtMedianMs', daysOf(c), { lag: c.lag });
    // b1 is about -18 (faster); for lower-is-better this is improvement.
    expect(res.estimate).toBeLessThan(0);
    expect(res.verdictState).toBe('measurable_improvement');
    expect(res.verdictSentence).toBe('Measurable improvement for you.');
    expect(res.effectSentence).toContain('faster');
    expect(toDbVerdict(res.verdictState)).toBe('works');
  });

  it('the SAME decrease would read as "worse" for a higher-is-better metric', () => {
    // Direction handling: identical data, different metric role flips the verdict.
    const c = REFERENCE.known_effect_n60!;
    const res = analyzeMetric('nbackAccuracy', daysOf(c), { lag: c.lag });
    expect(res.verdictState).toBe('measured_worse');
    expect(toDbVerdict(res.verdictState)).toBe('harmful');
  });

  it('a pure-noise series gives a CI including zero and no meaningful effect', () => {
    const c = REFERENCE.pure_noise_n80!;
    const res = analyzeMetric('focus', daysOf(c), { lag: c.lag });
    expect(res.ci.low).toBeLessThan(0);
    expect(res.ci.high).toBeGreaterThan(0);
    expect(res.verdictState).toBe('no_meaningful_effect');
    expect(toDbVerdict(res.verdictState)).toBe('no_effect');
  });

  it('computes the block-mean difference alongside the regression estimate', () => {
    const c = REFERENCE.mixed_n30!;
    const res = analyzeMetric('nbackDprime', daysOf(c));
    // mean(ON) - mean(OFF) computed directly for comparison.
    const on = c.y.filter((_, i) => c.on[i] === 1);
    const off = c.y.filter((_, i) => c.on[i] === 0);
    const expected =
      on.reduce((s, v) => s + v, 0) / on.length -
      off.reduce((s, v) => s + v, 0) / off.length;
    expect(res.blockMeanDiff).toBeCloseTo(expected, 10);
  });

  it('defaults the lag when none is supplied', () => {
    const c = REFERENCE.known_effect_n60!;
    const res = analyzeMetric('pvtMedianMs', daysOf(c));
    expect(res.lag).toBe(3); // defaultLag(60)
  });
});

describe('adherence gate inside analyzeMetric', () => {
  it('forces not_enough_data when adherence is below 80%, even with a clear effect', () => {
    const c = REFERENCE.known_effect_n60!;
    const res = analyzeMetric('pvtMedianMs', daysOf(c), {
      lag: c.lag,
      adherence: { scheduledDays: 60, takenDays: 40, testedDays: 60 }, // 67%
    });
    expect(res.adherenceMet).toBe(false);
    expect(res.verdictState).toBe('not_enough_data');
    expect(toDbVerdict(res.verdictState)).toBe('inconclusive');
  });

  it('allows the verdict through at exactly 80% adherence', () => {
    const c = REFERENCE.known_effect_n60!;
    const res = analyzeMetric('pvtMedianMs', daysOf(c), {
      lag: c.lag,
      adherence: { scheduledDays: 60, takenDays: 48, testedDays: 60 }, // 80%
    });
    expect(res.adherenceMet).toBe(true);
    expect(res.verdictState).toBe('measurable_improvement');
  });
});

describe('analyzeMetric edge cases', () => {
  it('throws on too few days (fewer observations than parameters)', () => {
    const days: DayObservation[] = [
      { y: 1, on: 1, t: 0, sleep: 7, caffeine: 0 },
      { y: 2, on: 0, t: 1, sleep: 6, caffeine: 1 },
      { y: 3, on: 1, t: 2, sleep: 8, caffeine: 0 },
    ];
    expect(() => analyzeMetric('focus', days)).toThrow(OlsError);
  });

  it('throws on an all-ON design (ON column collinear with the intercept)', () => {
    // Every day ON: the ON column equals the constant column -> singular.
    const days: DayObservation[] = Array.from({ length: 10 }, (_, i) => ({
      y: 10 + i,
      on: 1 as const,
      t: i,
      sleep: 7,
      caffeine: (i % 2) as 0 | 1,
    }));
    expect(() => analyzeMetric('focus', days)).toThrow(OlsError);
  });
});
