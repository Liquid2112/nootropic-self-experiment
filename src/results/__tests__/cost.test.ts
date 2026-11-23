import { formatDollars, monthlyCostCents, monthlyCostLine } from '../cost';

describe('monthly cost', () => {
  it('projects per-dose cost over ON-day cadence onto a 30.4-day month', () => {
    // 50c/dose, 12 ON days of 24 -> 25c/day -> 25 * 30.4 = 760c = $7.60
    expect(monthlyCostCents({ centsPerDose: 50, onDays: 12, lengthDays: 24 })).toBe(760);
    expect(monthlyCostLine({ centsPerDose: 50, onDays: 12, lengthDays: 24 })).toBe('$7.60/month');
  });

  it('returns null for missing or non-positive inputs', () => {
    expect(monthlyCostCents(null)).toBeNull();
    expect(monthlyCostCents(undefined)).toBeNull();
    expect(monthlyCostCents({ centsPerDose: 0, onDays: 12, lengthDays: 24 })).toBeNull();
    expect(monthlyCostCents({ centsPerDose: 50, onDays: 0, lengthDays: 24 })).toBeNull();
    expect(monthlyCostLine(null)).toBeNull();
  });

  it('formats whole dollars without cents and fractional with two decimals', () => {
    expect(formatDollars(1200)).toBe('$12');
    expect(formatDollars(1299)).toBe('$12.99');
    expect(formatDollars(760)).toBe('$7.60');
  });
});
