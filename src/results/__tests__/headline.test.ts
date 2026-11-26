import { axisPosition, effectHeadline } from '../headline';

describe('effectHeadline', () => {
  it('splits a unit metric', () => {
    expect(effectHeadline('pvtMedianMs', 'reaction time 18 ms faster (range 4 to 32 ms faster)')).toEqual({
      value: '18',
      unit: 'ms',
      word: 'faster',
      range: '4 to 32 ms faster',
    });
  });
  it('handles a multi-word unit and a unitless metric', () => {
    expect(effectHeadline('symbolPerMin', 'symbol-coding speed 3.5 per min higher (range 1 to 6 per min higher)'))
      .toMatchObject({ value: '3.5', unit: 'per min', word: 'higher' });
    expect(effectHeadline('calmScore', 'calm score 2 higher (range 1 to 3 higher)')).toMatchObject({
      value: '2',
      unit: '',
      word: 'higher',
    });
  });
  it('returns null when the sentence does not match', () => {
    expect(effectHeadline('pvtMedianMs', null)).toBeNull();
    expect(effectHeadline('pvtMedianMs', 'something else')).toBeNull();
  });
});

describe('axisPosition', () => {
  it('puts improvements left of center for lower-is-better metrics', () => {
    expect(axisPosition('pvtMedianMs', -10, 20)).toBeCloseTo(0.25);
    expect(axisPosition('pvtMedianMs', 10, 20)).toBeCloseTo(0.75);
    expect(axisPosition('calmScore', 10, 20)).toBeCloseTo(0.25);
    expect(axisPosition('calmScore', 0, 20)).toBe(0.5);
  });
});
