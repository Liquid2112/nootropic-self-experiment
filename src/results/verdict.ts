/**
 * Verdict wiring: the single function the Verdict screen calls to turn a
 * finished experiment's stored data into the payoff view model, and to persist
 * the per-metric result rows.
 *
 * It joins schedule_day (the ON/OFF assignment) with test_session (the measured
 * metrics, sleep, caffeine) by day index, unblinds the arm when the run was
 * blinded, runs the stats engine per metric, selects the primary metric from
 * the goal, enforces the 80% adherence gate, and returns plain-language output.
 *
 * Pure except for the DB writes it is explicitly asked to make: it takes a
 * SqlDriver only to upsert result rows. Everything else is a function of the
 * rows passed in, so the wiring unit-tests against the in-memory driver.
 */

import type { SqlDriver } from '@/db/driver';
import { results } from '@/db/repositories';
import type { Experiment, HealthMetric, HealthNight, Result, ScheduleDay, TestSession } from '@/db/types';
import { type ArmMapping, addDays, unsealArmMapping } from '@/engines/experiment';
import {
  analyzeMetric,
  CORE_METRICS,
  HEALTH_METRICS,
  HEALTH_PRIMARY_DB,
  type DayObservation,
  type MetricAnalysis,
  type MetricKey,
  METRICS,
  selectPrimaryMetric,
  toDbVerdict,
  type Goal,
} from '@/engines/stats';
import {
  summarizeAdherence,
  type AdherenceSummary,
} from './adherence';
import { COMPLIANCE_DISCLAIMER, UNBLINDED_CAVEAT } from './compliance';
import { monthlyCostLine, type MonthlyCostInput } from './cost';
import { batteryOf, metricsForBattery } from '@/features/battery';

/** Column on test_session holding each metric's value. */
const METRIC_COLUMN: Partial<Record<MetricKey, keyof TestSession>> = {
  pvtMedianMs: 'pvtMedianMs',
  pvtLapses: 'pvtLapses',
  nbackAccuracy: 'nbackAccuracy',
  nbackDprime: 'nbackDprime',
  focus: 'focus',
  energy: 'energy',
  mood: 'mood',
  stroopInterferenceMs: 'stroopInterferenceMs',
  symbolPerMin: 'symbolPerMin',
  recallScore: 'recallScore',
  calmScore: 'calmScore',
};

/** health_night metric behind each Health metric key. */
const HEALTH_COLUMN: Partial<Record<MetricKey, HealthMetric>> = {
  healthSleepHours: 'sleep_hours',
  healthRestingHr: 'resting_hr',
  healthHrv: 'hrv_ms',
};

/** Share of run days that need a synced night to judge a Health primary. */
const MIN_HEALTH_COVERAGE = 0.6;

/** Not-enough-data sentence, reused when a metric can't be fit. */
const NOT_ENOUGH_DATA_SENTENCE = 'Not enough data: extend 2 weeks or improve adherence.';

export type MetricVerdict = {
  metric: MetricKey;
  label: string;
  /** Plain-language verdict sentence from the engine's rule. */
  verdictSentence: string;
  /** Plain-unit effect sentence, e.g. "reaction time 18 ms faster (range 4-32 ms)". */
  effectSentence: string | null;
  estimate: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  effectSize: number | null;
  /** The stored DB verdict enum. */
  dbVerdict: Result['verdict'];
  /** True when this metric could be analyzed (enough data, not gated). */
  analyzed: boolean;
};

export type VerdictViewModel = {
  experimentId: string;
  /** The prominent primary-metric verdict. */
  primary: MetricVerdict;
  /** Secondary metrics shown below, in a stable order. */
  secondary: MetricVerdict[];
  adherence: AdherenceSummary;
  /** False when adherence is below the 80% gate: show the improve-adherence state. */
  adherenceMet: boolean;
  /** 'blinded' or 'unblinded'; drives the placebo caveat. */
  blindingState: 'blinded' | 'unblinded';
  /** Shown only for open (unblinded) runs. */
  unblindedCaveat: string | null;
  /** The revealed A/B -> ON/OFF mapping for a blinded run, else null. */
  revealedMapping: RevealedMapping | null;
  /** "$X/month" or null when no price is known. */
  monthlyCost: string | null;
  disclaimer: string;
  /**
   * Set when the run pre-registered a Health outcome but too few nights synced
   * to judge it, so the verdict fell back to the check-in metric. Shown as is.
   */
  primaryNote: string | null;
};

