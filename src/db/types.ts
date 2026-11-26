/**
 * Domain model for the on-device data layer. These types mirror the SQLite
 * schema exactly (see schema.ts) and are the single source of truth later
 * features import from.
 *
 * Booleans are stored as INTEGER 0/1 in SQLite and JSON arrays as TEXT; the
 * repositories (see repositories.ts) convert between the stored row shape and
 * these domain types, so callers only ever see the types below.
 */

export type SupplementType = 'acute' | 'cumulative';

export type Supplement = {
  id: string;
  name: string;
  type: SupplementType;
  evidenceSummary: string;
  evidenceLinks: string[];
  excluded: boolean;
};

export type BlindingMode = 'none' | 'self_blind' | 'sealed';

export type ExperimentStatus = 'draft' | 'active' | 'completed' | 'abandoned';

export type Experiment = {
  id: string;
  supplementId: string;
  goal: string;
  primaryMetric: string;
  design: string;
  blindingMode: BlindingMode;
  lengthDays: number;
  startDate: string;
  status: ExperimentStatus;
  sealedKey: string | null;
  /**
   * The schedule/blinding seed used at creation. A self-blinded run derives its
   * unseal passphrase from this seed, so it must be persisted to recover the
   * A/B -> ON/OFF mapping at run end. Null for rows created before the seed was
   * stored (treated as not-yet-unsealable for self-blind).
   */
  seed: string | null;
  /**
   * Test ids in the daily battery picked at setup (see features/battery).
   * Null or absent on runs created before the battery could be chosen; those
   * ran the reaction test and 2-back.
   */
  battery?: string[] | null;
};

export type ScheduleArm = 'ON' | 'OFF' | 'A' | 'B';

export type ScheduleDay = {
  experimentId: string;
  dayIndex: number;
  date: string;
  arm: ScheduleArm;
  taken: boolean;
  takenAt: string | null;
};

export type TestSession = {
  id: string;
  experimentId: string;
  dayIndex: number;
  startedAt: string;
  deviceModel: string | null;
  pvtMedianMs: number | null;
  pvtLapses: number | null;
  nbackAccuracy: number | null;
  nbackDprime: number | null;
  focus: number | null;
  energy: number | null;
  mood: number | null;
  sleepHours: number | null;
  caffeine: boolean;
  /** Stroop: incongruent minus congruent median RT (ms). Null when not run. */
  stroopInterferenceMs?: number | null;
  /** Stroop: share of correct answers, 0..1. Stored for context, not analyzed. */
  stroopAccuracy?: number | null;
  /** Symbol-digit coding: correct answers per minute. */
  symbolPerMin?: number | null;
  /** Word memory: hits minus false alarms. */
  recallScore?: number | null;
  /** Calm check: 0..100, higher is calmer. */
  calmScore?: number | null;
  /** Expected sharpness before the check-in, 1 (foggy) to 5 (sharp). Null when skipped. */
  expectation?: number | null;
  note: string | null;
  valid: boolean;
};

export type Verdict = 'works' | 'no_effect' | 'inconclusive' | 'harmful';

export type Result = {
  experimentId: string;
  metric: string;
  estimate: number;
  ciLow: number;
  ciHigh: number;
  effectSize: number;
  verdict: Verdict;
  computedAt: string;
};

/** One run of the free standalone reaction test (not tied to an experiment). */
export type QuickTest = {
  id: string;
  takenAt: string;
  medianMs: number;
  lapses: number;
  trials: number;
};

/** A Health metric summarized per night (see the health_night table). */
export type HealthMetric = 'sleep_hours' | 'resting_hr' | 'hrv_ms';

export type HealthNight = {
  /** Local YYYY-MM-DD the night ended on (the wake-up morning). */
  date: string;
  metric: HealthMetric;
  value: number;
  /** 'healthkit' or 'health_connect'. */
  source: string;
  syncedAt: string;
};

/** How bad a logged reaction is. `severe` gets the call-emergency-services message. */
export type ReactionSeverity = 'severe' | 'unwell';

/** A bad reaction logged during a run. Open (resolvedAt null) means the run is paused. */
export type AdverseEvent = {
  id: string;
  experimentId: string;
  loggedAt: string;
  /** The schedule day it was logged on (negative during baseline), or null. */
  dayIndex: number | null;
  severity: ReactionSeverity;
  resolvedAt: string | null;
  resolution: 'resumed' | 'ended' | null;
};
