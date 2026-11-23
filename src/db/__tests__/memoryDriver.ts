import Database from 'better-sqlite3';
import type { SqlDriver, SqlRow, SqlValue } from '../driver';

/**
 * In-memory SqlDriver backed by better-sqlite3, used only by unit tests. It
 * lets the real schema, migrations, and repositories run under plain Jest in
 * Node without the native expo-sqlite module or a React Native runtime.
 */
export function createMemoryDriver(): SqlDriver {
  const database = new Database(':memory:');
  return {
    run(sql: string, params: SqlValue[] = []): void {
      database.prepare(sql).run(...params);
    },
    all(sql: string, params: SqlValue[] = []): SqlRow[] {
      const statement = database.prepare(sql);
      // PRAGMA and DDL statements are not columnar; guard before reading rows.
      if (!statement.reader) {
        statement.run(...params);
        return [];
      }
      return statement.all(...params) as SqlRow[];
    },
    get(sql: string, params: SqlValue[] = []): SqlRow | undefined {
      const statement = database.prepare(sql);
      if (!statement.reader) {
        statement.run(...params);
        return undefined;
      }
      return statement.get(...params) as SqlRow | undefined;
    },
  };
}
