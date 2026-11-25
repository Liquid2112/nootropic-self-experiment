import {
  isImprovement,
  METRICS,
  selectPrimaryMetric,
  CORE_METRICS,
  CHECK_IN_METRICS,
} from '../metrics';

describe('metric direction', () => {
  it('marks reaction time and lapses as lower-is-better', () => {
    expect(METRICS.pvtMedianMs.betterDirection).toBe('lower');
    expect(METRICS.pvtLapses.betterDirection).toBe('lower');
  });

  it('marks accuracy, d-prime, and sliders as higher-is-better', () => {
    expect(METRICS.nbackAccuracy.betterDirection).toBe('higher');
    expect(METRICS.nbackDprime.betterDirection).toBe('higher');
    expect(METRICS.focus.betterDirection).toBe('higher');
    expect(METRICS.mood.betterDirection).toBe('higher');
  });

  it('treats a reaction-time DECREASE as improvement', () => {
    // Lower is better: a negative delta improves.
    expect(isImprovement('lower', -18)).toBe(true);
    expect(isImprovement('lower', 5)).toBe(false);
  });

  it('treats an accuracy INCREASE as improvement', () => {
    expect(isImprovement('higher', 4)).toBe(true);
    expect(isImprovement('higher', -2)).toBe(false);
  });
});

describe('selectPrimaryMetric', () => {
  it('maps each goal to its primary metric', () => {
    expect(selectPrimaryMetric('focus').primary).toBe('pvtMedianMs');
    expect(selectPrimaryMetric('memory').primary).toBe('nbackDprime');
    expect(selectPrimaryMetric('calm').primary).toBe('calmScore');
    expect(selectPrimaryMetric('sleep').primary).toBe('energy');
  });

  it('returns the remaining metrics as secondary', () => {
    const sel = selectPrimaryMetric('focus');
    expect(sel.secondary).not.toContain('pvtMedianMs');
    expect(sel.secondary).toContain('nbackDprime');
    expect(sel.secondary.length).toBe(CHECK_IN_METRICS.length - 1);
  });

  it('judges an older calm run (no calm check) on the mood rating', () => {
    expect(selectPrimaryMetric('calm', CORE_METRICS).primary).toBe('mood');
  });

  it('respects a restricted available set', () => {
    const sel = selectPrimaryMetric('memory', ['nbackDprime', 'focus']);
    expect(sel.primary).toBe('nbackDprime');
    expect(sel.secondary).toEqual(['focus']);
  });

  it('throws on an unknown goal', () => {
    // @ts-expect-error intentionally passing an invalid goal
    expect(() => selectPrimaryMetric('vibes')).toThrow();
  });
});
