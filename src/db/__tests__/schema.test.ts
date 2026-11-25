import { createMemoryDriver } from './memoryDriver';
import {
  experiments,
  quickTests,
  results,
  scheduleDays,
  supplements,
  testSessions,
} from '../repositories';
import { getSchemaVersion, latestSchemaVersion, migrate } from '../schema';
import type {
  Experiment,
  Result,
  ScheduleDay,
  Supplement,
  TestSession,
} from '../types';

describe('quick_test (free reaction test)', () => {
  it('stores runs, lists most recent first, and reports the fastest as best', () => {
    const db = createMemoryDriver();
    migrate(db);
    quickTests.insert(db, { id: 'a', takenAt: '2026-01-01T10:00:00Z', medianMs: 300, lapses: 1, trials: 12 });
    quickTests.insert(db, { id: 'b', takenAt: '2026-01-02T10:00:00Z', medianMs: 250, lapses: 0, trials: 12 });
    quickTests.insert(db, { id: 'c', takenAt: '2026-01-03T10:00:00Z', medianMs: 280, lapses: 0, trials: 12 });
    expect(quickTests.listRecent(db).map((q) => q.id)).toEqual(['c', 'b', 'a']);
    expect(quickTests.listRecent(db, 1).map((q) => q.id)).toEqual(['c']);
    expect(quickTests.best(db)?.id).toBe('b');
  });

  it('has no best before the first run', () => {
    const db = createMemoryDriver();
    migrate(db);
    expect(quickTests.best(db)).toBeUndefined();
  });
});

describe('experiments.setStatus', () => {
  it('moves an experiment out of active', () => {
    const db = createMemoryDriver();
    migrate(db);
    supplements.insert(db, {
      id: 's1',
      name: 'L-theanine',
      type: 'acute',
      evidenceSummary: 'x',
      evidenceLinks: [],
      excluded: false,
    });
    experiments.insert(db, {
      id: 'e1',
      supplementId: 's1',
      goal: 'focus',
      primaryMetric: 'pvt_median_ms',
      design: 'acute',
      blindingMode: 'none',
      lengthDays: 21,
      startDate: '2026-01-01',
      status: 'active',
      sealedKey: null,
      seed: null,
    });
    experiments.setStatus(db, 'e1', 'completed');
    expect(experiments.listByStatus(db, 'active')).toHaveLength(0);
    expect(experiments.listByStatus(db, 'completed').map((e) => e.id)).toEqual(['e1']);
  });
});

