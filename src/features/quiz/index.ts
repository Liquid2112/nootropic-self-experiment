/**
 * Onboarding quiz — pure logic.
 *
 * A short quiz that sells the payoff of a full run before asking for anything:
 * what the user takes, what it costs them, and whether they actually know it
 * works. It ends with a Brain Baseline (the free reaction test, as a
 * score) and a dated plan to the verdict reveal. Everything here is pure
 * so tests pin the copy, and the money math.
 */
import type { Goal, TestWindowId } from '@/engines/onboarding/types';

export type QuizOption = {
  id: string;
  label: string;
  /** Optional one-line helper under the label. */
  hint?: string;
};

export type QuizQuestion = {
  id: QuizQuestionId;
  /** Small step label above the title, e.g. "Your stack". */
  eyebrow: string;
  title: string;
  subtitle?: string;
  options: QuizOption[];
};

export type QuizQuestionId =
  | 'goal'
  | 'stack'
  | 'duration'
  | 'spend'
  | 'confidence'
  | 'ifNot'
  | 'peak'
  | 'commitment';

export type QuizAnswers = Partial<Record<QuizQuestionId, string>>;

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'goal',
    eyebrow: 'Your goal',
    title: 'What do you want your stack to do?',
    options: [
      { id: 'focus', label: 'Sharper focus', hint: 'Judged on reaction time' },
      { id: 'memory', label: 'Better memory', hint: 'Judged on a working-memory task' },
      { id: 'calm', label: 'Calmer mood', hint: 'Judged on your daily mood rating' },
      { id: 'sleep', label: 'More energy after sleep', hint: 'Judged on next-day energy' },
    ],
  },
  {
    id: 'stack',
    eyebrow: 'Your stack',
    title: 'What are you taking, or thinking about?',
    options: [
      { id: 'lions_mane', label: "Lion's mane" },
      { id: 'caffeine_theanine', label: 'Caffeine + L-theanine' },
      { id: 'creatine', label: 'Creatine' },
      { id: 'ashwagandha', label: 'Ashwagandha' },
      { id: 'racetam', label: 'A racetam' },
      { id: 'other', label: 'Something else' },
    ],
  },
  {
    id: 'duration',
    eyebrow: 'Your stack',
    title: 'How long have you been taking it?',
    options: [
      { id: 'not_yet', label: "Haven't started" },
      { id: 'under_1m', label: 'Less than a month' },
      { id: '1_6m', label: '1 to 6 months' },
      { id: 'over_6m', label: 'More than 6 months' },
    ],
  },
  {
    id: 'spend',
    eyebrow: 'The money',
    title: 'Roughly what do you spend on supplements a month?',
    options: [
      { id: 'lt25', label: 'Under $25' },
      { id: '25_75', label: '$25 to $75' },
      { id: '75_150', label: '$75 to $150' },
      { id: 'gt150', label: 'More than $150' },
    ],
  },
  {
    id: 'confidence',
    eyebrow: 'Be honest',
    title: 'Do you actually know it works?',
    options: [
      { id: 'feel_it', label: 'Yes, I can feel it' },
      { id: 'think_so', label: 'I think so' },
      { id: 'no_idea', label: 'No idea, honestly' },
      { id: 'placebo', label: "It's probably placebo" },
    ],
  },
  {
    id: 'ifNot',
    eyebrow: 'Be honest',
    title: "If it turned out to do nothing for you, you'd…",
    options: [
      { id: 'stop', label: 'Stop and keep the money' },
      { id: 'switch', label: 'Try something else' },
      { id: 'dose', label: 'Change how I take it' },
      { id: 'keep', label: 'Keep taking it anyway' },
    ],
  },
  {
    id: 'peak',
    eyebrow: 'Your routine',
    title: 'When is your brain usually at its best?',
    subtitle: 'Your daily 90-second check-in goes here, at the same time each day.',
    options: [
      { id: 'early_morning', label: 'Early morning', hint: '6 to 8 am' },
      { id: 'morning', label: 'Morning', hint: '8 to 11 am' },
      { id: 'midday', label: 'Midday', hint: '11 am to 2 pm' },
      { id: 'afternoon', label: 'Afternoon', hint: '2 to 6 pm' },
      { id: 'evening', label: 'Evening', hint: '6 to 10 pm' },
    ],
  },
  {
    id: 'commitment',
    eyebrow: 'Last one',
    title: 'Can you give it 90 seconds a day for 4 weeks?',
    subtitle: "That's what a real answer takes. Most people never find out.",
    options: [
      { id: 'all_in', label: "I'm in, every day" },
      { id: 'most', label: 'Most days' },
      { id: 'unsure', label: 'Not sure yet' },
    ],
  },
];

