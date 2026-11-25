import type { SqlDriver, SqlRow, SqlValue } from './driver';
import type {
  Experiment,
  QuickTest,
  Result,
  ScheduleDay,
  Supplement,
  TestSession,
} from './types';

/**
 * Typed repositories (DAOs) for each table. They convert between the stored
 * row shape (booleans as 0/1, JSON arrays as TEXT) and the domain types in
 * types.ts, so callers only ever deal in domain types. All queries are
 * parameterized.
 */

function toBool(value: SqlValue | undefined): boolean {
  return value === 1 || value === '1';
}

function toInt(value: SqlValue | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

function toText(value: SqlValue | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function requireText(value: SqlValue | undefined, column: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected text for column "${column}", got ${String(value)}`);
  }
  return value;
}

function requireNumber(value: SqlValue | undefined, column: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Expected number for column "${column}", got ${String(value)}`);
  }
  return value;
}

function parseLinks(value: SqlValue | undefined): string[] {
  if (typeof value !== 'string' || value.length === 0) {
    return [];
  }
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error('evidence_links is not a JSON array of strings');
  }
  return parsed;
}

// --- supplement ------------------------------------------------------------

function rowToSupplement(row: SqlRow): Supplement {
  const type = requireText(row.type, 'type');
  if (type !== 'acute' && type !== 'cumulative') {
    throw new Error(`Invalid supplement type: ${type}`);
  }
  return {
    id: requireText(row.id, 'id'),
    name: requireText(row.name, 'name'),
    type,
    evidenceSummary: requireText(row.evidence_summary, 'evidence_summary'),
    evidenceLinks: parseLinks(row.evidence_links),
    excluded: toBool(row.excluded),
  };
}

export const supplements = {
  insert(db: SqlDriver, s: Supplement): void {
    db.run(
      `INSERT INTO supplement (id, name, type, evidence_summary, evidence_links, excluded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.type, s.evidenceSummary, JSON.stringify(s.evidenceLinks), s.excluded ? 1 : 0],
    );
  },
  getById(db: SqlDriver, id: string): Supplement | undefined {
    const row = db.get('SELECT * FROM supplement WHERE id = ?', [id]);
    return row ? rowToSupplement(row) : undefined;
  },
  list(db: SqlDriver, includeExcluded = false): Supplement[] {
    const sql = includeExcluded
      ? 'SELECT * FROM supplement ORDER BY name'
      : 'SELECT * FROM supplement WHERE excluded = 0 ORDER BY name';
    return db.all(sql).map(rowToSupplement);
  },
  count(db: SqlDriver): number {
    const row = db.get('SELECT COUNT(*) AS n FROM supplement');
    return requireNumber(row?.n, 'n');
  },
};

// --- experiment ------------------------------------------------------------

function rowToExperiment(row: SqlRow): Experiment {
  const blindingMode = requireText(row.blinding_mode, 'blinding_mode');
  if (blindingMode !== 'none' && blindingMode !== 'self_blind' && blindingMode !== 'sealed') {
    throw new Error(`Invalid blinding_mode: ${blindingMode}`);
  }
  const status = requireText(row.status, 'status');
  if (
    status !== 'draft' &&
    status !== 'active' &&
    status !== 'completed' &&
    status !== 'abandoned'
  ) {
    throw new Error(`Invalid experiment status: ${status}`);
  }
  return {
    id: requireText(row.id, 'id'),
    supplementId: requireText(row.supplement_id, 'supplement_id'),
    goal: requireText(row.goal, 'goal'),
    primaryMetric: requireText(row.primary_metric, 'primary_metric'),
    design: requireText(row.design, 'design'),
    blindingMode,
    lengthDays: requireNumber(row.length_days, 'length_days'),
    startDate: requireText(row.start_date, 'start_date'),
    status,
    sealedKey: toText(row.sealed_key),
    seed: toText(row.seed),
  };
}

export const experiments = {
  insert(db: SqlDriver, e: Experiment): void {
    db.run(
      `INSERT INTO experiment
        (id, supplement_id, goal, primary_metric, design, blinding_mode, length_days, start_date, status, sealed_key, seed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        e.supplementId,
        e.goal,
        e.primaryMetric,
        e.design,
        e.blindingMode,
        e.lengthDays,
        e.startDate,
        e.status,
        e.sealedKey,
        e.seed,
      ],
    );
  },
  getById(db: SqlDriver, id: string): Experiment | undefined {
    const row = db.get('SELECT * FROM experiment WHERE id = ?', [id]);
    return row ? rowToExperiment(row) : undefined;
  },
  listByStatus(db: SqlDriver, status: Experiment['status']): Experiment[] {
    return db
      .all('SELECT * FROM experiment WHERE status = ? ORDER BY start_date DESC', [status])
      .map(rowToExperiment);
  },
  setStatus(db: SqlDriver, id: string, status: Experiment['status']): void {
    db.run('UPDATE experiment SET status = ? WHERE id = ?', [status, id]);
  },
};

