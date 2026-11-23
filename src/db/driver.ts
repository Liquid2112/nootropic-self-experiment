/**
 * Minimal synchronous SQLite driver interface.
 *
 * The data layer is written against this interface, not against any one SQLite
 * implementation, so the same schema, migrations, and repositories run against
 * expo-sqlite on device (see expoDriver.ts) and against an in-memory
 * better-sqlite3 database in unit tests (see __tests__). Keeping the surface
 * tiny is deliberate: every later feature imports the repositories, never a
 * raw driver.
 */

/** A value that can be bound to a SQL placeholder. */
export type SqlValue = string | number | null;

/** One row returned by a query, keyed by column name. */
export type SqlRow = Record<string, SqlValue>;

export interface SqlDriver {
  /** Run a statement with no result rows (DDL, INSERT, UPDATE, DELETE). */
  run(sql: string, params?: SqlValue[]): void;

  /** Run a query and return all matching rows. */
  all(sql: string, params?: SqlValue[]): SqlRow[];

  /** Run a query and return the first row, or undefined when none match. */
  get(sql: string, params?: SqlValue[]): SqlRow | undefined;
}
