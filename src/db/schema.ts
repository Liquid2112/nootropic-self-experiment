import type { SqlDriver } from './driver';

/**
 * Schema and migration runner.
 *
 * Migrations are an ordered list of (version, statements). The runner records
 * the applied version in user_version (SQLite's built-in per-database integer)
 * and applies only migrations newer than that, so re-running on an already
 * migrated database is a no-op. Later PRs add a new entry to MIGRATIONS with
 * the next version number rather than editing an existing one.
 */

export type Migration = {
  version: number;
  statements: string[];
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE supplement (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('acute', 'cumulative')),
        evidence_summary TEXT NOT NULL,
        evidence_links TEXT NOT NULL DEFAULT '[]',
        excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1))
      )`,
      `CREATE TABLE experiment (
        id TEXT PRIMARY KEY NOT NULL,
        supplement_id TEXT NOT NULL REFERENCES supplement(id),
        goal TEXT NOT NULL,
        primary_metric TEXT NOT NULL,
        design TEXT NOT NULL,
        blinding_mode TEXT NOT NULL CHECK (blinding_mode IN ('none', 'self_blind', 'sealed')),
        length_days INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'abandoned')),
        sealed_key TEXT
      )`,
      `CREATE TABLE schedule_day (
        experiment_id TEXT NOT NULL REFERENCES experiment(id),
        day_index INTEGER NOT NULL,
        date TEXT NOT NULL,
        arm TEXT NOT NULL CHECK (arm IN ('ON', 'OFF', 'A', 'B')),
        taken INTEGER NOT NULL DEFAULT 0 CHECK (taken IN (0, 1)),
        taken_at TEXT,
        PRIMARY KEY (experiment_id, day_index)
      )`,
      `CREATE TABLE test_session (
        id TEXT PRIMARY KEY NOT NULL,
        experiment_id TEXT NOT NULL REFERENCES experiment(id),
        day_index INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        device_model TEXT,
        pvt_median_ms REAL,
        pvt_lapses INTEGER,
        nback_accuracy REAL,
        nback_dprime REAL,
        focus INTEGER,
        energy INTEGER,
        mood INTEGER,
        sleep_hours REAL,
        caffeine INTEGER NOT NULL DEFAULT 0 CHECK (caffeine IN (0, 1)),
        note TEXT,
        valid INTEGER NOT NULL DEFAULT 1 CHECK (valid IN (0, 1))
      )`,
      `CREATE TABLE result (
        experiment_id TEXT NOT NULL REFERENCES experiment(id),
        metric TEXT NOT NULL,
        estimate REAL NOT NULL,
        ci_low REAL NOT NULL,
        ci_high REAL NOT NULL,
        effect_size REAL NOT NULL,
        verdict TEXT NOT NULL CHECK (verdict IN ('works', 'no_effect', 'inconclusive', 'harmful')),
        computed_at TEXT NOT NULL,
        PRIMARY KEY (experiment_id, metric)
      )`,
      `CREATE INDEX idx_schedule_day_experiment ON schedule_day (experiment_id)`,
      `CREATE INDEX idx_test_session_experiment ON test_session (experiment_id)`,
    ],
  },
  {
    // The schedule/blinding seed must survive past creation: a self-blinded run
    // derives its unseal passphrase from the seed, so the verdict screen needs
    // the exact seed used at seal time to recover the A/B -> ON/OFF mapping.
    // Older rows (created before this column existed) keep a NULL seed; the
    // verdict path treats a NULL self-blind seed as not-yet-unsealable, which is
    // the same honest "can't unblind" state as a missing passphrase.
    version: 2,
    statements: [`ALTER TABLE experiment ADD COLUMN seed TEXT`],
  },
];

/** Read the schema version recorded in the database. */
export function getSchemaVersion(db: SqlDriver): number {
  const row = db.get('PRAGMA user_version');
  const value = row ? row.user_version : 0;
  return typeof value === 'number' ? value : 0;
}

/**
 * Apply every migration newer than the database's recorded version, in order.
 * Returns the version the database is at after running. Idempotent.
 */
export function migrate(db: SqlDriver): number {
  db.run('PRAGMA foreign_keys = ON');
  let current = getSchemaVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version,
  );
  for (const migration of pending) {
    for (const statement of migration.statements) {
      db.run(statement);
    }
    // PRAGMA user_version does not accept bound parameters; the version is an
    // integer from our own constant list, never user input.
    db.run(`PRAGMA user_version = ${migration.version}`);
    current = migration.version;
  }
  return current;
}

/** The latest schema version defined by MIGRATIONS. */
export function latestSchemaVersion(): number {
  return MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0);
}
