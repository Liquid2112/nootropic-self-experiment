import { createMemoryDriver } from './memoryDriver';
import {
  experiments,
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

describe('schema migrations', () => {
  it('creates all five tables and records the latest version', () => {
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
      'experiment',
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
