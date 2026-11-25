/**
 * Load the current experiment and its schedule + test sessions from the device
 * database. Prefers an active run, falling back to the most recent completed
 * one, so the Progress and Verdict screens have something to render after a run
 * ends. UI-only: this touches the real expo-sqlite database and is therefore
 * never imported by the Node unit tests, which exercise the pure logic in
 * @/results directly.
 */

import { useEffect, useState } from 'react';
import {
  experiments,
  getDatabase,
  scheduleDays,
  supplements,
  testSessions,
} from '@/db';
import type { Experiment, ScheduleDay, Supplement, TestSession } from '@/db/types';

export type ExperimentData = {
  experiment: Experiment | null;
  schedule: ScheduleDay[];
  sessions: TestSession[];
  supplement: Supplement | undefined;
  /**
   * Current 0-based day index since the run started, clamped to the run's last
   * day. Negative (-1) while still in the pre-run baseline, so no run day is
   * judged yet.
   */
  todayIndex: number;
  /** Baseline days left before day 1 of the run (0 once the run has started). */
  baselineDaysLeft: number;
};

const EMPTY: ExperimentData = {
  experiment: null,
  schedule: [],
  sessions: [],
  supplement: undefined,
  todayIndex: 0,
  baselineDaysLeft: 0,
};

/** Whole days between an ISO start date and today (negative before the start). */
function daysSince(startDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) return 0;
  const start = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - start) / (24 * 60 * 60 * 1000));
}

/** Pick the run to display: active first, else the most recent completed. */
function currentExperiment(): Experiment | null {
  const db = getDatabase();
  const active = experiments.listByStatus(db, 'active');
  if (active.length > 0) return active[0] ?? null;
  const completed = experiments.listByStatus(db, 'completed');
  return completed[0] ?? null;
}

/**
 * Load the current experiment data once on mount. Returns EMPTY until loaded,
 * so screens can render a "no experiment yet" state without special-casing the
 * initial render.
 */
export function useExperimentData(): ExperimentData {
  const [data, setData] = useState<ExperimentData>(EMPTY);

  useEffect(() => {
    const db = getDatabase();
    const experiment = currentExperiment();
    if (!experiment) {
      setData(EMPTY);
      return;
    }
    const elapsed = daysSince(experiment.startDate);
    setData({
      experiment,
      schedule: scheduleDays.listForExperiment(db, experiment.id),
      sessions: testSessions.listForExperiment(db, experiment.id),
      supplement: supplements.getById(db, experiment.supplementId),
      todayIndex: Math.max(-1, Math.min(elapsed, experiment.lengthDays - 1)),
      baselineDaysLeft: Math.max(0, -elapsed),
    });
  }, []);

  return data;
}
