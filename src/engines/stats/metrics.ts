/**
 * Metric vocabulary and per-metric direction. The analysis is sign-agnostic:
 * OLS returns the raw b1 (change in the metric on ON days), but "improvement"
 * depends on the metric. Reaction time and lapses are better LOWER; accuracy,
 * d-prime, and the self-rating sliders are better HIGHER. Everything downstream
 * (verdict wording, effect-size sign) reads `betterDirection` so the word
 * "improvement" is correct for each metric.
 *
 * Metric keys mirror the columns on `test_session` (see src/db/types.ts).
 */

/** Which way a metric moves when the supplement helps. */
export type BetterDirection = 'lower' | 'higher';

export type MetricKey =
  | 'pvtMedianMs'
  | 'pvtLapses'
  | 'nbackAccuracy'
  | 'nbackDprime'
  | 'focus'
  | 'energy'
  | 'mood'
  // The expanded battery (see features/battery). Null on days the test wasn't
  // part of the check-in, so they only enter the analysis for runs that chose them.
  | 'stroopInterferenceMs'
  | 'symbolPerMin'
  | 'recallScore'
  | 'calmScore'
  // Nightly values from Apple Health / Health Connect (see features/health).
  // Each is the night AFTER the dose day, so last night's sleep is matched to
  // yesterday's dose.
  | 'healthSleepHours'
  | 'healthRestingHr'
  | 'healthHrv';

export type MetricSpec = {
  key: MetricKey;
  /** Human label used in plain-unit formatting. */
  label: string;
  /** Unit string for formatting, '' for unitless. */
  unit: string;
  /** Direction that counts as improvement. */
  betterDirection: BetterDirection;
};

export const METRICS: Record<MetricKey, MetricSpec> = {
  pvtMedianMs: { key: 'pvtMedianMs', label: 'reaction time', unit: 'ms', betterDirection: 'lower' },
  pvtLapses: { key: 'pvtLapses', label: 'lapses', unit: '', betterDirection: 'lower' },
  nbackAccuracy: {
    key: 'nbackAccuracy',
    label: 'n-back accuracy',
    unit: '%',
    betterDirection: 'higher',
  },
  nbackDprime: { key: 'nbackDprime', label: "n-back d'", unit: '', betterDirection: 'higher' },
  focus: { key: 'focus', label: 'focus rating', unit: '', betterDirection: 'higher' },
  energy: { key: 'energy', label: 'energy rating', unit: '', betterDirection: 'higher' },
  mood: { key: 'mood', label: 'mood rating', unit: '', betterDirection: 'higher' },
  stroopInterferenceMs: {
    key: 'stroopInterferenceMs',
    label: 'Stroop interference',
    unit: 'ms',
    betterDirection: 'lower',
  },
  symbolPerMin: { key: 'symbolPerMin', label: 'symbol-coding speed', unit: 'per min', betterDirection: 'higher' },
  recallScore: { key: 'recallScore', label: 'words remembered', unit: '', betterDirection: 'higher' },
  calmScore: { key: 'calmScore', label: 'calm score', unit: '', betterDirection: 'higher' },
  healthSleepHours: { key: 'healthSleepHours', label: 'sleep', unit: 'h', betterDirection: 'higher' },
  healthRestingHr: { key: 'healthRestingHr', label: 'resting heart rate', unit: 'bpm', betterDirection: 'lower' },
  healthHrv: { key: 'healthHrv', label: 'overnight HRV', unit: 'ms', betterDirection: 'higher' },
};

/** The metrics every run measures (the daily check-in). */
export const CORE_METRICS: MetricKey[] = [
  'pvtMedianMs',
  'pvtLapses',
  'nbackAccuracy',
  'nbackDprime',
  'focus',
  'energy',
  'mood',
];

/** Metrics added by the expanded battery; present only when their test ran. */
export const BATTERY_METRICS: MetricKey[] = [
  'stroopInterferenceMs',
  'symbolPerMin',
  'recallScore',
  'calmScore',
];

/** Every metric a check-in can record. */
export const CHECK_IN_METRICS: MetricKey[] = [...CORE_METRICS, ...BATTERY_METRICS];

/** Metrics that come from Apple Health / Health Connect. */
export const HEALTH_METRICS: MetricKey[] = ['healthSleepHours', 'healthRestingHr', 'healthHrv'];

/** experiment.primary_metric values that pre-register a Health outcome. */
export const HEALTH_PRIMARY_DB: Record<string, MetricKey> = {
  health_sleep_hours: 'healthSleepHours',
  health_hrv_ms: 'healthHrv',
  health_resting_hr: 'healthRestingHr',
};

/** The four goals a user can pick, mirrored from the experiment setup flow. */
export type Goal = 'focus' | 'memory' | 'calm' | 'sleep';

/**
 * Map a goal to its primary metric; the others become secondary. Focus leans on
 * the reaction-time task, memory on the n-back, calm on the calm check, and
 * sleep on next-day energy. Each entry lists fallbacks in order: a calm run
 * created before the calm check existed has no calm score, so it is judged on
 * the mood rating as it was when that run started.
 */
const PRIMARY_BY_GOAL: Record<Goal, MetricKey[]> = {
  focus: ['pvtMedianMs'],
  memory: ['nbackDprime'],
  calm: ['calmScore', 'mood'],
  sleep: ['energy'],
};

export type PrimarySelection = {
  primary: MetricKey;
  secondary: MetricKey[];
};

/**
 * Pick the primary metric for a goal and return the rest (from the provided
 * available set, or all metrics) as secondary. Throws on an unknown goal so a
 * typo surfaces instead of silently analyzing the wrong thing.
 */
export function selectPrimaryMetric(
  goal: Goal,
  available: MetricKey[] = CHECK_IN_METRICS,
): PrimarySelection {
  const choices = PRIMARY_BY_GOAL[goal];
  if (!choices) {
    throw new Error(`Unknown goal: ${goal}`);
  }
  const primary = choices.find((m) => available.includes(m)) ?? choices[choices.length - 1]!;
  const secondary = available.filter((m) => m !== primary);
  return { primary, secondary };
}

/** Is `value` an improvement given the metric's better-direction? */
export function isImprovement(direction: BetterDirection, delta: number): boolean {
  return direction === 'lower' ? delta < 0 : delta > 0;
}