/**
 * Short interstitial facts shown between questions, keyed by the question
 * they follow. Kept plain and defensible: no effect sizes we can't source.
 */
export const QUIZ_INTERSTITIALS: Partial<Record<QuizQuestionId, { title: string; body: string }>> = {
  spend: {
    title: 'Placebo is powerful',
    body: 'In clinical trials, people on sugar pills regularly report feeling better. Feeling a supplement work is not the same as it working.',
  },
  ifNot: {
    title: 'How Placebo finds out',
    body: 'You take a supplement on some days and a look-alike on others, without knowing which is which. A 90-second test each day measures your brain. At the end, we unseal the schedule and compare.',
  },
};

/** Midpoint monthly spend for each answer, in dollars. */
const MONTHLY_SPEND: Record<string, number> = { lt25: 15, '25_75': 50, '75_150': 110, gt150: 200 };

/** Estimated yearly spend from the quiz, or null if unanswered. */
export function yearlySpend(answers: QuizAnswers): number | null {
  const monthly = answers.spend ? MONTHLY_SPEND[answers.spend] : undefined;
  return monthly === undefined ? null : monthly * 12;
}

/** The goal the quiz picked, if any. */
export function quizGoal(answers: QuizAnswers): Goal | null {
  const g = answers.goal;
  return g === 'focus' || g === 'memory' || g === 'calm' || g === 'sleep' ? g : null;
}

/** The test window the quiz picked, if any. */
export function quizTestWindow(answers: QuizAnswers): TestWindowId | null {
  const p = answers.peak;
  return p === 'early_morning' || p === 'morning' || p === 'midday' || p === 'afternoon' || p === 'evening'
    ? p
    : null;
}

/**
 * The "why finish" line for the plan screen: ties the verdict to what the
 * user told us they spend and believe.
 */
export function stakesLine(answers: QuizAnswers): string {
  const yearly = yearlySpend(answers);
  const money = yearly !== null ? `about $${yearly.toLocaleString('en-US')} a year` : 'your money';
  switch (answers.confidence) {
    case 'feel_it':
      return `You feel it working. In 4 weeks you'll know if that's the supplement or you, before you spend ${money} on it.`;
    case 'placebo':
      return `You suspect it's placebo. In 4 weeks you'll have proof either way, and you can stop guessing with ${money}.`;
    default:
      return `Right now you're spending ${money} on a guess. In 4 weeks you'll have an answer.`;
  }
}

// --- Plan timeline -------------------------------------------------------------

export type PlanMilestone = { id: 'baseline' | 'start' | 'halfway' | 'verdict'; label: string; date: Date };

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * The dated plan shown before setup: baseline today, run start after the
 * 3-day baseline, halfway, and the verdict reveal the day after the last run day.
 */
export function planMilestones(today: Date, lengthDays: number, baselineDays = 3): PlanMilestone[] {
  const start = addDays(today, baselineDays);
  return [
    { id: 'baseline', label: 'Baseline starts', date: addDays(today, 0) },
    { id: 'start', label: 'Experiment begins', date: start },
    { id: 'halfway', label: 'Halfway', date: addDays(start, Math.floor(lengthDays / 2)) },
    { id: 'verdict', label: 'Verdict unlocks', date: addDays(start, lengthDays) },
  ];
}

/** "Fri, Dec 26" style label. */
export function shortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
