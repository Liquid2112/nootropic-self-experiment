import { migrate } from '@/db/schema';
import { seedSupplements } from '@/db/seed';
import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import { createExperiment } from '@/engines/onboarding';
import type { ScheduleDay } from '@/db/types';
import {
  buildTimeline,
  buildWidgetSnapshot,
  daysBetween,
  nudgeFor,
  planLiveActivity,
  shortDateLabel,
  shortInstruction,
  syncWidgets,
  verdictDate,
  type NativeWidgetBridge,
  type WidgetInput,
} from '..';

const WINDOW = { startHour: 6, endHour: 11 };
const MIDNIGHT = Date.UTC(2026, 11, 1); // stand-in for local midnight
const H = 3_600_000;

function day(i: number, date: string, arm: ScheduleDay['arm'], taken = false): ScheduleDay {
  return { experimentId: 'e', dayIndex: i, date, arm, taken, takenAt: taken ? `${date}T08:00:00Z` : null };
}

const schedule: ScheduleDay[] = [
  day(0, '2026-12-01', 'A', true),
  day(1, '2026-12-02', 'B'),
  day(2, '2026-12-03', 'A'),
];

function input(patch: Partial<WidgetInput> = {}): WidgetInput {
  return {
    experiment: { blindingMode: 'sealed', lengthDays: 21, startDate: '2026-12-01' },
    schedule,
    isoDate: '2026-12-01',
    checkInDone: false,
    streak: 4,
    window: WINDOW,
    dayStartMs: MIDNIGHT,
    ...patch,
  };
}

describe('dates', () => {
  it('labels and counts days', () => {
    expect(shortDateLabel('2026-12-22')).toBe('Dec 22');
    expect(verdictDate({ startDate: '2026-12-01', lengthDays: 21 })).toBe('2026-12-22');
    expect(daysBetween('2026-12-01', '2026-12-22')).toBe(21);
    expect(daysBetween('2026-12-23', '2026-12-22')).toBe(0);
  });
});

describe('shortInstruction', () => {
  it('only names a cup on a blinded run, whatever the stored arm', () => {
    expect(shortInstruction('sealed', day(0, 'x', 'A'))).toBe('Cup A');
    expect(shortInstruction('sealed', day(0, 'x', 'ON'))).toBe('Cup A');
    expect(shortInstruction('self_blind', day(0, 'x', 'B'))).toBe('Cup B');
    expect(shortInstruction('self_blind', day(0, 'x', 'OFF'))).toBe('Cup B');
  });
  it('names ON/OFF only on an open run', () => {
    expect(shortInstruction('none', day(0, 'x', 'ON'))).toBe('Capsule day');
    expect(shortInstruction('none', day(0, 'x', 'OFF'))).toBe('No capsule');
  });
});

describe('buildWidgetSnapshot', () => {
  it('shows a run day with the countdown and the check-in link', () => {
    const s = buildWidgetSnapshot(input());
    expect(s.phase).toBe('run');
    expect(s.headline).toBe('Day 1 of 21');
    expect(s.instruction).toBe('Cup A');
    expect(s.doseDone).toBe(true);
    expect(s.daysToVerdict).toBe(21);
    expect(s.verdictDateLabel).toBe('Dec 22');
    expect(s.url).toBe('placebo://daily-test');
    expect(s.windowStartMs).toBe(MIDNIGHT + 6 * H);
    expect(s.windowEndMs).toBe(MIDNIGHT + 11 * H);
  });

  it('never carries an arm word on a blinded run', () => {
    const text = JSON.stringify(buildWidgetSnapshot(input({ isoDate: '2026-12-02' })));
    expect(text).not.toMatch(/\bON\b|\bOFF\b|supplement|placebo day/i);
  });

  it('shows the baseline before day 1', () => {
    const s = buildWidgetSnapshot(input({ isoDate: '2026-11-29' }));
    expect(s.phase).toBe('baseline');
    expect(s.headline).toBe('Baseline 2 of 3');
    expect(s.instruction).toBe('Test only');
    expect(s.daysToVerdict).toBe(23);
  });

  it('flips to the reveal once every day has passed', () => {
    const s = buildWidgetSnapshot(input({ isoDate: '2026-12-04' }));
    expect(s.phase).toBe('ready');
    expect(s.url).toBe('placebo://verdict');
  });

  it('invites a new user to start', () => {
    expect(buildWidgetSnapshot(input({ experiment: null })).phase).toBe('empty');
  });
});

