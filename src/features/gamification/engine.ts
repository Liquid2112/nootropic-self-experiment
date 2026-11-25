/**
 * Gamification engine — pure logic.
 *
 * XP, levels, streaks, badges and daily quests are all *derived* from the
 * activity the app already records (check-ins, doses marked taken, free
 * reaction tests). Nothing is stored twice, so the numbers can never drift from
 * the real data, and deleting the app state never loses progress.
 *
 * Blinding rule (critical): this module never looks at a check-in's scores,
 * only at *when* a check-in happened. Rewards are the same on every day of a
 * run whatever the arm, so no XP total, badge or streak can hint at which days
 * were active. The only performance-based badges use the free reaction test,
 * which is not part of any experiment.
 */

/** XP awarded per action. */
export const XP_REWARDS = {
  /** A daily check-in (counted once per day). */
  checkIn: 50,
  /** A dose marked taken (once per day). */
  dose: 20,
  /** A free reaction test (up to QUICK_TEST_DAILY_CAP per day). */
  quickTest: 15,
  /** Bonus for a day with both the dose and the check-in done. */
  perfectDay: 25,
} as const;

/** Reaction tests beyond this many per day earn no XP (keeps grinding in check). */
export const QUICK_TEST_DAILY_CAP = 3;

/** Everything the engine needs, already reduced to local calendar days. */
export type ActivityInput = {
  /** Local YYYY-MM-DD of each check-in (duplicates allowed). */
  checkInDays: string[];
  /** Local YYYY-MM-DD of each dose marked taken (duplicates allowed). */
  doseDays: string[];
  /** Free reaction-test runs. */
  quickTests: { day: string; medianMs: number }[];
  /** Experiments that reached their verdict. */
  finishedRuns: number;
};

// --- dates -------------------------------------------------------------------

/** Local calendar day (YYYY-MM-DD) of a Date. */
export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local calendar day of an ISO timestamp (or a bare YYYY-MM-DD, returned as is). */
export function localDayOfIso(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso.slice(0, 10) : localDay(parsed);
}

/** Shift a YYYY-MM-DD day by `delta` calendar days. */
export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

// --- streaks -----------------------------------------------------------------

export type StreakInfo = {
  /** Consecutive active days ending today (or yesterday, if today isn't done yet). */
  current: number;
  /** Longest run of consecutive active days ever. */
  longest: number;
  /** True when today already counts toward the streak. */
  activeToday: boolean;
  /** True when the streak is alive but today isn't done yet: it ends at midnight. */
  atRisk: boolean;
};

/**
 * A day is "active" when the user did any of: a check-in, a dose, a reaction
 * test. The streak survives until the end of the day after the last active
 * day, so a user who hasn't done today yet still sees yesterday's streak (and
 * an at-risk nudge) instead of a zero.
 */
export function computeStreaks(activeDays: Iterable<string>, today: string): StreakInfo {
  const days = new Set(activeDays);
  const activeToday = days.has(today);
  const yesterday = addDays(today, -1);

  let current = 0;
  let cursor = activeToday ? today : days.has(yesterday) ? yesterday : null;
  while (cursor && days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...days].sort()) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  return { current, longest, activeToday, atRisk: !activeToday && current > 0 };
}

// --- levels ------------------------------------------------------------------

/** Original level titles, from first launch to a seasoned self-experimenter. */
export const LEVEL_TITLES = [
  'Curious',
  'Baseline',
  'Primed',
  'Focused',
  'Dialed In',
  'Locked In',
  'Flow State',
  'Biohacker',
  'Mad Scientist',
  'Neural Architect',
] as const;

/** Total XP needed to reach `level` (level 1 starts at 0). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export type LevelInfo = {
  level: number;
  title: string;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP span of the current level. */
  xpForNext: number;
  /** 0..1 progress to the next level. */
  progress: number;
};

export function levelForXp(xp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level += 1;
  }
  const floor = xpForLevel(level);
  const span = xpForLevel(level + 1) - floor;
  const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1] ?? 'Neural Architect';
  return {
    level,
    title,
    xpIntoLevel: xp - floor,
    xpForNext: span,
    progress: span > 0 ? (xp - floor) / span : 0,
  };
}

// --- badges ------------------------------------------------------------------

