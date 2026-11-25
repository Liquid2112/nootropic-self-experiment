/**
 * DEV ONLY. Seeds realistic demo data so screens look alive in screenshots.
 * Not imported by the app. Used by src/dev/seedEntry.ts (a standalone web
 * bundle loaded by scripts/screenshots.mjs) and can be wired behind a dev
 * flag if wanted.
 */
import type { SqlDriver } from '@/db/driver';
import { experiments, quickTests, scheduleDays, testSessions } from '@/db/repositories';
import { createExperiment } from '@/engines/onboarding/createExperiment';

const EXPERIMENT_ID = 'demo-experiment';

function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Deterministic pseudo-random in [0,1) so screenshots are stable. */
function rand(i: number): number {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** Wipe experiment-related rows (supplement catalogue is left intact). */
export function clearDemoData(db: SqlDriver): void {
  db.run('DELETE FROM result');
  db.run('DELETE FROM test_session');
  db.run('DELETE FROM schedule_day');
  db.run('DELETE FROM experiment');
  db.run('DELETE FROM quick_test');
  db.run('DELETE FROM app_state');
}

/**
 * Active 21-day L-Theanine + Caffeine focus run that started 10 days ago:
 * 3 baseline check-ins, days 0..9 marked taken, 9 run-day test sessions,
 * and 6 quick reaction tests.
 */
export function seedDemoData(db: SqlDriver): void {
  clearDemoData(db);
  const START_AGO = 10;

  createExperiment(
    db,
    {
      goal: 'focus',
      supplement: {
        kind: 'curated',
        supplementId: 'l-theanine-caffeine',
        type: 'acute',
        name: 'L-Theanine + Caffeine',
      },
      lengthDays: 21,
      blindingMode: 'none',
      testWindow: 'morning',
      startDate: localDay(daysAgo(START_AGO)),
    },
    { experimentId: EXPERIMENT_ID, seed: 'demo-seed-1' },
  );

  const schedule = scheduleDays.listForExperiment(db, EXPERIMENT_ID);
  let n = 0;

  // Baseline check-ins (day_index -3..-1).
  for (let b = -3; b <= -1; b++) {
    const at = daysAgo(START_AGO - b, 9, 10 + b);
    insertSession(db, b, at, 'OFF', n++);
  }

  // Days 0..9 (through yesterday) taken; test sessions on 9 of them (skip day 5).
  for (const day of schedule) {
    if (day.dayIndex > 9) continue;
    const at = daysAgo(START_AGO - day.dayIndex, 8, 30);
    scheduleDays.markTaken(db, EXPERIMENT_ID, day.dayIndex, at.toISOString());
    if (day.dayIndex !== 5) {
      const testAt = daysAgo(START_AGO - day.dayIndex, 9, 15);
      insertSession(db, day.dayIndex, testAt, day.arm, n++);
    }
  }

  // Quick reaction tests, trending faster.
  const quick = [
    { ago: 12, ms: 318 },
    { ago: 9, ms: 301 },
    { ago: 7, ms: 296 },
    { ago: 4, ms: 284 },
    { ago: 2, ms: 289 },
    { ago: 0, ms: 271 },
  ];
  quick.forEach((q, i) => {
    quickTests.insert(db, {
      id: `demo-quick-${i}`,
      takenAt: daysAgo(q.ago, 14, i).toISOString(),
      medianMs: q.ms,
      lapses: i % 3 === 0 ? 1 : 0,
      trials: 20,
    });
  });

  if (experiments.getById(db, EXPERIMENT_ID) === undefined) {
    throw new Error('seedDemoData: experiment was not created');
  }
}

function insertSession(db: SqlDriver, dayIndex: number, at: Date, arm: string, i: number): void {
  const on = arm === 'ON' || arm === 'A';
  const jitter = rand(i);
  testSessions.insert(db, {
    id: `demo-session-${dayIndex}`,
    experimentId: EXPERIMENT_ID,
    dayIndex,
    startedAt: at.toISOString(),
    deviceModel: 'web',
    pvtMedianMs: Math.round((on ? 284 : 302) + jitter * 18 - i * 0.6),
    pvtLapses: on ? Math.round(jitter * 1.4) : 1 + Math.round(jitter * 2),
    nbackAccuracy: Math.round(((on ? 0.86 : 0.79) + jitter * 0.06) * 100) / 100,
    nbackDprime: Math.round(((on ? 2.4 : 2.0) + jitter * 0.4) * 100) / 100,
    focus: Math.min(10, (on ? 7 : 5) + Math.round(jitter * 2)),
    energy: Math.min(10, (on ? 7 : 5) + Math.round(rand(i + 7) * 2)),
    mood: Math.min(10, 6 + Math.round(rand(i + 13) * 2)),
    sleepHours: Math.round((6.5 + rand(i + 3) * 1.5) * 10) / 10,
    caffeine: on,
    note: null,
    valid: true,
  });
}
