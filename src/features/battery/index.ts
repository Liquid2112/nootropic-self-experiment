/**
 * The daily test battery: which tests exist, which ones a run uses, and in what
 * order the check-in runs them. Pure, so the picker, the check-in, and the
 * verdict all read the same rules and tests pin them.
 *
 * Design rules:
 *  - Every run picks its tests once, at setup, and keeps them for the whole run.
 *    Rotating tests day to day would halve the data behind each one and make
 *    the verdict weaker, so variety comes from choice, not rotation.
 *  - The test that judges the user's goal is always on (it is the pre-registered
 *    primary outcome) and can't be removed.
 *  - The defaults keep the check-in around two minutes: a short routine is
 *    what keeps people going for 3-4 weeks.
 */
import type { IconName } from '@/brand';
import type { MetricKey } from '@/engines/stats';
import type { Goal } from '@/engines/onboarding';

export type TestId = 'calm' | 'pvt' | 'nback' | 'stroop' | 'symbol' | 'recall';

export type TestInfo = {
  id: TestId;
  /** Display name. */
  name: string;
  /** What it measures, in two or three words. */
  measures: string;
  /** One-line description of the task. */
  blurb: string;
  /** Where it comes from, for the "why this test" line. */
  science: string;
  /** Typical time to finish, in seconds. */
  seconds: number;
  icon: IconName;
  /** The metrics the verdict analyzes from this test. */
  metrics: MetricKey[];
};

export const TEST_CATALOG: Record<TestId, TestInfo> = {
  pvt: {
    id: 'pvt',
    name: 'Reaction time',
    measures: 'Alertness',
    blurb: 'Tap the instant the dot appears.',
    science: 'The Psychomotor Vigilance Task, NASA’s standard for alertness and fatigue.',
    seconds: 40,
    icon: 'bolt',
    metrics: ['pvtMedianMs', 'pvtLapses'],
  },
  nback: {
    id: 'nback',
    name: '2-back',
    measures: 'Working memory',
    blurb: 'Spot when a letter matches the one two back.',
    science: 'The n-back task, the most widely used working-memory test in research.',
    seconds: 45,
    icon: 'brain',
    metrics: ['nbackAccuracy', 'nbackDprime'],
  },
  stroop: {
    id: 'stroop',
    name: 'Color clash',
    measures: 'Attention control',
    blurb: 'Tap the ink color, not the word.',
    science: 'The Stroop test, a 90-year-old classic for focus and impulse control.',
    seconds: 35,
    icon: 'target',
    metrics: ['stroopInterferenceMs'],
  },
  symbol: {
    id: 'symbol',
    name: 'Symbol code',
    measures: 'Processing speed',
    blurb: 'Match symbols to numbers as fast as you can.',
    science: 'Based on the Digit Symbol test, one of the most drug-sensitive tests in psychology.',
    seconds: 50,
    icon: 'sparkle',
    metrics: ['symbolPerMin'],
  },
  recall: {
    id: 'recall',
    name: 'Word memory',
    measures: 'Memory',
    blurb: 'Learn 10 words now, pick them out after the other tests.',
    science: 'Delayed word recognition, a staple of clinical memory batteries.',
    seconds: 45,
    icon: 'book',
    metrics: ['recallScore'],
  },
  calm: {
    id: 'calm',
    name: 'Calm check',
    measures: 'Calm vs. tension',
    blurb: 'Four quick taps on how tense or at ease you feel.',
    science: 'A short state-anxiety scale, built the way researchers measure stress in the moment.',
    seconds: 15,
    icon: 'smile',
    metrics: ['calmScore'],
  },
};

/** Catalog order for the picker and the library. */
export const TEST_IDS: readonly TestId[] = ['pvt', 'nback', 'stroop', 'symbol', 'recall', 'calm'];

/** The 1-10 sliders every check-in ends with. */
export const RATINGS_SECONDS = 15;
export const RATING_METRICS: MetricKey[] = ['focus', 'energy', 'mood'];

/** The test whose score answers the goal. Always on. */
export const REQUIRED_TEST: Record<Goal, TestId> = {
  focus: 'pvt',
  memory: 'nback',
  calm: 'calm',
  // Sleep is judged on next-day energy (a rating); reaction time is its best
  // objective partner, since poor sleep shows up as slower, lapse-prone RTs.
  sleep: 'pvt',
};

