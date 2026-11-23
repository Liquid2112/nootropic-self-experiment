import { fitOls, OlsError, residualSd } from '../ols';
import { REFERENCE } from './reference';

/** Build the [const, ON, t, sleep, caffeine] design from a reference case. */
function designOf(c: (typeof REFERENCE)[string]): number[][] {
  return c.t.map((_, i) => [1, c.on[i]!, c.t[i]!, c.sleep[i]!, c.caffeine[i]!]);
}

describe('fitOls', () => {
  it('matches statsmodels coefficients on the known-effect dataset', () => {
    const c = REFERENCE.known_effect_n60!;
    const fit = fitOls(designOf(c), c.y);
    for (let j = 0; j < c.coef.length; j++) {
      expect(fit.coefficients[j]!).toBeCloseTo(c.coef[j]!, 8);
    }
  });

  it('matches statsmodels coefficients on the mixed dataset', () => {
    const c = REFERENCE.mixed_n30!;
    const fit = fitOls(designOf(c), c.y);
    for (let j = 0; j < c.coef.length; j++) {
      expect(fit.coefficients[j]!).toBeCloseTo(c.coef[j]!, 8);
    }
  });

  it('recovers an injected ON effect near the true value (-18)', () => {
    // Dataset was generated with true b1 = -18; OLS must land near it.
    const c = REFERENCE.known_effect_n60!;
    const fit = fitOls(designOf(c), c.y);
    expect(fit.coefficients[1]!).toBeCloseTo(-18, 0);
  });

  it('returns fitted values and residuals that reconstruct y', () => {
    const c = REFERENCE.mixed_n30!;
    const fit = fitOls(designOf(c), c.y);
    for (let i = 0; i < c.y.length; i++) {
      expect(fit.fitted[i]! + fit.residuals[i]!).toBeCloseTo(c.y[i]!, 10);
    }
  });

  it('residuals are orthogonal to each regressor (normal equations hold)', () => {
    const c = REFERENCE.mixed_n30!;
    const x = designOf(c);
    const fit = fitOls(x, c.y);
    for (let j = 0; j < fit.k; j++) {
      let dot = 0;
      for (let i = 0; i < fit.n; i++) dot += x[i]![j]! * fit.residuals[i]!;
      expect(dot).toBeCloseTo(0, 6);
    }
  });

  it('matches the statsmodels residual SD', () => {
    const c = REFERENCE.known_effect_n60!;
    const fit = fitOls(designOf(c), c.y);
    expect(residualSd(fit)).toBeCloseTo(c.residSd, 8);
  });

  it('throws OlsError when there are too few observations', () => {
    // 2 rows, 5 columns -> under-determined.
    const x = [
      [1, 1, 0, 7, 0],
      [1, 0, 1, 6, 1],
    ];
    expect(() => fitOls(x, [1, 2])).toThrow(OlsError);
  });

  it('throws OlsError on perfectly collinear columns', () => {
    // Column 2 is 2x column 1, so X'X is singular.
    const x = [
      [1, 1, 2],
      [1, 2, 4],
      [1, 3, 6],
      [1, 4, 8],
    ];
    expect(() => fitOls(x, [1, 2, 3, 4])).toThrow(OlsError);
  });
});
