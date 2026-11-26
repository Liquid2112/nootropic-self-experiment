import type { SupplementType } from '@/db';
import type { DesignType } from '@/engines/experiment';
import type { Goal, TestWindow, TestWindowId } from './types';

/**
 * Pure derivations for onboarding: goal -> primary metric, supplement type ->
 * study design, and the daily test-time windows. No DB or RN dependency.
 */

/**
 * The primary metric a goal is judged on. Metric keys match `test_session`
 * columns (see src/db/types.ts) so the stats engine can read the right column:
 *   - focus  -> reaction time (PVT median, ms; lower is better)
 *   - memory -> working memory (n-back d-prime; higher is better)
 *   - calm   -> the calm check (0..100 calm score)
 *   - sleep  -> self-rated next-day energy
 *
 * This must match the stats engine's PRIMARY_BY_GOAL (src/engines/stats/
 * metrics.ts), which is what the verdict actually judges on; a test pins the
 * two together. Sleep hours are a covariate in the model, so they can't also
 * be the outcome.
 */
const GOAL_TO_METRIC: Record<Goal, string> = {
  focus: 'pvt_median_ms',
  memory: 'nback_dprime',
  calm: 'calm_score',
  sleep: 'energy',
};

export function primaryMetricForGoal(goal: Goal): string {
  return GOAL_TO_METRIC[goal];
}

/** Human-readable label for a goal (for headers and summaries). */
const GOAL_LABEL: Record<Goal, string> = {
  focus: 'Focus',
  memory: 'Memory',
  calm: 'Calm',
  sleep: 'Sleep',
};

export function goalLabel(goal: Goal): string {
  return GOAL_LABEL[goal];
}

/**
 * The study design for a supplement is its type: an 'acute' supplement acts
 * within a dose so the run alternates ON/OFF days, while a 'cumulative'
 * supplement builds over time so the run uses ON/OFF blocks. The experiment
 * `design` column stores this string.
 */
export function designForSupplementType(type: SupplementType): DesignType {
  return type;
}

/** The selectable daily test-time windows, in chronological order. */
export const TEST_WINDOWS: readonly TestWindow[] = [
  { id: 'early_morning', label: 'Early morning', startHour: 6, endHour: 8 },
  { id: 'morning', label: 'Morning', startHour: 8, endHour: 11 },
  { id: 'midday', label: 'Midday', startHour: 11, endHour: 14 },
  { id: 'afternoon', label: 'Afternoon', startHour: 14, endHour: 18 },
  { id: 'evening', label: 'Evening', startHour: 18, endHour: 22 },
];

export function testWindowById(id: TestWindowId): TestWindow {
  const window = TEST_WINDOWS.find((w) => w.id === id);
  if (!window) {
    throw new Error(`Unknown test window: ${id}`);
  }
  return window;
}