export type GameStats = {
  totalXp: number;
  level: number;
  checkIns: number;
  doses: number;
  quickTests: number;
  bestQuickMs: number | null;
  perfectDays: number;
  longestStreak: number;
  finishedRuns: number;
};

export type Badge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: (s: GameStats) => boolean;
};

export const BADGES: readonly Badge[] = [
  { id: 'first_checkin', emoji: '🧪', title: 'First Data Point', description: 'Finish your first check-in.', unlocked: (s) => s.checkIns >= 1 },
  { id: 'first_dose', emoji: '💊', title: 'Committed', description: 'Mark your first dose taken.', unlocked: (s) => s.doses >= 1 },
  { id: 'perfect_day', emoji: '✨', title: 'Perfect Day', description: 'Dose and check-in on the same day.', unlocked: (s) => s.perfectDays >= 1 },
  { id: 'streak_3', emoji: '🔥', title: 'Warming Up', description: 'Reach a 3-day streak.', unlocked: (s) => s.longestStreak >= 3 },
  { id: 'streak_7', emoji: '📆', title: 'One Week Strong', description: 'Reach a 7-day streak.', unlocked: (s) => s.longestStreak >= 7 },
  { id: 'streak_14', emoji: '🧠', title: 'Fortnight Focus', description: 'Reach a 14-day streak.', unlocked: (s) => s.longestStreak >= 14 },
  { id: 'streak_30', emoji: '💎', title: 'Unbreakable', description: 'Reach a 30-day streak.', unlocked: (s) => s.longestStreak >= 30 },
  { id: 'checkins_10', emoji: '📈', title: 'Ten Trials', description: 'Log 10 check-ins.', unlocked: (s) => s.checkIns >= 10 },
  { id: 'checkins_25', emoji: '🗄️', title: 'Data Hoarder', description: 'Log 25 check-ins.', unlocked: (s) => s.checkIns >= 25 },
  { id: 'perfect_7', emoji: '⏱️', title: 'Clockwork', description: 'Have 7 perfect days.', unlocked: (s) => s.perfectDays >= 7 },
  { id: 'quick_first', emoji: '⚡', title: 'Reflex Check', description: 'Take a free reaction test.', unlocked: (s) => s.quickTests >= 1 },
  { id: 'quick_10', emoji: '🎯', title: 'Reflex Junkie', description: 'Take 10 reaction tests.', unlocked: (s) => s.quickTests >= 10 },
  { id: 'quick_250', emoji: '🏎️', title: 'Quick Draw', description: 'Score under 250 ms on a reaction test.', unlocked: (s) => s.bestQuickMs !== null && s.bestQuickMs < 250 },
  { id: 'quick_200', emoji: '🌩️', title: 'Lightning', description: 'Score under 200 ms on a reaction test.', unlocked: (s) => s.bestQuickMs !== null && s.bestQuickMs < 200 },
  { id: 'level_5', emoji: '🎚️', title: 'Dialed In', description: 'Reach level 5.', unlocked: (s) => s.level >= 5 },
  { id: 'run_complete', emoji: '🏆', title: 'Verdict Earned', description: 'Finish a full experiment.', unlocked: (s) => s.finishedRuns >= 1 },
];

// --- the whole picture -------------------------------------------------------

export type GameState = {
  stats: GameStats;
  level: LevelInfo;
  streak: StreakInfo;
  /** Ids of every unlocked badge, in BADGES order. */
  badges: string[];
  /** Today's activity, for the daily quests. */
  today: { checkIn: boolean; dose: boolean; quickTests: number };
};