// --- schedule_day ----------------------------------------------------------

function rowToScheduleDay(row: SqlRow): ScheduleDay {
  const arm = requireText(row.arm, 'arm');
  if (arm !== 'ON' && arm !== 'OFF' && arm !== 'A' && arm !== 'B') {
    throw new Error(`Invalid schedule arm: ${arm}`);
  }
  return {
    experimentId: requireText(row.experiment_id, 'experiment_id'),
    dayIndex: requireNumber(row.day_index, 'day_index'),
    date: requireText(row.date, 'date'),
    arm,
    taken: toBool(row.taken),
    takenAt: toText(row.taken_at),
  };
}

export const scheduleDays = {
  insert(db: SqlDriver, d: ScheduleDay): void {
    db.run(
      `INSERT INTO schedule_day (experiment_id, day_index, date, arm, taken, taken_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.experimentId, d.dayIndex, d.date, d.arm, d.taken ? 1 : 0, d.takenAt],
    );
  },
  listForExperiment(db: SqlDriver, experimentId: string): ScheduleDay[] {
    return db
      .all('SELECT * FROM schedule_day WHERE experiment_id = ? ORDER BY day_index', [experimentId])
      .map(rowToScheduleDay);
  },
  markTaken(db: SqlDriver, experimentId: string, dayIndex: number, takenAt: string): void {
    db.run(
      'UPDATE schedule_day SET taken = 1, taken_at = ? WHERE experiment_id = ? AND day_index = ?',
      [takenAt, experimentId, dayIndex],
    );
  },
};

// --- test_session ----------------------------------------------------------

function rowToTestSession(row: SqlRow): TestSession {
  return {
    id: requireText(row.id, 'id'),
    experimentId: requireText(row.experiment_id, 'experiment_id'),
    dayIndex: requireNumber(row.day_index, 'day_index'),
    startedAt: requireText(row.started_at, 'started_at'),
    deviceModel: toText(row.device_model),
    pvtMedianMs: toInt(row.pvt_median_ms),
    pvtLapses: toInt(row.pvt_lapses),
    nbackAccuracy: toInt(row.nback_accuracy),
    nbackDprime: toInt(row.nback_dprime),
    focus: toInt(row.focus),
    energy: toInt(row.energy),
    mood: toInt(row.mood),
    sleepHours: toInt(row.sleep_hours),
    caffeine: toBool(row.caffeine),
    note: toText(row.note),
    valid: toBool(row.valid),
  };
}

export const testSessions = {
  insert(db: SqlDriver, t: TestSession): void {
    db.run(
      `INSERT INTO test_session
        (id, experiment_id, day_index, started_at, device_model, pvt_median_ms, pvt_lapses,
         nback_accuracy, nback_dprime, focus, energy, mood, sleep_hours, caffeine, note, valid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.experimentId,
        t.dayIndex,
        t.startedAt,
        t.deviceModel,
        t.pvtMedianMs,
        t.pvtLapses,
        t.nbackAccuracy,
        t.nbackDprime,
        t.focus,
        t.energy,
        t.mood,
        t.sleepHours,
        t.caffeine ? 1 : 0,
        t.note,
        t.valid ? 1 : 0,
      ],
    );
  },
  getById(db: SqlDriver, id: string): TestSession | undefined {
    const row = db.get('SELECT * FROM test_session WHERE id = ?', [id]);
    return row ? rowToTestSession(row) : undefined;
  },
  listForExperiment(db: SqlDriver, experimentId: string): TestSession[] {
    return db
      .all('SELECT * FROM test_session WHERE experiment_id = ? ORDER BY day_index', [experimentId])
      .map(rowToTestSession);
  },
};