/** Human-readable unblinding of a blinded run's neutral labels. */
export type RevealedMapping = {
  supplementLabel: 'A' | 'B';
  placeboLabel: 'A' | 'B';
};

export type ComputeVerdictInput = {
  experiment: Experiment;
  schedule: ScheduleDay[];
  sessions: TestSession[];
  /** Current 0-based day index; bounds the adherence window. Defaults to the last scheduled day. */
  todayIndex?: number;
  /** Passphrase to unseal a blinded run's arm mapping. Required to unblind. */
  unsealPassphrase?: string;
  /**
   * Nightly Apple Health / Health Connect values. Each schedule day is matched
   * to the night that ENDS the morning after it (last night's sleep reflects
   * yesterday's dose). Omit when Health isn't connected.
   */
  healthNights?: HealthNight[];
  /** Per-dose cost for the monthly-cost line; omit when unknown. */
  cost?: Pick<MonthlyCostInput, 'centsPerDose'>;
};

/**
 * Decode the true ON indicator per day. For an open run the stored arm is
 * ON/OFF directly. For a blinded run the stored arm is A/B and the supplement
 * label is recovered from the sealed key with the passphrase; a day equals ON
 * when its label is the supplement label. Throws if a blinded run can't be
 * unsealed, since a verdict without the true arm would be meaningless.
 */
function resolveOnByDay(
  experiment: Experiment,
  schedule: ScheduleDay[],
  passphrase: string | undefined,
): { onByDay: Map<number, 0 | 1>; blindingState: 'blinded' | 'unblinded'; revealed: RevealedMapping | null } {
  const open = experiment.blindingMode === 'none';
  if (open) {
    const onByDay = new Map<number, 0 | 1>();
    for (const d of schedule) onByDay.set(d.dayIndex, d.arm === 'ON' ? 1 : 0);
    return { onByDay, blindingState: 'unblinded', revealed: null };
  }

  if (!experiment.sealedKey) {
    throw new Error('Blinded run has no sealed key to unblind');
  }
  if (!passphrase) {
    throw new Error('Unseal passphrase required to compute a blinded verdict');
  }
  const mapping = unsealArmMapping<ArmMapping>(experiment.sealedKey, passphrase);
  const onByDay = new Map<number, 0 | 1>();
  for (const d of schedule) {
    onByDay.set(d.dayIndex, d.arm === mapping.supplementLabel ? 1 : 0);
  }
  return {
    onByDay,
    blindingState: 'blinded',
    revealed: { supplementLabel: mapping.supplementLabel, placeboLabel: mapping.placeboLabel },
  };
}

/**
 * Assemble the per-metric day observations: one row per valid test session that
 * has a non-null value for the metric and a matching schedule day. `t` is the
 * day index, `sleep` falls back to 0 when unlogged, `caffeine` is the session's
 * flag. Returns the observations in day order.
 */
function observationsFor(
  metric: MetricKey,
  sessions: TestSession[],
  onByDay: Map<number, 0 | 1>,
): DayObservation[] {
  const column = METRIC_COLUMN[metric];
  const rows: DayObservation[] = [];
  if (!column) return rows;
  for (const s of sessions) {
    if (!s.valid) continue;
    const on = onByDay.get(s.dayIndex);
    if (on === undefined) continue; // no schedule day for this session
    const raw = s[column];
    if (typeof raw !== 'number') continue; // metric not measured this day
    rows.push({
      y: raw,
      on,
      t: s.dayIndex,
      sleep: typeof s.sleepHours === 'number' ? s.sleepHours : 0,
      caffeine: s.caffeine ? 1 : 0,
    });
  }
  return rows.sort((a, b) => a.t - b.t);
}