describe('schema migrations', () => {
  it('creates all tables and records the latest version', () => {
    const db = createMemoryDriver();
    const version = migrate(db);

    expect(version).toBe(latestSchemaVersion());
    expect(getSchemaVersion(db)).toBe(latestSchemaVersion());

    const tables = db
      .all(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .map((row) => row.name);
    expect(tables).toEqual([
      'adverse_event',
      'app_state',
      'experiment',
      'health_night',
      'quick_test',
      'result',
      'schedule_day',
      'supplement',
      'test_session',
    ]);
  });

  it('is idempotent when run twice', () => {
    const db = createMemoryDriver();
    migrate(db);
    // A second run must not throw (tables already exist) and must leave the
    // version unchanged.
    expect(() => migrate(db)).not.toThrow();
    expect(getSchemaVersion(db)).toBe(latestSchemaVersion());
  });

  it('adds the experiment.seed column (migration v2) so blinding is unsealable', () => {
    const db = createMemoryDriver();
    migrate(db);
    const cols = db.all('PRAGMA table_info(experiment)').map((r) => r.name);
    expect(cols).toContain('seed');
  });
});

describe('experiment.seed round-trip', () => {
  it('stores and reads back a non-null seed', () => {
    const db = createMemoryDriver();
    migrate(db);
    supplements.insert(db, {
      id: 's',
      name: 'S',
      type: 'acute',
      evidenceSummary: 'x',
      evidenceLinks: [],
      excluded: false,
    });
    const exp: Experiment = {
      id: 'e-seed',
      supplementId: 's',
      goal: 'focus',
      primaryMetric: 'pvt_median_ms',
      design: 'acute',
      blindingMode: 'self_blind',
      lengthDays: 28,
      startDate: '2026-01-01',
      status: 'active',
      sealedKey: 'v1:deadbeef:00',
      seed: 'the-seed',
    };
    experiments.insert(db, exp);
    expect(experiments.getById(db, 'e-seed')!.seed).toBe('the-seed');
  });
});

describe('repositories round-trip', () => {
  function freshDb() {
    const db = createMemoryDriver();
    migrate(db);
    return db;
  }

  const supplement: Supplement = {
    id: 'test-supp',
    name: 'Test Supplement',
    type: 'acute',
    evidenceSummary: 'For the round-trip test.',
    evidenceLinks: ['https://example.com/a', 'https://example.com/b'],
    excluded: false,
  };

  it('stores and reads a supplement including JSON links and bool', () => {
    const db = freshDb();
    supplements.insert(db, supplement);

    const read = supplements.getById(db, 'test-supp');
    expect(read).toEqual(supplement);
    expect(read?.evidenceLinks).toHaveLength(2);
    expect(read?.excluded).toBe(false);
  });

  it('hides excluded supplements from the default list', () => {
    const db = freshDb();
    supplements.insert(db, supplement);
    supplements.insert(db, { ...supplement, id: 'hidden', name: 'Hidden', excluded: true });

    expect(supplements.list(db).map((s) => s.id)).toEqual(['test-supp']);
    expect(supplements.list(db, true).map((s) => s.id).sort()).toEqual(['hidden', 'test-supp']);
  });

  it('round-trips an experiment, schedule day, test session, and result', () => {
    const db = freshDb();
    supplements.insert(db, supplement);

    const experiment: Experiment = {
      id: 'exp-1',
      supplementId: 'test-supp',
      goal: 'Improve focus',
      primaryMetric: 'pvt_median_ms',
      design: 'alternating',
      blindingMode: 'self_blind',
      lengthDays: 14,
      startDate: '2026-01-01',
      status: 'active',
      sealedKey: null,
      seed: null,
    };
    experiments.insert(db, experiment);
    expect(experiments.getById(db, 'exp-1')).toEqual(experiment);
    expect(experiments.listByStatus(db, 'active').map((e) => e.id)).toEqual(['exp-1']);

    const day: ScheduleDay = {
      experimentId: 'exp-1',
      dayIndex: 0,
      date: '2026-01-01',
      arm: 'ON',
      taken: false,
      takenAt: null,
    };
    scheduleDays.insert(db, day);
    scheduleDays.markTaken(db, 'exp-1', 0, '2026-01-01T08:00:00Z');
    const days = scheduleDays.listForExperiment(db, 'exp-1');
    expect(days).toHaveLength(1);
    expect(days[0]?.taken).toBe(true);
    expect(days[0]?.takenAt).toBe('2026-01-01T08:00:00Z');

    const session: TestSession = {
      id: 'ts-1',
      experimentId: 'exp-1',
      dayIndex: 0,
      startedAt: '2026-01-01T09:00:00Z',
      deviceModel: 'iPhone',
      pvtMedianMs: 280,
      pvtLapses: 1,
      nbackAccuracy: 92,
      nbackDprime: 2,
      focus: 4,
      energy: 3,
      mood: 4,
      sleepHours: 7,
      caffeine: true,
      note: 'felt sharp',
      valid: true,
    };
    testSessions.insert(db, session);
    expect(testSessions.getById(db, 'ts-1')).toEqual(session);

    const result: Result = {
      experimentId: 'exp-1',
      metric: 'pvt_median_ms',
      estimate: -12.5,
      ciLow: -20,
      ciHigh: -5,
      effectSize: 0.6,
      verdict: 'works',
      computedAt: '2026-01-15T00:00:00Z',
    };
    results.upsert(db, result);
    expect(results.listForExperiment(db, 'exp-1')).toEqual([result]);

    // upsert overwrites on the (experiment, metric) key.
    results.upsert(db, { ...result, estimate: -9, verdict: 'inconclusive' });
    const after = results.listForExperiment(db, 'exp-1');
    expect(after).toHaveLength(1);
    expect(after[0]?.estimate).toBe(-9);
    expect(after[0]?.verdict).toBe('inconclusive');
  });

  it('enforces the supplement type check constraint', () => {
    const db = freshDb();
    expect(() =>
      db.run(
        `INSERT INTO supplement (id, name, type, evidence_summary) VALUES ('bad', 'Bad', 'invalid', 'x')`,
      ),
    ).toThrow();
  });
});
