import {
  emptyContext,
  SLEEP_HOUR_OPTIONS,
  validateContext,
  type DailyContext,
} from '../context';

describe('emptyContext', () => {
  it('defaults to no sleep answer, no caffeine, phone', () => {
    expect(emptyContext()).toEqual({ sleepHours: null, caffeine: false, formFactor: 'phone', expectation: null });
  });
});

describe('SLEEP_HOUR_OPTIONS', () => {
  it('offers an ascending set of plausible buckets', () => {
    expect(SLEEP_HOUR_OPTIONS.length).toBeGreaterThan(0);
    const sorted = [...SLEEP_HOUR_OPTIONS].sort((a, b) => a - b);
    expect([...SLEEP_HOUR_OPTIONS]).toEqual(sorted);
    expect(SLEEP_HOUR_OPTIONS.every((h) => h >= 0 && h <= 24)).toBe(true);
  });
});

describe('validateContext', () => {
  const base: DailyContext = { sleepHours: 7, caffeine: true, formFactor: 'tablet' };

  it('accepts a fully answered context', () => {
    expect(validateContext(base)).toEqual({ valid: true, issues: [] });
  });

  it('accepts a null sleep answer (user declined)', () => {
    expect(validateContext({ ...base, sleepHours: null }).valid).toBe(true);
  });

  it('rejects a negative or non-finite sleep value', () => {
    expect(validateContext({ ...base, sleepHours: -1 }).issues).toContain('sleep_hours_invalid');
    expect(validateContext({ ...base, sleepHours: Number.NaN }).issues).toContain(
      'sleep_hours_invalid',
    );
  });

  it('rejects an impossible sleep value', () => {
    expect(validateContext({ ...base, sleepHours: 30 }).issues).toContain(
      'sleep_hours_out_of_range',
    );
  });

  it('rejects an invalid form factor', () => {
    const bad = { ...base, formFactor: 'watch' as unknown as DailyContext['formFactor'] };
    expect(validateContext(bad).issues).toContain('form_factor_invalid');
  });
});