// --- result ----------------------------------------------------------------

function rowToResult(row: SqlRow): Result {
  const verdict = requireText(row.verdict, 'verdict');
  if (
    verdict !== 'works' &&
    verdict !== 'no_effect' &&
    verdict !== 'inconclusive' &&
    verdict !== 'harmful'
  ) {
    throw new Error(`Invalid verdict: ${verdict}`);
  }
  return {
    experimentId: requireText(row.experiment_id, 'experiment_id'),
    metric: requireText(row.metric, 'metric'),
    estimate: requireNumber(row.estimate, 'estimate'),
    ciLow: requireNumber(row.ci_low, 'ci_low'),
    ciHigh: requireNumber(row.ci_high, 'ci_high'),
    effectSize: requireNumber(row.effect_size, 'effect_size'),
    verdict,
    computedAt: requireText(row.computed_at, 'computed_at'),
  };
}

export const results = {
  upsert(db: SqlDriver, r: Result): void {
    db.run(
      `INSERT INTO result
        (experiment_id, metric, estimate, ci_low, ci_high, effect_size, verdict, computed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (experiment_id, metric) DO UPDATE SET
         estimate = excluded.estimate,
         ci_low = excluded.ci_low,
         ci_high = excluded.ci_high,
         effect_size = excluded.effect_size,
         verdict = excluded.verdict,
         computed_at = excluded.computed_at`,
      [r.experimentId, r.metric, r.estimate, r.ciLow, r.ciHigh, r.effectSize, r.verdict, r.computedAt],
    );
  },
  listForExperiment(db: SqlDriver, experimentId: string): Result[] {
    return db
      .all('SELECT * FROM result WHERE experiment_id = ? ORDER BY metric', [experimentId])
      .map(rowToResult);
  },
};

// --- quick_test ------------------------------------------------------------

function rowToQuickTest(row: SqlRow): QuickTest {
  return {
    id: requireText(row.id, 'id'),
    takenAt: requireText(row.taken_at, 'taken_at'),
    medianMs: requireNumber(row.median_ms, 'median_ms'),
    lapses: requireNumber(row.lapses, 'lapses'),
    trials: requireNumber(row.trials, 'trials'),
  };
}

export const quickTests = {
  insert(db: SqlDriver, q: QuickTest): void {
    db.run(
      'INSERT INTO quick_test (id, taken_at, median_ms, lapses, trials) VALUES (?, ?, ?, ?, ?)',
      [q.id, q.takenAt, q.medianMs, q.lapses, q.trials],
    );
  },
  /** Most recent first. */
  listRecent(db: SqlDriver, limit = 10): QuickTest[] {
    return db
      .all('SELECT * FROM quick_test ORDER BY taken_at DESC LIMIT ?', [limit])
      .map(rowToQuickTest);
  },
  /** Fastest median ever recorded, or undefined before the first run. */
  best(db: SqlDriver): QuickTest | undefined {
    const row = db.get('SELECT * FROM quick_test ORDER BY median_ms ASC LIMIT 1');
    return row ? rowToQuickTest(row) : undefined;
  },
};
