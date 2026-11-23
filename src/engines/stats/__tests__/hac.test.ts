import {
  confidenceInterval90,
  defaultLag,
  hacCovariance,
  Z_90,
} from '../hac';
import { fitOls } from '../ols';
import { REFERENCE } from './reference';

function designOf(c: (typeof REFERENCE)[string]): number[][] {
  return c.t.map((_, i) => [1, c.on[i]!, c.t[i]!, c.sleep[i]!, c.caffeine[i]!]);
}

describe('defaultLag', () => {
  it('uses floor(4*(n/100)^(2/9))', () => {
    expect(defaultLag(30)).toBe(3);
    expect(defaultLag(60)).toBe(3);
    expect(defaultLag(100)).toBe(4);
    expect(defaultLag(200)).toBe(4);
  });
});

describe('hacCovariance vs statsmodels Newey-West', () => {
  const run = (name: keyof typeof REFERENCE | string) => {
    const c = REFERENCE[name]!;
    const x = designOf(c);
    const fit = fitOls(x, c.y);
    return { c, hac: hacCovariance(x, fit, c.lag) };
  };

  it('matches the full HAC standard-error vector (known-effect, n=60)', () => {
    const { c, hac } = run('known_effect_n60');
    for (let j = 0; j < c.hacSe.length; j++) {
      expect(hac.standardErrors[j]!).toBeCloseTo(c.hacSe[j]!, 8);
    }
  });

  it('matches the HAC SE of b1 on the pure-noise dataset (n=80)', () => {
    const { c, hac } = run('pure_noise_n80');
    expect(hac.standardErrors[1]!).toBeCloseTo(c.seB1, 8);
  });

  it('matches the HAC SE of b1 on the mixed dataset (n=30)', () => {
    const { c, hac } = run('mixed_n30');
    expect(hac.standardErrors[1]!).toBeCloseTo(c.seB1, 8);
  });

  it('matches with a configurable fixed lag (lag=3, n=50)', () => {
    const { c, hac } = run('fixed_lag3_n50');
    expect(hac.lag).toBe(3);
    expect(hac.standardErrors[1]!).toBeCloseTo(c.seB1, 8);
  });
});

describe('confidenceInterval90', () => {
  it('uses the standard-normal 0.95 quantile', () => {
    expect(Z_90).toBeCloseTo(1.6448536269514722, 12);
    const ci = confidenceInterval90(10, 2);
    expect(ci.low).toBeCloseTo(10 - Z_90 * 2, 12);
    expect(ci.high).toBeCloseTo(10 + Z_90 * 2, 12);
  });

  it('reproduces the statsmodels 90% CI for b1 (known-effect)', () => {
    const c = REFERENCE.known_effect_n60!;
    const x = designOf(c);
    const fit = fitOls(x, c.y);
    const hac = hacCovariance(x, fit, c.lag);
    const ci = confidenceInterval90(fit.coefficients[1]!, hac.standardErrors[1]!);
    expect(ci.low).toBeCloseTo(c.ci90B1[0], 7);
    expect(ci.high).toBeCloseTo(c.ci90B1[1], 7);
  });

  it('gives a CI that EXCLUDES zero for a real effect', () => {
    const c = REFERENCE.known_effect_n60!;
    const x = designOf(c);
    const fit = fitOls(x, c.y);
    const hac = hacCovariance(x, fit, c.lag);
    const ci = confidenceInterval90(fit.coefficients[1]!, hac.standardErrors[1]!);
    expect(ci.high).toBeLessThan(0); // whole interval below zero
  });

  it('gives a CI that INCLUDES zero for pure noise', () => {
    const c = REFERENCE.pure_noise_n80!;
    const x = designOf(c);
    const fit = fitOls(x, c.y);
    const hac = hacCovariance(x, fit, c.lag);
    const ci = confidenceInterval90(fit.coefficients[1]!, hac.standardErrors[1]!);
    expect(ci.low).toBeLessThan(0);
    expect(ci.high).toBeGreaterThan(0);
  });
});
