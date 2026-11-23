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
