import { analyzeMetric, blockMeans, type DayObservation, toDbVerdict } from '../analyze';
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

describe('covariate guard (finding 2)', () => {
  /** A clean alternating acute run with a real ON effect on reaction time. */
  function rtDays(n: number, mutate: (d: DayObservation, i: number) => void): DayObservation[] {
    return Array.from({ length: n }, (_, i) => {
      const on: 0 | 1 = (i % 2) as 0 | 1;
      const d: DayObservation = {
        y: 300 - (on ? 18 : 0) + Math.sin(i * 1.7) * 3,
        on,
        t: i,
        sleep: 6.5 + ((i * 7) % 5) * 0.2,
        caffeine: (i % 3 === 0 ? 1 : 0) as 0 | 1,
      };
      mutate(d, i);
      return d;
    });
  }

  it('does not throw when caffeine is constant (always "yes") and drops it', () => {
    const days = rtDays(28, (d) => {
      d.caffeine = 1; // 100% of days -> zero-variance column
    });
    const res = analyzeMetric('pvtMedianMs', days);
    expect(res.droppedCovariates).toContain('caffeine');
    expect(res.estimate).toBeLessThan(0); // still recovers the ~18ms improvement
    expect(res.verdictState).toBe('measurable_improvement');
  });

  it('does not throw when sleep is never logged (constant 0) and drops it', () => {
    const days = rtDays(28, (d) => {
      d.sleep = 0; // unlogged default -> zero variance
    });
    const res = analyzeMetric('pvtMedianMs', days);
    expect(res.droppedCovariates).toContain('sleep');
    expect(res.estimate).toBeLessThan(0);
  });

  it('drops a caffeine covariate that is collinear with the ON days', () => {
    // Caffeine taken exactly on ON days -> caffeine column == ON column.
    const days = rtDays(28, (d) => {
      d.caffeine = d.on;
    });
    const res = analyzeMetric('pvtMedianMs', days);
    expect(res.droppedCovariates).toContain('caffeine');
    expect(res.estimate).toBeLessThan(0);
    expect(res.verdictState).toBe('measurable_improvement');
  });

  it('keeps all covariates when they vary independently', () => {
    const days = rtDays(28, () => {});
    const res = analyzeMetric('pvtMedianMs', days);
    expect(res.droppedCovariates).toEqual([]);
    expect(res.coefficients).toHaveLength(5); // const, ON, t, sleep, caffeine
  });
});

describe('cumulative block-means analysis (finding 4)', () => {
  /** A 28-day ABAB block design (7-day blocks), optional ON effect. */
  function blockDays(onEffect: number): DayObservation[] {
    const arms: (0 | 1)[] = [];
    for (const block of [1, 0, 1, 0] as const) for (let i = 0; i < 7; i++) arms.push(block);
    return arms.map((on, i) => ({
      y: 50 + (on ? onEffect : 0) + Math.sin(i * 2.1) * 2,
      on,
      t: i,
      sleep: 7,
      caffeine: 0,
    }));
  }

  it('collapses the daily series to one mean per block', () => {
    const blocks = blockMeans(blockDays(5));
    expect(blocks).toHaveLength(4);
    expect(blocks.map((b) => b.on)).toEqual([1, 0, 1, 0]);
  });

  it('fits only [const, ON] on the blocks and reports all covariates dropped', () => {
    const res = analyzeMetric('focus', blockDays(5), { design: 'cumulative' });
    expect(res.coefficients).toHaveLength(2);
    expect(res.droppedCovariates).toEqual(['t', 'sleep', 'caffeine']);
  });

  it('surfaces the low-power note on a non-null verdict', () => {
    const res = analyzeMetric('focus', blockDays(10), { design: 'cumulative' });
    expect(res.verdictSentence).toContain('cumulative run');
    expect(res.verdictSentence.toLowerCase()).toContain('miss small effects');
  });
});
