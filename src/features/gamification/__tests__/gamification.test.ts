import { appState, quickTests } from '@/db/repositories';
import { migrate } from '@/db/schema';
import { seedSupplements } from '@/db/seed';
import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import {
  addDays,
  buildDailyQuests,
  claimProgress,
  computeGameState,
  computeStreaks,
  dailyGoalProgress,
  diffSnapshots,
  ensureSnapshot,
  hasNews,
  levelForXp,
  localDayOfIso,
  loadGameState,
  xpForLevel,
  XP_REWARDS,
  type ActivityInput,
} from '..';

const EMPTY: ActivityInput = { checkInDays: [], doseDays: [], quickTests: [], finishedRuns: 0 };

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('keeps a bare day as is', () => {
    expect(localDayOfIso('2026-11-25')).toBe('2026-11-25');
  });
});

describe('computeStreaks', () => {
  const today = '2026-11-25';

  it('counts back from today when today is done', () => {
    const s = computeStreaks(['2026-11-23', '2026-11-24', '2026-11-25'], today);
    expect(s).toEqual({ current: 3, longest: 3, activeToday: true, atRisk: false });
  });

  it('keeps yesterday’s streak alive but at risk until today is done', () => {
    const s = computeStreaks(['2026-11-23', '2026-11-24'], today);
    expect(s.current).toBe(2);
    expect(s.atRisk).toBe(true);
  });

  it('breaks after a missed day and remembers the longest run', () => {
    const s = computeStreaks(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-23'], today);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(4);
    expect(s.atRisk).toBe(false);
  });
});

describe('levels', () => {
  it('starts at level 1 with growing thresholds', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(5)).toBe(1000);
    expect(levelForXp(0)).toMatchObject({ level: 1, title: 'Curious', xpIntoLevel: 0, xpForNext: 100 });
    expect(levelForXp(150)).toMatchObject({ level: 2, xpIntoLevel: 50, xpForNext: 200, progress: 0.25 });
  });

  it('caps the title past the last one', () => {
    expect(levelForXp(1_000_000).title).toBe('Neural Architect');
  });
});

describe('computeGameState', () => {
  const today = '2026-11-25';

  it('awards XP per day with a perfect-day bonus and a reaction-test cap', () => {
    const game = computeGameState(
      {
        checkInDays: [today, today],
        doseDays: [today],
        quickTests: Array.from({ length: 5 }, () => ({ day: today, medianMs: 300 })),
        finishedRuns: 0,
      },
      today,
    );
    expect(game.stats.totalXp).toBe(
      XP_REWARDS.checkIn + XP_REWARDS.dose + XP_REWARDS.perfectDay + 3 * XP_REWARDS.quickTest,
    );
    expect(game.today).toEqual({ checkIn: true, dose: true, quickTests: 5 });
    expect(game.badges).toEqual(
      expect.arrayContaining(['first_checkin', 'first_dose', 'perfect_day', 'quick_first']),
    );
  });

  it('unlocks reaction-time and streak badges from the right data', () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
    const game = computeGameState(
      { ...EMPTY, checkInDays: days, quickTests: [{ day: today, medianMs: 199 }] },
      today,
    );
    expect(game.streak.current).toBe(7);
    expect(game.badges).toEqual(
      expect.arrayContaining(['streak_3', 'streak_7', 'quick_250', 'quick_200']),
    );
    expect(game.badges).not.toContain('streak_14');
  });

  it('starts empty for a new user', () => {
    const game = computeGameState(EMPTY, today);
    expect(game.stats.totalXp).toBe(0);
    expect(game.badges).toEqual([]);
    expect(game.streak.current).toBe(0);
  });
});

describe('daily quests', () => {
  const today = '2026-11-25';

  it('lists dose, check-in and a bonus on a run day', () => {
    const game = computeGameState({ ...EMPTY, doseDays: [today] }, today);
    const quests = buildDailyQuests({ doseScheduled: true, checkInScheduled: true, game });
    expect(quests.map((q) => [q.id, q.done])).toEqual([
      ['dose', true],
      ['check_in', false],
      ['reaction', false],
    ]);
    expect(dailyGoalProgress(quests)).toBe(0.5);
  });

  it('has no dose quest on a baseline day', () => {
    const game = computeGameState({ ...EMPTY, checkInDays: [today] }, today);
    const quests = buildDailyQuests({ doseScheduled: false, checkInScheduled: true, game });
    expect(quests.map((q) => q.id)).toEqual(['check_in', 'reaction']);
    expect(dailyGoalProgress(quests)).toBe(1);
  });
});

describe('celebration snapshots', () => {
  it('reports XP, level-ups and new badges since the last snapshot', () => {
    const delta = diffSnapshots(
      { xp: 80, level: 1, streak: 2, badges: ['first_checkin'] },
      { xp: 175, level: 2, streak: 3, badges: ['first_checkin', 'streak_3'] },
    );
    expect(delta.xpGained).toBe(95);
    expect(delta.levelUp).toBe(2);
    expect(delta.newBadges.map((b) => b.id)).toEqual(['streak_3']);
    expect(delta.streakGrew).toBe(true);
    expect(hasNews(delta)).toBe(true);
  });

  it('has nothing to report when nothing changed', () => {
    const s = { xp: 80, level: 1, streak: 2, badges: [] };
    expect(hasNews(diffSnapshots(s, s))).toBe(false);
  });
});

describe('store', () => {
  function freshDb() {
    const db = createMemoryDriver();
    migrate(db);
    seedSupplements(db);
    return db;
  }

  const now = new Date(2026, 10, 25, 12, 0, 0);

  it('seeds a silent snapshot, then celebrates the next action once', () => {
    const db = freshDb();
    ensureSnapshot(db, now);
    expect(appState.get(db, 'game_snapshot_v1')).toBeDefined();

    quickTests.insert(db, { id: 'q1', takenAt: now.toISOString(), medianMs: 240, lapses: 0, trials: 12 });
    const first = claimProgress(db, now);
    expect(first.delta.xpGained).toBe(XP_REWARDS.quickTest);
    expect(first.delta.newBadges.map((b) => b.id)).toEqual(['quick_first', 'quick_250']);

    const second = claimProgress(db, now);
    expect(hasNews(second.delta)).toBe(false);
  });

  it('reads game state straight from the database', () => {
    const db = freshDb();
    expect(loadGameState(db, now).stats.totalXp).toBe(0);
  });
});