function countByDay(days: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const day of days) {
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/** Derive the full game state from recorded activity. */
export function computeGameState(input: ActivityInput, today: string): GameState {
  const checkInDays = new Set(input.checkInDays);
  const doseDays = new Set(input.doseDays);
  const quickByDay = countByDay(input.quickTests.map((q) => q.day));

  let xp = checkInDays.size * XP_REWARDS.checkIn + doseDays.size * XP_REWARDS.dose;
  for (const count of quickByDay.values()) {
    xp += Math.min(count, QUICK_TEST_DAILY_CAP) * XP_REWARDS.quickTest;
  }
  let perfectDays = 0;
  for (const day of checkInDays) {
    if (doseDays.has(day)) {
      perfectDays += 1;
    }
  }
  xp += perfectDays * XP_REWARDS.perfectDay;

  const streak = computeStreaks([...checkInDays, ...doseDays, ...quickByDay.keys()], today);
  const level = levelForXp(xp);
  const bestQuickMs = input.quickTests.length
    ? Math.min(...input.quickTests.map((q) => q.medianMs))
    : null;

  const stats: GameStats = {
    totalXp: xp,
    level: level.level,
    checkIns: input.checkInDays.length,
    doses: doseDays.size,
    quickTests: input.quickTests.length,
    bestQuickMs,
    perfectDays,
    longestStreak: streak.longest,
    finishedRuns: input.finishedRuns,
  };

  return {
    stats,
    level,
    streak,
    badges: BADGES.filter((b) => b.unlocked(stats)).map((b) => b.id),
    today: {
      checkIn: checkInDays.has(today),
      dose: doseDays.has(today),
      quickTests: quickByDay.get(today) ?? 0,
    },
  };
}

// --- daily quests ------------------------------------------------------------

export type Quest = {
  id: 'dose' | 'check_in' | 'reaction';
  emoji: string;
  title: string;
  xp: number;
  done: boolean;
  /** Bonus quests don't count toward the daily goal. */
  bonus: boolean;
};

export type QuestInput = {
  /** Today is a run day with a dose to take. */
  doseScheduled: boolean;
  /** Today accepts a recorded check-in (run day or baseline day). */
  checkInScheduled: boolean;
  game: GameState;
  /** Override the dose quest's title (e.g. an open run's no-capsule day). */
  doseTitle?: string;
};

/** Today's quests: the core actions plus a bonus reaction test. */
export function buildDailyQuests({ doseScheduled, checkInScheduled, game, doseTitle }: QuestInput): Quest[] {
  const quests: Quest[] = [];
  if (doseScheduled) {
    quests.push({ id: 'dose', emoji: '💊', title: doseTitle ?? 'Take today’s dose', xp: XP_REWARDS.dose, done: game.today.dose, bonus: false });
  }
  if (checkInScheduled) {
    quests.push({
      id: 'check_in',
      emoji: '🧠',
      title: 'Finish your check-in',
      xp: XP_REWARDS.checkIn + (doseScheduled ? XP_REWARDS.perfectDay : 0),
      done: game.today.checkIn,
      bonus: false,
    });
  }
  quests.push({
    id: 'reaction',
    emoji: '⚡',
    title: 'Bonus: a reaction test',
    xp: XP_REWARDS.quickTest,
    done: game.today.quickTests > 0,
    bonus: true,
  });
  return quests;
}

/** 0..1 share of today's required (non-bonus) quests done. 1 when none are due. */
export function dailyGoalProgress(quests: Quest[]): number {
  const required = quests.filter((q) => !q.bonus);
  if (required.length === 0) {
    return 1;
  }
  return required.filter((q) => q.done).length / required.length;
}

// --- celebrations ------------------------------------------------------------

/** What the app last showed the user, to tell what's new since. */
export type Snapshot = {
  xp: number;
  level: number;
  streak: number;
  badges: string[];
};

export function snapshotOf(game: GameState): Snapshot {
  return {
    xp: game.stats.totalXp,
    level: game.level.level,
    streak: game.streak.current,
    badges: [...game.badges],
  };
}

export type ProgressDelta = {
  xpGained: number;
  /** The new level when the user levelled up, else null. */
  levelUp: number | null;
  newBadges: Badge[];
  /** The streak now, and whether it grew since the snapshot. */
  streak: number;
  streakGrew: boolean;
};

/** What changed between the last snapshot and now. */
export function diffSnapshots(previous: Snapshot, next: Snapshot): ProgressDelta {
  const seen = new Set(previous.badges);
  return {
    xpGained: Math.max(0, next.xp - previous.xp),
    levelUp: next.level > previous.level ? next.level : null,
    newBadges: BADGES.filter((b) => next.badges.includes(b.id) && !seen.has(b.id)),
    streak: next.streak,
    streakGrew: next.streak > previous.streak,
  };
}

/** True when there is anything worth celebrating. */
export function hasNews(delta: ProgressDelta): boolean {
  return delta.xpGained > 0 || delta.levelUp !== null || delta.newBadges.length > 0;
}
