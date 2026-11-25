/**
 * Health Connect via react-native-health-connect. Read-only.
 *
 * Sleep stages: 1 awake, 3 out of bed and 7 awake in bed are not sleep; every
 * other stage counts. A session with no stages counts as asleep throughout.
 * Health Connect stores RMSSD for HRV (Apple stores SDNN). The two aren't
 * interchangeable, but a run only ever compares a user against themselves on
 * one platform, so the ON-vs-OFF difference is still valid.
 */
import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { HealthAdapter } from './adapter';
import type { SleepInterval } from './model';

const AWAKE_STAGES = new Set([1, 3, 7]);

async function ready(): Promise<boolean> {
  try {
    const status = await getSdkStatus();
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
    return await initialize();
  } catch {
    return false;
  }
}

export const nativeHealthAdapter: HealthAdapter = {
  source: 'health_connect',
  label: 'Health Connect',
  available: ready,
  async requestAccess() {
    if (!(await ready())) return false;
    try {
      const granted = await requestPermission([
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      ]);
      return granted.length > 0;
    } catch {
      return false;
    }
  },
  async read(fromMs, toMs) {
    if (!(await ready())) return { sleep: [], restingHr: [], hrv: [] };
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: new Date(fromMs).toISOString(),
      endTime: new Date(toMs).toISOString(),
    };
    const safe = async <T,>(p: Promise<{ records: T[] }>): Promise<T[]> => {
      try {
        return (await p).records;
      } catch {
        return []; // permission for this type not granted
      }
    };
    const [sessions, rhr, hrv] = await Promise.all([
      safe(readRecords('SleepSession', { timeRangeFilter })),
      safe(readRecords('RestingHeartRate', { timeRangeFilter })),
      safe(readRecords('HeartRateVariabilityRmssd', { timeRangeFilter })),
    ]);
    const sleep: SleepInterval[] = [];
    for (const s of sessions) {
      if (s.stages && s.stages.length > 0) {
        for (const st of s.stages) {
          sleep.push({
            startMs: Date.parse(st.startTime),
            endMs: Date.parse(st.endTime),
            asleep: !AWAKE_STAGES.has(st.stage),
          });
        }
      } else {
        sleep.push({ startMs: Date.parse(s.startTime), endMs: Date.parse(s.endTime), asleep: true });
      }
    }
    return {
      sleep,
      restingHr: rhr.map((r) => ({ atMs: Date.parse(r.time), value: r.beatsPerMinute })),
      hrv: hrv.map((r) => ({ atMs: Date.parse(r.time), value: r.heartRateVariabilityMillis })),
    };
  },
};
