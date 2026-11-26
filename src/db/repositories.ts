import type { SqlDriver, SqlRow, SqlValue } from './driver';
import type {
  AdverseEvent,
  Experiment,
  HealthNight,
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

function parseStringList(value: SqlValue | undefined): string[] | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : null;
  } catch {
    return null;
  }
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
    battery: parseStringList(row.battery),
  };
}

export const experiments = {
  insert(db: SqlDriver, e: Experiment): void {
    db.run(
      `INSERT INTO experiment
        (id, supplement_id, goal, primary_metric, design, blinding_mode, length_days, start_date, status, sealed_key, seed, battery)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        e.battery && e.battery.length > 0 ? JSON.stringify(e.battery) : null,
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
  setPrimaryMetric(db: SqlDriver, id: string, primaryMetric: string): void {
    db.run('UPDATE experiment SET primary_metric = ? WHERE id = ?', [primaryMetric, id]);
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
  /** Every dose marked taken, across all experiments (for streaks / XP). */
  listAllTaken(db: SqlDriver): ScheduleDay[] {
    return db
      .all('SELECT * FROM schedule_day WHERE taken = 1 ORDER BY date')
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
    stroopInterferenceMs: toInt(row.stroop_interference_ms),
    stroopAccuracy: toInt(row.stroop_accuracy),
    symbolPerMin: toInt(row.symbol_per_min),
    recallScore: toInt(row.recall_score),
    calmScore: toInt(row.calm_score),
    note: toText(row.note),
    valid: toBool(row.valid),
  };
}

export const testSessions = {
  insert(db: SqlDriver, t: TestSession): void {
    db.run(
      `INSERT INTO test_session
        (id, experiment_id, day_index, started_at, device_model, pvt_median_ms, pvt_lapses,
         nback_accuracy, nback_dprime, focus, energy, mood, sleep_hours, caffeine, note, valid,
         stroop_interference_ms, stroop_accuracy, symbol_per_min, recall_score, calm_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        t.stroopInterferenceMs ?? null,
        t.stroopAccuracy ?? null,
        t.symbolPerMin ?? null,
        t.recallScore ?? null,
        t.calmScore ?? null,
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
  /**
   * When each check-in happened, across all experiments. Deliberately returns
   * only timestamps: gamification needs to know a check-in was done, never its
   * scores, so nothing here can leak a result during a blinded run.
   */
  listAllStartedAt(db: SqlDriver): string[] {
    return db
      .all('SELECT started_at FROM test_session ORDER BY started_at')
      .map((row) => requireText(row.started_at, 'started_at'));
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
  /** Every run, oldest first (for streaks / XP / badges). */
  listAll(db: SqlDriver): QuickTest[] {
    return db.all('SELECT * FROM quick_test ORDER BY taken_at').map(rowToQuickTest);
  },
  /** Fastest median ever recorded, or undefined before the first run. */
  best(db: SqlDriver): QuickTest | undefined {
    const row = db.get('SELECT * FROM quick_test ORDER BY median_ms ASC LIMIT 1');
    return row ? rowToQuickTest(row) : undefined;
  },
};

// --- app_state -------------------------------------------------------------

export const appState = {
  get(db: SqlDriver, key: string): string | undefined {
    const row = db.get('SELECT value FROM app_state WHERE key = ?', [key]);
    return row ? requireText(row.value, 'value') : undefined;
  },
  set(db: SqlDriver, key: string, value: string): void {
    db.run(
      `INSERT INTO app_state (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  },
};

// --- health_night ----------------------------------------------------------

function rowToHealthNight(row: SqlRow): HealthNight {
  const metric = requireText(row.metric, 'metric');
  if (metric !== 'sleep_hours' && metric !== 'resting_hr' && metric !== 'hrv_ms') {
    throw new Error(`Invalid health metric: ${metric}`);
  }
  return {
    date: requireText(row.date, 'date'),
    metric,
    value: requireNumber(row.value, 'value'),
    source: requireText(row.source, 'source'),
    syncedAt: requireText(row.synced_at, 'synced_at'),
  };
}

export const healthNights = {
  upsert(db: SqlDriver, n: HealthNight): void {
    db.run(
      `INSERT INTO health_night (date, metric, value, source, synced_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (date, metric) DO UPDATE SET
         value = excluded.value, source = excluded.source, synced_at = excluded.synced_at`,
      [n.date, n.metric, n.value, n.source, n.syncedAt],
    );
  },
  listBetween(db: SqlDriver, fromDate: string, toDate: string): HealthNight[] {
    return db
      .all('SELECT * FROM health_night WHERE date >= ? AND date <= ? ORDER BY date, metric', [fromDate, toDate])
      .map(rowToHealthNight);
  },
  countNights(db: SqlDriver, fromDate: string, toDate: string): number {
    const row = db.get('SELECT COUNT(DISTINCT date) AS n FROM health_night WHERE date >= ? AND date <= ?', [
      fromDate,
      toDate,
    ]);
    return row ? requireNumber(row.n, 'n') : 0;
  },
};

// --- adverse_event -----------------------------------------------------------

function rowToAdverseEvent(row: SqlRow): AdverseEvent {
  const severity = requireText(row.severity, 'severity');
  if (severity !== 'severe' && severity !== 'unwell') {
    throw new Error(`Invalid reaction severity: ${severity}`);
  }
  const resolution = toText(row.resolution);
  return {
    id: requireText(row.id, 'id'),
    experimentId: requireText(row.experiment_id, 'experiment_id'),
    loggedAt: requireText(row.logged_at, 'logged_at'),
    dayIndex: toInt(row.day_index),
    severity,
    resolvedAt: toText(row.resolved_at),
    resolution: resolution === 'resumed' || resolution === 'ended' ? resolution : null,
  };
}

export const adverseEvents = {
  insert(db: SqlDriver, e: AdverseEvent): void {
    db.run(
      `INSERT INTO adverse_event (id, experiment_id, logged_at, day_index, severity, resolved_at, resolution)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.experimentId, e.loggedAt, e.dayIndex, e.severity, e.resolvedAt, e.resolution],
    );
  },
  listForExperiment(db: SqlDriver, experimentId: string): AdverseEvent[] {
    return db
      .all('SELECT * FROM adverse_event WHERE experiment_id = ? ORDER BY logged_at', [experimentId])
      .map(rowToAdverseEvent);
  },
  /** The unresolved event pausing this run, if any. */
  open(db: SqlDriver, experimentId: string): AdverseEvent | undefined {
    const row = db.get(
      'SELECT * FROM adverse_event WHERE experiment_id = ? AND resolved_at IS NULL ORDER BY logged_at DESC LIMIT 1',
      [experimentId],
    );
    return row ? rowToAdverseEvent(row) : undefined;
  },
  resolveAll(db: SqlDriver, experimentId: string, resolution: 'resumed' | 'ended', at: string): void {
    db.run(
      'UPDATE adverse_event SET resolved_at = ?, resolution = ? WHERE experiment_id = ? AND resolved_at IS NULL',
      [at, resolution, experimentId],
    );
  },
};
