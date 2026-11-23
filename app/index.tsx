import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import {
  experiments,
  getDatabase,
  scheduleDays,
  type Experiment,
  type ScheduleDay,
} from '@/db';
import {
  buildTodayView,
  DEFAULT_CHECK_IN_WINDOW,
  type TodayView,
} from '@/features/daily-loop';
import { loadNotificationsAdapter, scheduleDailyReminders } from '@/features/notifications';
import {
  Button,
  Card,
  ProgressRing,
  Scaffold,
  StreakIndicator,
  colors,
  spacing,
  typography,
} from '@/ui';

/** Today's date as a local ISO day (YYYY-MM-DD). */
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type Loaded = {
  experiment: Experiment;
  schedule: ScheduleDay[];
  view: TodayView;
};

/**
 * Today (home) — the daily hub. On first run there is no active experiment, so
 * the user is sent through the onboarding gate (welcome -> goal -> setup).
 * Once a run exists this shows Day X of N, today's dose instruction (never
 * revealing the arm during a blinded run), a Mark taken action, the Start
 * check-in entry point, and the streak. Reads the active experiment and its
 * schedule from the on-device database on focus.
 */
export default function TodayScreen() {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    const db = getDatabase();
    const active = experiments.listByStatus(db, 'active');
    const experiment = active[0];
    if (!experiment) {
      setLoaded(null);
      setReady(true);
      return;
    }
    const schedule = scheduleDays.listForExperiment(db, experiment.id);
    const view = buildTodayView({ experiment, schedule, isoDate: todayIso() });
    setLoaded({ experiment, schedule, view });
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const markTaken = useCallback(() => {
    if (!loaded || !loaded.view.hasDayForToday) {
      return;
    }
    const db = getDatabase();
    const dayIndex = loaded.view.dayNumber - 1;
    scheduleDays.markTaken(db, loaded.experiment.id, dayIndex, new Date().toISOString());
    load();
  }, [loaded, load]);

  const startCheckIn = useCallback(() => {
    router.push('/daily-test');
  }, [router]);

  // Schedule the morning dose + check-in reminders for the active experiment.
  // Degrades to a no-op when notification permission is denied or the module is
  // unavailable (headless), so it never blocks the hub.
  const instruction = loaded?.view.instruction;
  const experimentId = loaded?.experiment.id;
  useEffect(() => {
    if (!experimentId || !instruction) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const adapter = await loadNotificationsAdapter();
      if (cancelled) {
        return;
      }
      await scheduleDailyReminders(
        { window: DEFAULT_CHECK_IN_WINDOW, morningInstruction: instruction },
        adapter,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [experimentId, instruction]);

  const checkInWindow = DEFAULT_CHECK_IN_WINDOW;
  const windowLabel = useMemo(
    () => `Best taken ${formatHour(checkInWindow.startHour)}–${formatHour(checkInWindow.endHour)}`,
    [checkInWindow.startHour, checkInWindow.endHour],
  );

  if (!ready) {
    return (
      <Scaffold>
        <Text style={styles.muted}>Loading…</Text>
      </Scaffold>
    );
  }

  // First run (no active experiment): send the user through onboarding.
  if (!loaded) {
    return <Redirect href="/welcome" />;
  }

  const { view } = loaded;

  return (
    <Scaffold>
      <View style={styles.header}>
        <StreakIndicator streak={view.streak} />
      </View>

      <View style={styles.ringRow}>
        <ProgressRing
          value={view.hasDayForToday ? view.dayNumber : 0}
          total={view.totalDays}
          centerLabel={view.hasDayForToday ? String(view.dayNumber) : '—'}
          caption={`of ${view.totalDays}`}
        />
        <Text style={styles.dayLabel}>
          {view.hasDayForToday ? `Day ${view.dayNumber} of ${view.totalDays}` : 'Between days'}
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Today&apos;s dose</Text>
        <Text style={styles.instruction}>{view.instruction}</Text>
        <Text style={styles.windowLabel}>{windowLabel}</Text>
        {view.hasDayForToday &&
          (view.taken ? (
            <View style={styles.takenRow}>
              <Text style={styles.takenText}>✓ Marked taken</Text>
            </View>
          ) : (
            <Button label="Mark taken" onPress={markTaken} accessibilityHint="Records that you took today's dose" />
          ))}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Daily check-in</Text>
        <Text style={styles.muted}>About 90 seconds: a quick reaction test, a memory task, and three sliders.</Text>
        <Button
          label="Start check-in"
          variant={view.hasDayForToday ? 'primary' : 'secondary'}
          onPress={startCheckIn}
        />
      </Card>
    </Scaffold>
  );
}

function formatHour(hour24: number): string {
  if (hour24 === 0 || hour24 === 24) {
    return '12am';
  }
  if (hour24 === 12) {
    return '12pm';
  }
  return hour24 < 12 ? `${hour24}am` : `${hour24 - 12}pm`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  ringRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dayLabel: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.text,
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.text,
  },
  cardTitle: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.text,
  },
  instruction: {
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  windowLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
  },
  muted: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
  },
  takenRow: {
    paddingVertical: spacing.sm,
  },
  takenText: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.success,
  },
});
