import { migrate } from '@/db/schema';
import { seedSupplements } from '@/db/seed';
import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import { experiments } from '@/db/repositories';
import { createExperiment } from '@/engines/onboarding';
import {
  NOT_MEDICAL_ADVICE,
  REACTION_OPTIONS,
  activePause,
  endExperimentForSafety,
  logBadReaction,
  resumeExperiment,
  safetyMessage,
} from '@/features/safety';
import { pausedSnapshot, syncWidgets, type NativeWidgetBridge } from '@/features/widget';
import { cancelDailyReminders, type NotificationsAdapter } from '@/features/notifications';

function setup() {
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
  return db;
}

describe('safety message', () => {
  it('sends a serious reaction to emergency services and names the supplement', () => {
    const msg = safetyMessage('severe', 'Caffeine');
    expect(msg.emergency).toBe(true);
    expect(msg.lines.join(' ')).toMatch(/911/);
    expect(msg.lines.join(' ')).toMatch(/Caffeine/);
    expect(msg.lines.join(' ')).toMatch(/any more doses/);
  });

  it('tells the user to stop and talk to a doctor or pharmacist otherwise', () => {
    const msg = safetyMessage('unwell', 'Caffeine');
    expect(msg.emergency).toBe(false);
    const text = msg.lines.join(' ');
    expect(text).toMatch(/Stop taking it/);
    expect(text).toMatch(/doctor or pharmacist/);
    expect(text).toMatch(/1-800-222-1222/);
  });

  it('never gives medical advice: no dosing, no reassurance, no diagnosis', () => {
    const all = [
      ...safetyMessage('severe', 'X').lines,
      ...safetyMessage('unwell', 'X').lines,
      ...REACTION_OPTIONS.map((o) => o.examples),
      NOT_MEDICAL_ADVICE,
    ].join(' ');
    expect(all).not.toMatch(/\b(mg|lower (the )?dose|half|probably|normal|harmless|safe to continue|side effect of)\b/i);
  });

  it('never reveals a cup or arm', () => {
    const all = [...safetyMessage('severe', 'X').lines, ...safetyMessage('unwell', 'X').lines].join(' ');
    expect(all).not.toMatch(/\bcup\b|\bON\b|\bOFF\b|placebo day/i);
  });
});

describe('pause, resume, end', () => {
  it('logging a reaction pauses the run; resuming lifts it', () => {
    const db = setup();
    expect(activePause(db, 'e1')).toBeNull();
    logBadReaction(db, { experimentId: 'e1', severity: 'unwell', dayIndex: 4, id: 'a1', now: new Date('2026-12-05T10:00:00Z') });
    expect(activePause(db, 'e1')).toMatchObject({ id: 'a1', severity: 'unwell', dayIndex: 4 });
    resumeExperiment(db, 'e1', new Date('2026-12-07T10:00:00Z'));
    expect(activePause(db, 'e1')).toBeNull();
    expect(experiments.getById(db, 'e1')?.status).toBe('active');
  });

  it('ending closes the pause and abandons the run', () => {
    const db = setup();
    logBadReaction(db, { experimentId: 'e1', severity: 'severe', dayIndex: 2 });
    endExperimentForSafety(db, 'e1');
    expect(activePause(db, 'e1')).toBeNull();
    expect(experiments.getById(db, 'e1')?.status).toBe('abandoned');
  });
});

describe('paused run elsewhere in the app', () => {
  it('the widget shows a vague paused state and the Live Activity ends', async () => {
    const db = setup();
    logBadReaction(db, { experimentId: 'e1', severity: 'unwell', dayIndex: 0 });
    let props: unknown = null;
    const calls: string[] = [];
    const bridge: NativeWidgetBridge = {
      available: true,
      setTimeline: (entries) => void (props = entries[0]?.props),
      runningActivityCount: () => 1,
      startActivity: async () => void calls.push('start'),
      updateActivity: async () => void calls.push('update'),
      endActivities: async () => void calls.push('end'),
    };
    const result = await syncWidgets(db, bridge, new Date(2026, 11, 1, 9));
    expect(result.liveActivity).toBe('end');
    expect(calls).toEqual(['end']);
    expect(props).toEqual(pausedSnapshot());
    // Lock-screen safe: nothing about the reaction itself.
    expect(JSON.stringify(pausedSnapshot())).not.toMatch(/reaction|unwell|sick/i);
  });

  it('cancels only the daily reminders, keeping the trial reminder', async () => {
    const cancelled: string[] = [];
    const adapter: NotificationsAdapter = {
      requestPermissions: async () => true,
      cancelAll: async () => void cancelled.push('*'),
      schedule: async () => undefined,
      cancel: async (id) => void cancelled.push(id),
    };
    await cancelDailyReminders(adapter);
    expect(cancelled).toEqual(['daily-dose-instruction', 'daily-check-in']);
  });
});
