/**
 * The tracker behind `track` / `trackOnce`, built from injected dependencies so
 * it's unit tested without React Native or expo-sqlite. See ./index.ts for the
 * app wiring.
 */
import type { SqlDriver } from '@/db/driver';
import { appState } from '@/db/repositories';
import { createClient, type AnalyticsClient, type Transport } from './client';
import type { AnalyticsEvent, EventProps } from './events';

const ANON_ID_KEY = 'analytics_anon_id';
const OPT_OUT_KEY = 'analytics_opt_out';
const ONCE_PREFIX = 'analytics_once:';

/** A random install id. Not tied to the Apple/Google account or the device. */
export function anonymousId(db: SqlDriver, rand: () => number = Math.random): string {
  const existing = appState.get(db, ANON_ID_KEY);
  if (existing) return existing;
  let id = 'anon_';
  for (let i = 0; i < 20; i += 1) id += Math.floor(rand() * 36).toString(36);
  appState.set(db, ANON_ID_KEY, id);
  return id;
}

export function analyticsOptedOut(db: SqlDriver): boolean {
  return appState.get(db, OPT_OUT_KEY) === '1';
}

export function setAnalyticsOptOut(db: SqlDriver, optOut: boolean): void {
  appState.set(db, OPT_OUT_KEY, optOut ? '1' : '0');
}

/**
 * Claim a one-time key (per install). True the first time only, so an event
 * like "baseline done for run X" or "active on 2026-12-03" is sent once even
 * when a screen re-renders.
 */
export function claimOnce(db: SqlDriver, key: string): boolean {
  const k = ONCE_PREFIX + key;
  if (appState.get(db, k) !== undefined) return false;
  appState.set(db, k, '1');
  return true;
}

export type TrackerDeps = {
  /** The database, or null when it isn't available. */
  getDb: () => SqlDriver | null;
  config: () => { apiKey: string; host: string };
  platform: string;
  transport?: Transport;
};

export type Tracker = {
  track(event: AnalyticsEvent, props?: EventProps): void;
  trackOnce(onceKey: string, event: AnalyticsEvent, props?: EventProps): void;
  flush(): Promise<void>;
};

export function createTracker(deps: TrackerDeps): Tracker {
  let client: AnalyticsClient | null = null;

  /** The client, or null when analytics is off (no key, opted out, no db). */
  function ready(): { db: SqlDriver; client: AnalyticsClient } | null {
    const db = deps.getDb();
    if (!db) return null;
    const { apiKey, host } = deps.config();
    if (!apiKey || analyticsOptedOut(db)) return null;
    client ??= createClient({
      apiKey,
      host,
      distinctId: anonymousId(db),
      platform: deps.platform,
      transport: deps.transport,
    });
    return { db, client };
  }

  return {
    track(event, props) {
      try {
        ready()?.client.capture(event, props);
      } catch {
        // Analytics must never break a screen.
      }
    },
    trackOnce(onceKey, event, props) {
      try {
        const r = ready();
        if (r && claimOnce(r.db, onceKey)) r.client.capture(event, props);
      } catch {
        // ignore
      }
    },
    async flush() {
      await client?.flush();
    },
  };
}
