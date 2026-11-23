import {
  TEST_WINDOWS,
  designForSupplementType,
  goalLabel,
  primaryMetricForGoal,
  testWindowById,
} from '../derive';
import { GOALS } from '../types';

describe('primaryMetricForGoal', () => {
  it('maps each goal to a distinct test_session metric column', () => {
    const metrics = GOALS.map(primaryMetricForGoal);
    expect(metrics).toEqual(['pvt_median_ms', 'nback_dprime', 'mood', 'sleep_hours']);
    // All distinct so each goal is judged on its own column.
    expect(new Set(metrics).size).toBe(GOALS.length);
  });
});

describe('goalLabel', () => {
  it('gives a human label for every goal', () => {
    for (const goal of GOALS) {
      expect(goalLabel(goal).length).toBeGreaterThan(0);
    }
  });
});

describe('designForSupplementType', () => {
  it('uses the supplement type as the design', () => {
    expect(designForSupplementType('acute')).toBe('acute');
    expect(designForSupplementType('cumulative')).toBe('cumulative');
  });
});

describe('TEST_WINDOWS', () => {
  it('is chronological and non-overlapping across the day', () => {
    for (let i = 1; i < TEST_WINDOWS.length; i += 1) {
      const prev = TEST_WINDOWS[i - 1];
      const curr = TEST_WINDOWS[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      expect(curr!.startHour).toBeGreaterThanOrEqual(prev!.endHour);
      expect(curr!.endHour).toBeGreaterThan(curr!.startHour);
    }
  });

  it('resolves a window by id and rejects an unknown one', () => {
    expect(testWindowById('morning').label).toBe('Morning');
    // @ts-expect-error unknown id is a type error and a runtime throw
    expect(() => testWindowById('never')).toThrow();
  });
});
