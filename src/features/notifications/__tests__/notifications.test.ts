import {
  buildDailyReminders,
  createExpoAdapter,
  loadNotificationsAdapter,
  noopNotificationsAdapter,
  scheduleDailyReminders,
  scheduleOneOff,
  type OneOffReminder,
  type NotificationsAdapter,
  type ReminderPlan,
} from '..';
import type { CheckInWindow } from '@/features/daily-loop';

const WINDOW: CheckInWindow = { startHour: 6, endHour: 11 };

describe('buildDailyReminders', () => {
  it('fires the morning instruction at the window start', () => {
    const plans = buildDailyReminders({ window: WINDOW, morningInstruction: 'Take cup A today.' });
    const morning = plans.find((p) => p.id === 'daily-dose-instruction');
    expect(morning?.hour).toBe(6);
    expect(morning?.body).toBe('Take cup A today.');
  });

  it('fires the check-in reminder one hour before the window closes', () => {
    const plans = buildDailyReminders({ window: WINDOW, morningInstruction: 'x' });
    const checkIn = plans.find((p) => p.id === 'daily-check-in');
    expect(checkIn?.hour).toBe(10);
  });

  it('never embeds an ON/OFF arm — it echoes the already-blinded instruction', () => {
    const plans = buildDailyReminders({
      window: WINDOW,
      morningInstruction: 'Take the capsule from cup B today.',
    });
    for (const plan of plans) {
      expect(plan.body).not.toMatch(/ON day|OFF day/);
    }
  });

  it('clamps the reminder hour to the start for a one-hour window', () => {
    const plans = buildDailyReminders({
      window: { startHour: 9, endHour: 10 },
      morningInstruction: 'x',
    });
    expect(plans.find((p) => p.id === 'daily-check-in')?.hour).toBe(9);
  });
});

describe('scheduleDailyReminders', () => {
  function recordingAdapter(granted: boolean): {
    adapter: NotificationsAdapter;
    scheduled: ReminderPlan[];
    cancelCount: () => number;
  } {
    const scheduled: ReminderPlan[] = [];
    let cancelled = 0;
    const adapter: NotificationsAdapter = {
      async requestPermissions() {
        return granted;
      },
      async cancelAll() {
        cancelled += 1;
      },
      async schedule(plan) {
        scheduled.push(plan);
      },
    };
    return { adapter, scheduled, cancelCount: () => cancelled };
  }

  it('schedules both reminders after cancelling existing ones when permission is granted', async () => {
    const rec = recordingAdapter(true);
    const result = await scheduleDailyReminders(
      { window: WINDOW, morningInstruction: 'Take cup A today.' },
      rec.adapter,
    );
    expect(result).toEqual({ scheduled: true, count: 2 });
    expect(rec.scheduled).toHaveLength(2);
    expect(rec.cancelCount()).toBe(1);
  });

  it('degrades to a clean no-op when permission is denied', async () => {
    const rec = recordingAdapter(false);
    const result = await scheduleDailyReminders(
      { window: WINDOW, morningInstruction: 'x' },
      rec.adapter,
    );
    expect(result).toEqual({ scheduled: false, count: 0 });
    expect(rec.scheduled).toHaveLength(0);
  });

  it('does nothing harmful with the no-op adapter', async () => {
    const result = await scheduleDailyReminders(
      { window: WINDOW, morningInstruction: 'x' },
      noopNotificationsAdapter,
    );
    expect(result).toEqual({ scheduled: false, count: 0 });
  });
});

describe('createExpoAdapter', () => {
  it('returns the no-op adapter when the module lacks the expected API', () => {
    expect(createExpoAdapter({})).toBe(noopNotificationsAdapter);
  });

  it('maps a granted permission response and schedules a daily trigger', async () => {
    const calls: unknown[] = [];
    const fakeModule = {
      requestPermissionsAsync: async () => ({ granted: true }),
      cancelAllScheduledNotificationsAsync: async () => undefined,
      scheduleNotificationAsync: async (req: unknown) => {
        calls.push(req);
        return 'id';
      },
      SchedulableTriggerInputTypes: { DAILY: 'daily' },
    };
    const adapter = createExpoAdapter(fakeModule);
    expect(await adapter.requestPermissions()).toBe(true);
    await adapter.schedule({
      id: 'daily-check-in',
      title: 'Daily check-in',
      body: 'x',
      hour: 10,
      minute: 0,
    });
    expect(calls).toHaveLength(1);
    const req = calls[0] as { trigger: { type: string; hour: number } };
    expect(req.trigger.type).toBe('daily');
    expect(req.trigger.hour).toBe(10);
  });
});

describe('loadNotificationsAdapter', () => {
  it('resolves to a usable adapter even when the native module is absent', async () => {
    const adapter = await loadNotificationsAdapter();
    expect(typeof adapter.requestPermissions).toBe('function');
    expect(typeof adapter.schedule).toBe('function');
    expect(typeof adapter.cancelAll).toBe('function');
  });
});

describe('one-off reminders', () => {
  const future: OneOffReminder = { id: 'trial-billing-reminder', title: 't', body: 'b', date: new Date(Date.now() + 86_400_000) };

  it('keeps a one-off reminder when the daily ones are rescheduled', async () => {
    const live = new Set<string>();
    const adapter: NotificationsAdapter = {
      async requestPermissions() {
        return true;
      },
      async cancelAll() {
        live.clear();
      },
      async cancel(id) {
        live.delete(id);
      },
      async schedule(plan) {
        live.add(plan.id);
      },
      async scheduleAt(r) {
        live.add(r.id);
      },
    };
    expect(await scheduleOneOff(future, adapter)).toBe(true);
    await scheduleDailyReminders({ window: WINDOW, morningInstruction: 'x' }, adapter);
    expect([...live].sort()).toEqual(['daily-check-in', 'daily-dose-instruction', 'trial-billing-reminder']);
  });

  it('skips past dates, denied permission and adapters that cannot schedule by date', async () => {
    const granted: NotificationsAdapter = { ...noopNotificationsAdapter, requestPermissions: async () => true };
    expect(await scheduleOneOff({ ...future, date: new Date(Date.now() - 1000) }, granted)).toBe(false);
    expect(await scheduleOneOff(future, noopNotificationsAdapter)).toBe(false);
    expect(await scheduleOneOff(future, { ...granted, scheduleAt: undefined })).toBe(false);
    expect(await scheduleOneOff(future, granted)).toBe(true);
  });
});
