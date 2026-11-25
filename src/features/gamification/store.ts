/**
 * Database bindings for the gamification engine: read recorded activity, and
 * remember the last snapshot the user saw so the app knows what to celebrate.
 */
// Import the repositories directly (not the `@/db` barrel) so this module stays
// loadable in Node tests without the native expo-sqlite module.
import type { SqlDriver } from '@/db/driver';
import { appState, experiments, quickTests, scheduleDays, testSessions } from '@/db/repositories';
import {
  computeGameState,
  diffSnapshots,
  localDay,
  localDayOfIso,
  snapshotOf,
  type ActivityInput,
  type GameState,
  type ProgressDelta,
  type Snapshot,
} from './engine';

const SNAPSHOT_KEY = 'game_snapshot_v1';

/** Gather every recorded action, reduced to local days. Never reads scores. */
export function loadActivity(db: SqlDriver): ActivityInput {
  return {
    checkInDays: testSessions.listAllStartedAt(db).map(localDayOfIso),
    doseDays: scheduleDays.listAllTaken(db).map((d) => (d.takenAt ? localDayOfIso(d.takenAt) : d.date)),
    quickTests: quickTests.listAll(db).map((q) => ({ day: localDayOfIso(q.takenAt), medianMs: q.medianMs })),
    finishedRuns: experiments.listByStatus(db, 'completed').length,
  };
}

/** The current game state, computed fresh from the database. */
export function loadGameState(db: SqlDriver, now: Date = new Date()): GameState {
  return computeGameState(loadActivity(db), localDay(now));
}

function readSnapshot(db: SqlDriver): Snapshot | undefined {
  const raw = appState.get(db, SNAPSHOT_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return {
      xp: Number(parsed.xp ?? 0),
      level: Number(parsed.level ?? 1),
      streak: Number(parsed.streak ?? 0),
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((b) => typeof b === 'string') : [],
    };
  } catch {
    return undefined;
  }
}

function writeSnapshot(db: SqlDriver, snapshot: Snapshot): void {
  appState.set(db, SNAPSHOT_KEY, JSON.stringify(snapshot));
}

/**
 * Record the current state as "seen" without celebrating, but only if nothing
 * was recorded yet. Called when the home screen opens so a returning user
 * isn't hit with a wall of badges for progress made before this feature.
 */
export function ensureSnapshot(db: SqlDriver, now: Date = new Date()): void {
  if (!readSnapshot(db)) {
    writeSnapshot(db, snapshotOf(loadGameState(db, now)));
  }
}

/**
 * What's new since the user last saw their progress, then mark it seen. Call
 * right after an action (dose, check-in, reaction test) to drive the
 * celebration for that action.
 */
export function claimProgress(db: SqlDriver, now: Date = new Date()): { game: GameState; delta: ProgressDelta } {
  const game = loadGameState(db, now);
  const next = snapshotOf(game);
  const previous = readSnapshot(db) ?? { xp: 0, level: 1, streak: 0, badges: [] };
  writeSnapshot(db, next);
  for (const listener of claimListeners) {
    try {
      listener();
    } catch {
      // A listener (the widget refresh) must never break the action itself.
    }
  }
  return { game, delta: diffSnapshots(previous, next) };
}

const claimListeners = new Set<() => void>();

/**
 * Run `listener` after every recorded action (dose, check-in, reaction test).
 * The home-screen widget uses it to refresh without each screen knowing about
 * widgets. Returns an unsubscribe function.
 */
export function onProgressClaimed(listener: () => void): () => void {
  claimListeners.add(listener);
  return () => {
    claimListeners.delete(listener);
  };
}