/**
 * The battery a goal starts with: the goal's test, one objective partner, and
 * the calm check, about two minutes all in. Everything else is one tap away in
 * the picker for people who want a deeper check-in.
 */
export const DEFAULT_BATTERY: Record<Goal, TestId[]> = {
  focus: ['pvt', 'stroop', 'calm'],
  memory: ['nback', 'recall', 'calm'],
  calm: ['calm', 'pvt', 'stroop'],
  sleep: ['pvt', 'nback', 'calm'],
};

/** What runs created before the battery could be chosen used. */
export const LEGACY_BATTERY: TestId[] = ['pvt', 'nback'];

/** Fewer than this and the check-in stops feeling like a real assessment. */
export const MIN_TESTS = 2;

/** Above this many minutes the picker warns that the routine is getting long. */
export const LONG_ROUTINE_MINUTES = 3;

export function isTestId(value: string): value is TestId {
  return (TEST_IDS as readonly string[]).includes(value);
}

/** Put tests in catalog order and drop duplicates and unknown ids. */
export function normalizeBattery(tests: readonly string[]): TestId[] {
  const set = new Set(tests.filter(isTestId));
  return TEST_IDS.filter((id) => set.has(id));
}

/** The battery a stored experiment runs: its saved choice, or the legacy pair. */
export function batteryOf(experiment: { battery?: string[] | null }): TestId[] {
  const stored = experiment.battery ? normalizeBattery(experiment.battery) : [];
  return stored.length > 0 ? stored : LEGACY_BATTERY;
}

/**
 * Toggle a test in the picker. The goal's required test can't be turned off,
 * and the last tests can't drop below MIN_TESTS.
 */
export function toggleTest(goal: Goal, tests: readonly TestId[], id: TestId): TestId[] {
  if (tests.includes(id)) {
    if (id === REQUIRED_TEST[goal] || tests.length <= MIN_TESTS) return normalizeBattery(tests);
    return normalizeBattery(tests.filter((t) => t !== id));
  }
  return normalizeBattery([...tests, id]);
}

/** Can this test be switched off right now? */
export function canRemove(goal: Goal, tests: readonly TestId[], id: TestId): boolean {
  return tests.includes(id) && id !== REQUIRED_TEST[goal] && tests.length > MIN_TESTS;
}

export function validateBattery(goal: Goal, tests: readonly TestId[]): string | null {
  if (!tests.includes(REQUIRED_TEST[goal])) {
    return `${TEST_CATALOG[REQUIRED_TEST[goal]].name} is needed to answer your goal.`;
  }
  if (tests.length < MIN_TESTS) return `Pick at least ${MIN_TESTS} tests.`;
  return null;
}

/** Whole minutes the check-in takes, ratings included, rounded up to the half. */
export function estimateMinutes(tests: readonly TestId[]): number {
  const seconds = tests.reduce((sum, id) => sum + TEST_CATALOG[id].seconds, RATINGS_SECONDS);
  return Math.ceil((seconds / 60) * 2) / 2;
}

/** "3 min" / "2.5 min". */
export function formatMinutes(minutes: number): string {
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min`;
}

/** Every metric a battery yields: its tests' metrics plus the ratings. */
export function metricsForBattery(tests: readonly TestId[]): MetricKey[] {
  const out: MetricKey[] = [];
  for (const id of TEST_IDS) {
    if (tests.includes(id)) out.push(...TEST_CATALOG[id].metrics);
  }
  return [...out, ...RATING_METRICS];
}

/**
 * One screen of the check-in. Word memory splits in two (study at the start,
 * recognize at the end) so the other tests fill the delay.
 */
export type CheckInStep =
  | 'calm'
  | 'recall_study'
  | 'pvt'
  | 'nback'
  | 'stroop'
  | 'symbol'
  | 'recall_test'
  | 'ratings';

/**
 * The order the check-in runs. The calm check comes first, before the timed
 * tasks can stress or tire anyone; the word list is learned next and tested
 * last so there is a real delay; the sliders close it out.
 */
export function checkInSteps(tests: readonly TestId[]): CheckInStep[] {
  const has = (id: TestId) => tests.includes(id);
  const steps: CheckInStep[] = [];
  if (has('calm')) steps.push('calm');
  if (has('recall')) steps.push('recall_study');
  for (const id of ['pvt', 'nback', 'stroop', 'symbol'] as const) {
    if (has(id)) steps.push(id);
  }
  if (has('recall')) steps.push('recall_test');
  steps.push('ratings');
  return steps;
}
