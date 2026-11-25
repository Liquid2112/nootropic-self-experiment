/**
 * Local notification scheduling for the daily loop.
 *
 * Two reminders drive the experiment's daily rhythm:
 *  - the morning instruction ("take today's dose"), fired at the start of the
 *    check-in window, and
 *  - a check-in reminder to run the daily test, fired later in the window.
 *
 * expo-notifications is a native module. To keep unit tests and CI (which run
 * headless in Node, with no native runtime) green, this module NEVER imports
 * expo-notifications statically. It loads it lazily through a small adapter and
 * degrades every operation to a no-op when the module is unavailable. All the
 * scheduling decisions (what time, what body, dedupe keys) are pure and live in
 * buildDailyReminders, which is what the tests exercise.
 */
import type { CheckInWindow } from '@/features/daily-loop';

/** A reminder the app wants the OS to deliver. */
export type ReminderPlan = {
  /** Stable key so re-scheduling replaces rather than duplicates. */
  id: string;
  title: string;
  body: string;
  /** Hour of day (0..23, local) to fire. */
  hour: number;
  /** Minute of the hour (0..59). */
  minute: number;
};

export type BuildRemindersInput = {
  /** The experiment's check-in window (drives the two fire times). */
  window: CheckInWindow;
  /** Instruction text to show in the morning notification (already blinded). */
  morningInstruction: string;
};

/**
 * Pure: decide the two daily reminders from the window. The morning instruction
 * fires at the window start; the check-in reminder fires one hour before the
 * window closes (clamped to at least the start hour). The caller passes an
 * already-blinded instruction string, so no arm assignment leaks into a
 * notification.
 */
export function buildDailyReminders(input: BuildRemindersInput): ReminderPlan[] {
  const { window, morningInstruction } = input;
  const reminderHour = Math.max(window.startHour, window.endHour - 1);
  return [
    {
      id: 'daily-dose-instruction',
      title: "Today's dose",
      body: morningInstruction,
      hour: window.startHour,
      minute: 0,
    },
    {
      id: 'daily-check-in',
      title: 'Daily check-in',
      body: 'Take your 90-second check-in while your routine is fresh.',
      hour: reminderHour,
      minute: 0,
    },
  ];
}

/**
 * Minimal surface of expo-notifications this feature uses. The real module is
 * loaded at runtime; a fake can be injected in tests. Only the calls we make
 * are declared.
 */
export type NotificationsAdapter = {
  requestPermissions: () => Promise<boolean>;
  cancelAll: () => Promise<void>;
  schedule: (plan: ReminderPlan) => Promise<void>;
  /** Cancel one scheduled notification by id, leaving the others alone. */
  cancel?: (id: string) => Promise<void>;
  /** Schedule a one-off notification at an exact local time. */
  scheduleAt?: (reminder: OneOffReminder) => Promise<void>;
};

/** A notification that fires once, at `date`. */
export type OneOffReminder = {
  id: string;
  title: string;
  body: string;
  date: Date;
};

/** A no-op adapter used when expo-notifications is not available. */
export const noopNotificationsAdapter: NotificationsAdapter = {
  async requestPermissions() {
    return false;
  },
  async cancelAll() {
    /* no-op */
  },
  async schedule() {
    /* no-op */
  },
  async cancel() {
    /* no-op */
  },
  async scheduleAt() {
    /* no-op */
  },
};

/**
 * Load the real expo-notifications adapter, or the no-op adapter when the module
 * is not installed / not available (headless, web without support). The import
 * is dynamic and wrapped so a missing module can never crash a screen or a test.
 */
export async function loadNotificationsAdapter(): Promise<NotificationsAdapter> {
  try {
    // Dynamic import keeps the native module out of the headless/test bundle.
    const mod: unknown = await import('expo-notifications');
    return createExpoAdapter(mod);
  } catch {
    return noopNotificationsAdapter;
  }
}

