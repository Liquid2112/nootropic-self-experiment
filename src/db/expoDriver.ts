import type { SQLiteDatabase } from 'expo-sqlite';
import type { SqlDriver, SqlRow, SqlValue } from './driver';

/**
 * Adapts an expo-sqlite database to the SqlDriver interface used by the data
 * layer. expo-sqlite exposes synchronous *Sync methods, which lets the whole
 * layer stay synchronous and share one code path with the in-memory test
 * driver.
 */
export function createExpoDriver(database: SQLiteDatabase): SqlDriver {
  return {
    run(sql: string, params: SqlValue[] = []): void {
      database.runSync(sql, params);
    },
    all(sql: string, params: SqlValue[] = []): SqlRow[] {
      return database.getAllSync<SqlRow>(sql, params);
    },
    get(sql: string, params: SqlValue[] = []): SqlRow | undefined {
      return database.getFirstSync<SqlRow>(sql, params) ?? undefined;
    },
  };
}