/**
 * Day observations for a Health metric: schedule day D is paired with the night
 * ending on D + 1. The sleep covariate is held at 0 (and so dropped by the
 * model): self-reported sleep is the night BEFORE the dose day, which would be
 * the wrong night to adjust for here. Caffeine is that day's check-in flag.
 */
function healthObservationsFor(
  metric: MetricKey,
  schedule: ScheduleDay[],
  sessions: TestSession[],
  nights: HealthNight[],
  onByDay: Map<number, 0 | 1>,
): DayObservation[] {
  const column = HEALTH_COLUMN[metric];
  if (!column) return [];
  const byDate = new Map(nights.filter((n) => n.metric === column).map((n) => [n.date, n.value]));
  const caffeineByDay = new Map<number, 0 | 1>(
    sessions.filter((s) => s.valid).map((s) => [s.dayIndex, s.caffeine ? 1 : 0]),
  );
  const rows: DayObservation[] = [];
  for (const day of schedule) {
    const on = onByDay.get(day.dayIndex);
    const y = byDate.get(addDays(day.date, 1));
    if (on === undefined || y === undefined) continue;
    rows.push({ y, on, t: day.dayIndex, sleep: 0, caffeine: caffeineByDay.get(day.dayIndex) ?? 0 });
  }
  return rows.sort((a, b) => a.t - b.t);
}

/** Build the not-enough-data verdict for a metric that can't be analyzed. */
function notEnoughDataVerdict(metric: MetricKey): MetricVerdict {
  return {
    metric,
    label: METRICS[metric].label,
    verdictSentence: NOT_ENOUGH_DATA_SENTENCE,
    effectSentence: null,
    estimate: null,
    ciLow: null,
    ciHigh: null,
    effectSize: null,
    dbVerdict: 'inconclusive',
    analyzed: false,
  };
}

/** Map an engine analysis onto the view-model metric verdict. */
function fromAnalysis(analysis: MetricAnalysis): MetricVerdict {
  return {
    metric: analysis.metric,
    label: METRICS[analysis.metric].label,
    verdictSentence: analysis.verdictSentence,
    effectSentence: analysis.effectSentence,
    estimate: analysis.estimate,
    ciLow: analysis.ci.low,
    ciHigh: analysis.ci.high,
    effectSize: analysis.effectSize,
    dbVerdict: toDbVerdict(analysis.verdictState),
    analyzed: analysis.adherenceMet && analysis.verdictState !== 'not_enough_data',
  };
}

/** Keep the original metrics in their familiar order, new ones after them. */
function orderLikeCore(metrics: MetricKey[]): MetricKey[] {
  const core = CORE_METRICS.filter((m) => metrics.includes(m));
  return [...core, ...metrics.filter((m) => !CORE_METRICS.includes(m))];
}

function countOnDays(onByDay: Map<number, 0 | 1>): number {
  let n = 0;
  for (const v of onByDay.values()) if (v === 1) n += 1;
  return n;
}

/**
 * Compute the full verdict view model and persist a result row per analyzed
 * metric. The adherence gate is applied per metric (the engine forces
 * not_enough_data below 80%); the view model also surfaces `adherenceMet` so
 * the screen can show the single improve-adherence state instead of a verdict.
 */
