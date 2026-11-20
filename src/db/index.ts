import { openDatabaseSync } from 'expo-sqlite';
import { createExpoDriver } from './expoDriver';
import type { SqlDriver } from './driver';
import { migrate } from './schema';
import { seedSupplements } from './seed';

/**
 * Single entry point for on-device data access. Later features import the
 * repositories and these helpers from "@/db", never a raw SQLite handle.
 */

export * from './types';
export * from './driver';
export {
  supplements,
  experiments,
  scheduleDays,
  testSessions,
  results,
} from './repositories';
export { MIGRATIONS, migrate, latestSchemaVersion, getSchemaVersion } from './schema';
export { SEED_SUPPLEMENTS, seedSupplements } from './seed';

const DATABASE_NAME = 'nootropic.db';

let cached: SqlDriver | null = null;

/**
 * Open the on-device database, run migrations, and seed the supplement list on
 * first launch. Cached so repeated calls reuse one connection.
 */
export function getDatabase(): SqlDriver {
  if (cached) {
    return cached;
  }
  const driver = createExpoDriver(openDatabaseSync(DATABASE_NAME));
  migrate(driver);
  seedSupplements(driver);
  cached = driver;
  return driver;
}