describe('nudgeFor', () => {
  it('asks for what is left, then sells the reveal', () => {
    expect(nudgeFor({ doseDone: false, checkInDone: false, daysToVerdict: 9, streak: 2 })).toMatch(/Dose/);
    expect(nudgeFor({ doseDone: true, checkInDone: false, daysToVerdict: 9, streak: 2 })).toMatch(/Check-in/);
    expect(nudgeFor({ doseDone: true, checkInDone: true, daysToVerdict: 2, streak: 2 })).toBe('2 days to the reveal');
    expect(nudgeFor({ doseDone: true, checkInDone: true, daysToVerdict: 9, streak: 6 })).toMatch(/6-day streak/);
  });
});

describe('buildTimeline', () => {
  it('adds window open/close entries and the next midnights', () => {
    const entries = buildTimeline({ ...input(), nowMs: MIDNIGHT + 2 * H }, true, 2);
    expect(entries.map((e) => e.dateMs)).toEqual([
      MIDNIGHT + 2 * H,
      MIDNIGHT + 6 * H,
      MIDNIGHT + 11 * H,
      MIDNIGHT + 24 * H,
      MIDNIGHT + 48 * H,
    ]);
    expect(entries[3]!.props.headline).toBe('Day 2 of 21');
    expect(entries[3]!.props.instruction).toBe('Cup B');
    expect(entries[3]!.props.streak).toBe(4);
    expect(entries[4]!.props.streak).toBe(0);
  });

  it('drops the streak at midnight when today does not count yet', () => {
    const entries = buildTimeline({ ...input(), nowMs: MIDNIGHT + 12 * H }, false, 1);
    expect(entries).toHaveLength(2);
    expect(entries[1]!.props.streak).toBe(0);
  });
});

describe('planLiveActivity', () => {
  const snap = buildWidgetSnapshot(input());
  it('starts inside the window while the check-in is open', () => {
    const plan = planLiveActivity(snap, MIDNIGHT + 7 * H, false);
    expect(plan.action).toBe('start');
    if (plan.action === 'start') expect(plan.props.closesAtMs).toBe(MIDNIGHT + 11 * H);
  });
  it('updates a running one, ends it after the check-in or the window', () => {
    expect(planLiveActivity(snap, MIDNIGHT + 7 * H, true).action).toBe('update');
    expect(planLiveActivity({ ...snap, checkInDone: true }, MIDNIGHT + 7 * H, true).action).toBe('end');
    expect(planLiveActivity(snap, MIDNIGHT + 12 * H, true).action).toBe('end');
    expect(planLiveActivity(snap, MIDNIGHT + 12 * H, false).action).toBe('none');
  });
});

describe('syncWidgets', () => {
  function fakeBridge(running = 0) {
    const calls: string[] = [];
    let timeline = 0;
    const bridge: NativeWidgetBridge = {
      available: true,
      setTimeline(entries) {
        timeline = entries.length;
        calls.push('timeline');
      },
      runningActivityCount: () => running,
      startActivity: async () => void calls.push('start'),
      updateActivity: async () => void calls.push('update'),
      endActivities: async () => void calls.push('end'),
    };
    return { bridge, calls, timeline: () => timeline };
  }

  it('writes the empty state when there is no run', async () => {
    const db = createMemoryDriver();
    migrate(db);
    const fake = fakeBridge();
    const result = await syncWidgets(db, fake.bridge, new Date(2026, 11, 1, 9));
    expect(fake.calls).toEqual(['timeline']);
    expect(result.liveActivity).toBe('none');
  });

  it('starts the Live Activity during the window of an active run', async () => {
    const db = createMemoryDriver();
    migrate(db);
    seedSupplements(db);
    createExperiment(
      db,
      {
        goal: 'focus',
        supplement: { kind: 'other', name: 'Test', type: 'acute' },
        lengthDays: 21,
        blindingMode: 'self_blind',
        testWindow: 'morning',
        startDate: '2026-12-01',
      },
      { experimentId: 'e1', seed: 's' },
    );
    const fake = fakeBridge();
    const result = await syncWidgets(db, fake.bridge, new Date(2026, 11, 1, 9));
    expect(result.liveActivity).toBe('start');
    expect(fake.calls).toEqual(['timeline', 'start']);
    expect(fake.timeline()).toBeGreaterThan(3);
  });

  it('does nothing without the native module', async () => {
    const db = createMemoryDriver();
    migrate(db);
    const result = await syncWidgets(db, { ...fakeBridge().bridge, available: false });
    expect(result).toEqual({ entries: 0, liveActivity: 'none' });
  });
});