type ExpoNotificationsLike = {
  requestPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  cancelAllScheduledNotificationsAsync: () => Promise<void>;
  cancelScheduledNotificationAsync?: (identifier: string) => Promise<void>;
  scheduleNotificationAsync: (request: unknown) => Promise<string>;
  SchedulableTriggerInputTypes?: { DAILY?: string; DATE?: string };
};

/** Wrap the expo-notifications module in our adapter. Isolated for testability. */
export function createExpoAdapter(mod: unknown): NotificationsAdapter {
  const api = mod as ExpoNotificationsLike;
  if (
    typeof api.requestPermissionsAsync !== 'function' ||
    typeof api.scheduleNotificationAsync !== 'function' ||
    typeof api.cancelAllScheduledNotificationsAsync !== 'function'
  ) {
    return noopNotificationsAdapter;
  }
  return {
    async requestPermissions() {
      const res = await api.requestPermissionsAsync();
      return res.granted === true || res.status === 'granted';
    },
    async cancelAll() {
      await api.cancelAllScheduledNotificationsAsync();
    },
    async schedule(plan: ReminderPlan) {
      const dailyType = api.SchedulableTriggerInputTypes?.DAILY ?? 'daily';
      await api.scheduleNotificationAsync({
        identifier: plan.id,
        content: { title: plan.title, body: plan.body },
        trigger: { type: dailyType, hour: plan.hour, minute: plan.minute },
      });
    },
    async cancel(id: string) {
      if (typeof api.cancelScheduledNotificationAsync === 'function') {
        await api.cancelScheduledNotificationAsync(id);
      }
    },
    async scheduleAt(reminder: OneOffReminder) {
      const dateType = api.SchedulableTriggerInputTypes?.DATE ?? 'date';
      await api.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body },
        trigger: { type: dateType, date: reminder.date },
      });
    },
  };
}

export type ScheduleResult = {
  /** True when permission was granted and reminders were scheduled. */
  scheduled: boolean;
  /** How many reminders were scheduled (0 when permission denied / no-op). */
  count: number;
};

/**
 * Request permission (gracefully) and schedule the daily reminders. When
 * permission is denied or the module is absent, this is a clean no-op reporting
 * scheduled=false — the app keeps working without notifications. Existing
 * reminders are cancelled first so re-running does not stack duplicates.
 */
export async function scheduleDailyReminders(
  input: BuildRemindersInput,
  adapter: NotificationsAdapter,
): Promise<ScheduleResult> {
  const granted = await adapter.requestPermissions();
  if (!granted) {
    return { scheduled: false, count: 0 };
  }
  const plans = buildDailyReminders(input);
  // Replace only the daily reminders, so a one-off (like the trial billing
  // reminder) survives a reschedule.
  if (adapter.cancel) {
    for (const plan of plans) {
      await adapter.cancel(plan.id);
    }
  } else {
    await adapter.cancelAll();
  }
  for (const plan of plans) {
    await adapter.schedule(plan);
  }
  return { scheduled: true, count: plans.length };
}

/** Ids of the two daily reminders (see buildDailyReminders). */
export const DAILY_REMINDER_IDS = ['daily-dose-instruction', 'daily-check-in'] as const;

/**
 * Cancel the two daily reminders (used while a run is paused), leaving any
 * one-off like the trial billing reminder in place. Needs no permission.
 */
export async function cancelDailyReminders(adapter: NotificationsAdapter): Promise<void> {
  if (!adapter.cancel) {
    return;
  }
  for (const id of DAILY_REMINDER_IDS) {
    try {
      await adapter.cancel(id);
    } catch {
      // Not supported here (web) or nothing to cancel.
    }
  }
}

/**
 * Request permission and schedule one one-off reminder. Returns false (and does
 * nothing) when permission is denied or the module can't schedule by date.
 */
export async function scheduleOneOff(reminder: OneOffReminder, adapter: NotificationsAdapter): Promise<boolean> {
  if (!adapter.scheduleAt || reminder.date.getTime() <= Date.now()) {
    return false;
  }
  const granted = await adapter.requestPermissions();
  if (!granted) {
    return false;
  }
  await adapter.scheduleAt(reminder);
  return true;
}
