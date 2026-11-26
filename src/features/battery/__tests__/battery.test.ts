import { GOALS } from '@/engines/onboarding';
import { METRICS, selectPrimaryMetric } from '@/engines/stats';
import {
  batteryOf,
  canRemove,
  checkInSteps,
  DEFAULT_BATTERY,
  estimateMinutes,
  LEGACY_BATTERY,
  metricsForBattery,
  normalizeBattery,
  REQUIRED_TEST,
  TEST_CATALOG,
  TEST_IDS,
  toggleTest,
  validateBattery,
} from '..';

describe('battery defaults', () => {
  it('starts every goal with a valid battery of about two minutes', () => {
    for (const goal of GOALS) {
      const tests = DEFAULT_BATTERY[goal];
      expect(validateBattery(goal, tests)).toBeNull();
      expect(estimateMinutes(tests)).toBeLessThanOrEqual(2);
      expect(tests.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("judges each goal on a metric its own battery measures", () => {
    for (const goal of GOALS) {
      const available = metricsForBattery(DEFAULT_BATTERY[goal]);
      const { primary } = selectPrimaryMetric(goal, available);
      expect(available).toContain(primary);
      expect(TEST_CATALOG[REQUIRED_TEST[goal]].metrics.concat(['energy'])).toContain(primary);
    }
  });

  it('gives every catalog metric a spec', () => {
    for (const id of TEST_IDS) for (const m of TEST_CATALOG[id].metrics) expect(METRICS[m]).toBeDefined();
  });
});

describe('picking tests', () => {
  it('keeps the goal test on and never drops below two tests', () => {
    expect(toggleTest('focus', ['pvt', 'stroop'], 'pvt')).toEqual(['pvt', 'stroop']);
    expect(toggleTest('focus', ['pvt', 'stroop'], 'stroop')).toEqual(['pvt', 'stroop']);
    expect(toggleTest('focus', ['pvt', 'stroop', 'calm'], 'stroop')).toEqual(['pvt', 'calm']);
    expect(toggleTest('focus', ['pvt', 'stroop'], 'recall')).toEqual(['pvt', 'stroop', 'recall']);
    expect(canRemove('calm', ['calm', 'pvt', 'stroop'], 'calm')).toBe(false);
    expect(canRemove('calm', ['calm', 'pvt', 'stroop'], 'pvt')).toBe(true);
  });

  it('flags a battery missing the goal test', () => {
    expect(validateBattery('memory', ['pvt', 'stroop'])).toMatch(/2-back/);
    expect(validateBattery('memory', ['nback'])).toMatch(/at least/);
  });

  it('falls back to the original pair for older runs', () => {
    expect(batteryOf({ battery: null })).toEqual(LEGACY_BATTERY);
    expect(batteryOf({})).toEqual(LEGACY_BATTERY);
    expect(batteryOf({ battery: ['calm', 'bogus', 'pvt', 'pvt'] })).toEqual(['pvt', 'calm']);
    expect(normalizeBattery(['recall', 'nback'])).toEqual(['nback', 'recall']);
  });
});

describe('check-in order', () => {
  it('runs the calm check first, studies words early and tests them last', () => {
    expect(checkInSteps(['pvt', 'nback', 'recall', 'calm'])).toEqual([
      'calm',
      'recall_study',
      'pvt',
      'nback',
      'recall_test',
      'ratings',
    ]);
    expect(checkInSteps(LEGACY_BATTERY)).toEqual(['pvt', 'nback', 'ratings']);
  });
});