export function computeExperimentVerdict(
  db: SqlDriver,
  input: ComputeVerdictInput,
): VerdictViewModel {
  const { experiment, schedule, sessions } = input;
  const lastDay = experiment.lengthDays - 1;
  const todayIndex = input.todayIndex ?? lastDay;

  const { onByDay, blindingState, revealed } = resolveOnByDay(
    experiment,
    schedule,
    input.unsealPassphrase,
  );

  const adherence = summarizeAdherence(schedule, sessions, todayIndex);
  const adherenceInput = {
    scheduledDays: adherence.scheduledDays,
    takenDays: adherence.takenDays,
    testedDays: adherence.testedDays,
  };

  const goal = experiment.goal as Goal;
  const nights = input.healthNights ?? [];
  const hasHealth = nights.length > 0;
  // The run's own battery decides what it measured: its tests plus the ratings.
  // Older runs fall back to the original reaction + 2-back pair.
  const checkIn = orderLikeCore(metricsForBattery(batteryOf(experiment)));
  const available: MetricKey[] = hasHealth ? [...checkIn, ...HEALTH_METRICS] : checkIn;
  const goalSelection = selectPrimaryMetric(goal, available);
  // A run that connected Health before day 1 pre-registered a Health outcome.
  const preRegistered = HEALTH_PRIMARY_DB[experiment.primaryMetric];
  // It's judged on Health only if enough nights synced: at least 60% of days.
  const healthPrimary =
    preRegistered &&
    healthObservationsFor(preRegistered, schedule, sessions, nights, onByDay).length >=
      Math.ceil(MIN_HEALTH_COVERAGE * schedule.length)
      ? preRegistered
      : undefined;
  const primary: MetricKey = healthPrimary ?? goalSelection.primary;
  const metricOrder: MetricKey[] = [primary, ...available.filter((m) => m !== primary)];
  const design: 'acute' | 'cumulative' =
    experiment.design === 'cumulative' ? 'cumulative' : 'acute';

  const computedAt = new Date().toISOString();
  const verdicts = new Map<MetricKey, MetricVerdict>();

  for (const metric of metricOrder) {
    const days = HEALTH_COLUMN[metric]
      ? healthObservationsFor(metric, schedule, sessions, nights, onByDay)
      : observationsFor(metric, sessions, onByDay);
    let verdict: MetricVerdict;
    try {
      const analysis = analyzeMetric(metric, days, { adherence: adherenceInput, design });
      verdict = fromAnalysis(analysis);
    } catch {
      // A metric that can't be fit (too few days, collinear columns, or a
      // degenerate zero-variance fit) is reported as not-enough-data rather
      // than crashing the whole verdict. Unblinding errors are raised earlier,
      // in resolveOnByDay, so they are not swallowed here.
      verdict = notEnoughDataVerdict(metric);
    }
    verdicts.set(metric, verdict);

    // Persist every metric we could fit (skip the degenerate not-enough-data
    // rows that never produced estimates).
    if (verdict.analyzed && verdict.estimate !== null && verdict.ciLow !== null && verdict.ciHigh !== null && verdict.effectSize !== null) {
      const row: Result = {
        experimentId: experiment.id,
        metric,
        estimate: verdict.estimate,
        ciLow: verdict.ciLow,
        ciHigh: verdict.ciHigh,
        effectSize: verdict.effectSize,
        verdict: verdict.dbVerdict,
        computedAt,
      };
      results.upsert(db, row);
    }
  }

  // Fall back to the check-in metric when the pre-registered Health outcome
  // has too few nights to judge, and say so on the verdict.
  let primaryNote: string | null = null;
  if (preRegistered && !healthPrimary) {
    primaryNote = `Not enough nights of ${METRICS[preRegistered].label} data synced from Health, so this verdict uses your ${METRICS[primary].label} instead.`;
  }
  const secondary = metricOrder.filter((m) => m !== primary);

  const onDays = countOnDays(onByDay);
  const monthlyCost = input.cost
    ? monthlyCostLine({ centsPerDose: input.cost.centsPerDose, onDays, lengthDays: experiment.lengthDays })
    : null;

  return {
    experimentId: experiment.id,
    primary: verdicts.get(primary) ?? notEnoughDataVerdict(primary),
    secondary: secondary.map((m) => verdicts.get(m) ?? notEnoughDataVerdict(m)),
    adherence,
    adherenceMet: adherence.meetsGate,
    blindingState,
    unblindedCaveat: blindingState === 'unblinded' ? UNBLINDED_CAVEAT : null,
    revealedMapping: revealed,
    monthlyCost,
    disclaimer: COMPLIANCE_DISCLAIMER,
    primaryNote,
  };
}
