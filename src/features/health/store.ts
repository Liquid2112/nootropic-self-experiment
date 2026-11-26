/**
 * Database side of Health sync: remember that the user connected, lock the
 * primary metric in when that happens before day 1, and pull nightly values.
 */
import type { SqlDriver } from '@/db/driver';
import { appState, experiments, healthNights } from '@/db/repositories';
import type { Experiment } from '@/db/types';
import { BASELINE_DAYS, addDays } from '@/engines/experiment';
import type { HealthAdapter } from './adapter';
import { healthPrimaryFor, localClock, summarizeNights, type Clock } from './model';

const CONNECTED_KEY = 'health_connected_v1';

export type HealthConnection = { source: string; connectedAt: string };

export function healthConnection(db: SqlDriver): HealthConnection | null {
  const raw = appState.get(db, CONNECTED_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HealthConnection>;
    return typeof parsed.source === 'string' && typeof parsed.connectedAt === 'string'
      ? { source: parsed.source, connectedAt: parsed.connectedAt }
      : null;
  } catch {
    return null;
  }
}

/** First night worth reading for a run: the night before the baseline starts. */
function syncFrom(experiment: Experiment | undefined, today: string): string {
  if (!experiment) return addDays(today, -14);
  return addDays(experiment.startDate, -BASELINE_DAYS);
}

export type SyncHealthResult = { nights: number };

/** Pull and store nightly values. A no-op until the user has connected. */
export async function syncHealth(
  db: SqlDriver,
  adapter: HealthAdapter,
  now: Date = new Date(),
  clock: Clock = localClock,
): Promise<SyncHealthResult> {
  if (!healthConnection(db) || !(await adapter.available())) return { nights: 0 };
  const today = clock.dayOf(now.getTime());
  const experiment = experiments.listByStatus(db, 'active')[0];
  const from = syncFrom(experiment, today);
  // The latest night we can judge ends today; a run's last night ends the day
  // after its last scheduled day, so keep syncing up to then.
  const raw = await adapter.read(clock.dayStart(from) - 10 * 3_600_000, now.getTime());
  const nights = summarizeNights(raw, from, today, adapter.source, now.toISOString(), clock);
  for (const n of nights) healthNights.upsert(db, n);
  return { nights: new Set(nights.map((n) => n.date)).size };
}

export type ConnectHealthResult = {
  connected: boolean;
  /** The Health metric now locked in as this run's primary outcome, if it changed. */
  primaryMetric: string | null;
  nights: number;
};

/**
 * Ask for read access, remember the connection, pre-register the Health primary
 * metric when the run hasn't started yet, then do a first sync.
 */
export async function connectHealth(
  db: SqlDriver,
  adapter: HealthAdapter,
  now: Date = new Date(),
  clock: Clock = localClock,
): Promise<ConnectHealthResult> {
  if (!(await adapter.available()) || !(await adapter.requestAccess())) {
    return { connected: false, primaryMetric: null, nights: 0 };
  }
  appState.set(db, CONNECTED_KEY, JSON.stringify({ source: adapter.source, connectedAt: now.toISOString() }));
  const today = clock.dayOf(now.getTime());
  const experiment = experiments.listByStatus(db, 'active')[0];
  let primaryMetric: string | null = null;
  if (experiment) {
    primaryMetric = healthPrimaryFor(experiment, today);
    if (primaryMetric) experiments.setPrimaryMetric(db, experiment.id, primaryMetric);
  }
  const { nights } = await syncHealth(db, adapter, now, clock);
  return { connected: true, primaryMetric, nights };
}

/**
 * How many nights of this run have Health data so far, out of how many have
 * passed. Counts only: the values themselves stay out of sight until the
 * verdict, so nothing on screen invites guessing which days were active.
 */
export function healthCoverage(
  db: SqlDriver,
  experiment: Pick<Experiment, 'startDate' | 'lengthDays'>,
  today: string,
): { synced: number; expected: number } {
  const first = addDays(experiment.startDate, 1 - BASELINE_DAYS);
  const lastNight = addDays(experiment.startDate, experiment.lengthDays);
  const to = today < lastNight ? today : lastNight;
  if (to < first) return { synced: 0, expected: 0 };
  let expected = 0;
  for (let d = first; d <= to; d = addDays(d, 1)) expected += 1;
  return { synced: healthNights.countNights(db, first, to), expected };
}

/** Display name for a connected Health source. */
export function healthSourceLabel(source: string): string {
  return source === 'health_connect' ? 'Health Connect' : 'Apple Health';
}

/**
 * Whether last night's sleep (the night ending on `today`) already synced from
 * Health, so the check-in can skip asking. Returns the source's display name,
 * never the hours: values stay hidden until the verdict, same as the coverage
 * counter, so the check-in can't nudge anyone into guessing their arm.
 */
export function measuredSleepSource(db: SqlDriver, today: string): string | null {
  const connection = healthConnection(db);
  if (!connection) return null;
  const synced = healthNights.listBetween(db, today, today).some((n) => n.metric === 'sleep_hours');
  return synced ? healthSourceLabel(connection.source) : null;
}
