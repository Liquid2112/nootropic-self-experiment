/**
 * Push the current run state to the home-screen widget and the check-in Live
 * Activity. Called whenever the app opens or comes to the foreground and right
 * after a dose or check-in, so the widget never shows a stale "check-in left".
 */
import type { SqlDriver } from '@/db/driver';
import { experiments, scheduleDays } from '@/db/repositories';
import { DEFAULT_CHECK_IN_WINDOW, type CheckInWindow } from '@/features/daily-loop';
import { loadGameState, localDay } from '@/features/gamification';
import type { NativeWidgetBridge } from './bridge';
import { buildTimeline, planLiveActivity, type LiveActivityPlan } from './model';

function localMidnightMs(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export type SyncResult = { entries: number; liveActivity: LiveActivityPlan['action'] };

export async function syncWidgets(
  db: SqlDriver,
  bridge: NativeWidgetBridge,
  now: Date = new Date(),
  window: CheckInWindow = DEFAULT_CHECK_IN_WINDOW,
): Promise<SyncResult> {
  if (!bridge.available) {
    return { entries: 0, liveActivity: 'none' };
  }
  const experiment = experiments.listByStatus(db, 'active')[0] ?? null;
  const schedule = experiment ? scheduleDays.listForExperiment(db, experiment.id) : [];
  const game = loadGameState(db, now);
  const entries = buildTimeline(
    {
      experiment,
      schedule,
      isoDate: localDay(now),
      checkInDone: game.today.checkIn,
      streak: game.streak.current,
      window,
      dayStartMs: localMidnightMs(now),
      nowMs: now.getTime(),
    },
    game.streak.activeToday,
  );
  bridge.setTimeline(entries);

  const plan = planLiveActivity(entries[0]!.props, now.getTime(), bridge.runningActivityCount() > 0);
  try {
    if (plan.action === 'start') await bridge.startActivity(plan.props, plan.staleAtMs);
    if (plan.action === 'update') await bridge.updateActivity(plan.props, plan.staleAtMs);
    if (plan.action === 'end') await bridge.endActivities();
  } catch {
    // Live Activities can be switched off in Settings; the widget still works.
  }
  return { entries: entries.length, liveActivity: plan.action };
}
