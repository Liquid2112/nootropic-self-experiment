/**
 * Apple Health via @kingstinct/react-native-healthkit. Read-only: Placebo
 * never writes to Health.
 *
 * Sleep values (HKCategoryValueSleepAnalysis): 0 in bed, 1 asleep (unspecified),
 * 2 awake, 3 core, 4 deep, 5 REM. Only 1, 3, 4, 5 count as asleep.
 */
import {
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import type { HealthAdapter } from './adapter';

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis' as const;
const RESTING_HR = 'HKQuantityTypeIdentifierRestingHeartRate' as const;
const HRV = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' as const;
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

export const nativeHealthAdapter: HealthAdapter = {
  source: 'healthkit',
  label: 'Apple Health',
  async available() {
    try {
      return await isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  },
  async requestAccess() {
    try {
      return await requestAuthorization({ toRead: [SLEEP, RESTING_HR, HRV] });
    } catch {
      return false;
    }
  },
  async read(fromMs, toMs) {
    const filter = { date: { startDate: new Date(fromMs), endDate: new Date(toMs) } };
    const [sleep, rhr, hrv] = await Promise.all([
      queryCategorySamples(SLEEP, { limit: 0, filter }),
      queryQuantitySamples(RESTING_HR, { limit: 0, filter, unit: 'count/min' }),
      queryQuantitySamples(HRV, { limit: 0, filter, unit: 'ms' }),
    ]);
    return {
      sleep: sleep.map((s) => ({
        startMs: new Date(s.startDate).getTime(),
        endMs: new Date(s.endDate).getTime(),
        asleep: ASLEEP_VALUES.has(Number(s.value)),
      })),
      restingHr: rhr.map((s) => ({ atMs: new Date(s.startDate).getTime(), value: s.quantity })),
      hrv: hrv.map((s) => ({ atMs: new Date(s.startDate).getTime(), value: s.quantity })),
    };
  },
};
