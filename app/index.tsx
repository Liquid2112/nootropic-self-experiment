import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import {
  experiments,
  getDatabase,
  scheduleDays,
  supplements,
  type Experiment,
  type ScheduleDay,
} from '@/db';
import { BASELINE_DAYS } from '@/engines/experiment';
import {
  buildTodayView,
  DEFAULT_CHECK_IN_WINDOW,
  type TodayView,
} from '@/features/daily-loop';
import {
  buildDailyQuests,
  claimProgress,
  dailyGoalProgress,
  ensureSnapshot,
  loadGameState,
  localDay,
  type GameState,
  type ProgressDelta,
  type Quest,
} from '@/features/gamification';
import { loadNotificationsAdapter, scheduleDailyReminders } from '@/features/notifications';
import {
  ActionTile,
  Confetti,
  QuestList,
  StreakFlame,
  XpBar,
  celebrate,
  tapLight,
} from '@/components/game';
import { Button, Card, ProgressRing, Scaffold, gameColors, lightTheme } from '@/ui';

type Loaded = {
  experiment: Experiment;
  schedule: ScheduleDay[];
  view: TodayView;
  supplementName: string;
  game: GameState;
};

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Days left until the verdict unlocks, counting the baseline when in it. */
function daysUntilVerdict(view: TodayView, lengthDays: number): number {
  if (view.isBaseline) {
    return BASELINE_DAYS - view.dayNumber + 1 + lengthDays;
  }
  if (view.hasDayForToday) {
    return Math.max(0, lengthDays - view.dayNumber + 1);
  }
  return view.isFinished ? 0 : lengthDays;
}

/**
 * Today (home) — the daily hub, built to pull the user back every day.
 *
 * Top to bottom: greeting with the streak flame, a hero card with the run's
 * progress and a countdown to the verdict, today's quests (dose, check-in,
 * bonus reaction test) with XP rewards, the dose instruction, level and XP,
 * then shortcut tiles to the reaction test, journey map, badges and the
 * nootropic library.
 *
 * Blinding: nothing here shows a score. XP and streaks only count that the
 * dose and check-in happened, and the dose instruction stays the blinded cup
 * wording from `buildTodayView`.
 */
export default function TodayScreen() {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<ProgressDelta | null>(null);
  const [burst, setBurst] = useState(0);
  const [toastAnim] = useState(() => new Animated.Value(0));

  const load = useCallback(() => {
    const db = getDatabase();
    const experiment = experiments.listByStatus(db, 'active')[0];
    if (!experiment) {
      setLoaded(null);
      setReady(true);
      return;
    }
    ensureSnapshot(db);
    const schedule = scheduleDays.listForExperiment(db, experiment.id);
    const view = buildTodayView({ experiment, schedule, isoDate: localDay(new Date()) });
    setLoaded({
      experiment,
      schedule,
      view,
      supplementName: supplements.getById(db, experiment.supplementId)?.name ?? 'your supplement',
      game: loadGameState(db),
    });
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const showToast = useCallback(
    (delta: ProgressDelta) => {
      setToast(delta);
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
        Animated.delay(2200),
        Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setToast(null));
    },
    [toastAnim],
  );

  const markTaken = useCallback(() => {
    if (!loaded || !loaded.view.hasDayForToday || loaded.view.taken) {
      return;
    }
    const db = getDatabase();
    scheduleDays.markTaken(db, loaded.experiment.id, loaded.view.dayNumber - 1, new Date().toISOString());
    const { delta } = claimProgress(db);
    celebrate();
    if (delta.newBadges.length > 0 || delta.levelUp !== null) {
      setBurst((b) => b + 1);
    }
    showToast(delta);
    load();
  }, [loaded, load, showToast]);

  const onQuest = useCallback(
    (quest: Quest) => {
      tapLight();
      if (quest.id === 'dose') markTaken();
      if (quest.id === 'check_in') router.push('/daily-test');
      if (quest.id === 'reaction') router.push('/reaction-test');
    },
    [markTaken, router],
  );

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

  const windowLabel = useMemo(
    () =>
      `Best taken ${formatHour(DEFAULT_CHECK_IN_WINDOW.startHour)}–${formatHour(DEFAULT_CHECK_IN_WINDOW.endHour)}`,
    [],
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

  const { view, game, experiment } = loaded;
  const quests = buildDailyQuests({
    doseScheduled: view.hasDayForToday,
    checkInScheduled: view.hasDayForToday || view.isBaseline,
    game,
    // Only an open (unblinded) run ever says "No capsule today"; logging that
    // day still counts as following the plan.
    doseTitle: view.instruction.startsWith('No capsule') ? 'Log your no-capsule day' : undefined,
  });
  const goal = dailyGoalProgress(quests);
  const goalDone = quests.filter((q) => !q.bonus && q.done).length;
  const goalTotal = quests.filter((q) => !q.bonus).length;
  const verdictIn = daysUntilVerdict(view, experiment.lengthDays);
  const runProgress = view.isBaseline
    ? 0
    : view.isFinished
      ? 1
      : view.hasDayForToday
        ? (view.dayNumber - 1) / Math.max(1, view.totalDays)
        : 0;
  const checkInDue = (view.hasDayForToday || view.isBaseline) && !game.today.checkIn;

  return (
    <View style={styles.root}>
      <Scaffold>
        {/* Greeting + streak */}
        <View style={styles.topRow}>
          <View style={styles.flex}>
            <Text style={styles.greeting}>{greeting(new Date())}</Text>
            <Text style={styles.subGreeting} numberOfLines={1}>
              Testing {loaded.supplementName}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/achievements')}>
            <StreakFlame count={game.streak.current} atRisk={game.streak.atRisk} />
          </Pressable>
        </View>

        {game.streak.atRisk ? (
          <View style={styles.riskBanner}>
            <Text style={styles.riskText}>
              🔥 Your {game.streak.current}-day streak ends at midnight. Do one thing today to keep it.
            </Text>
          </View>
        ) : null}

        {/* Hero: run progress + verdict countdown */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <Text style={styles.heroEyebrow}>
                {view.isBaseline ? 'BASELINE' : view.isFinished ? 'EXPERIMENT DONE' : 'EXPERIMENT'}
              </Text>
              <Text style={styles.heroTitle}>
                {view.isBaseline
                  ? `Baseline day ${view.dayNumber} of ${BASELINE_DAYS}`
                  : view.hasDayForToday
                    ? `Day ${view.dayNumber} of ${view.totalDays}`
                    : view.isFinished
                      ? 'Your verdict is ready'
                      : 'Between days'}
              </Text>
            </View>
            <View style={styles.lockBubble}>
              <Text style={styles.lockEmoji}>{view.isFinished ? '🏆' : '🔒'}</Text>
            </View>
          </View>
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${Math.round(runProgress * 100)}%` }]} />
          </View>
          {view.isFinished ? (
            <Button label="Reveal my verdict" variant="secondary" onPress={() => router.push('/verdict')} />
          ) : (
            <Text style={styles.heroCaption}>
              {`Verdict unlocks in ${verdictIn} day${verdictIn === 1 ? '' : 's'}. Results stay sealed until then so nothing sways your data.`}
            </Text>
          )}
        </View>

        {/* Daily quests */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <ProgressRing progress={goal} size={44} thickness={6} color={goal >= 1 ? 'success' : 'accent'}>
              <Text style={styles.ringText}>{goal >= 1 ? '✓' : `${goalDone}/${goalTotal}`}</Text>
            </ProgressRing>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Today&apos;s quests</Text>
              <Text style={styles.muted}>
                {goal >= 1 ? 'Daily goal complete. Nice work!' : 'Finish them to grow your streak and level up.'}
              </Text>
            </View>
          </View>
          <QuestList quests={quests} onPressQuest={onQuest} />
        </Card>

        {/* Dose instruction (blinded wording) */}
        {(view.hasDayForToday || view.isBaseline) && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>{view.isBaseline ? '🧭 Baseline' : '💊 Today’s dose'}</Text>
            <Text style={styles.body}>{view.instruction}</Text>
            {!view.isBaseline && <Text style={styles.muted}>{windowLabel}</Text>}
            {view.hasDayForToday &&
              (view.taken ? (
                <Text style={styles.takenText}>✓ Dose logged</Text>
              ) : (
                <Button label="Mark taken" onPress={markTaken} accessibilityHint="Records that you took today's dose" />
              ))}
          </Card>
        )}

        {checkInDue && (
          <Button label="Start today's check-in  ·  90 sec" onPress={() => router.push('/daily-test')} />
        )}

        {/* Level */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/achievements')}>
          <Card style={styles.card}>
            <XpBar level={game.level} />
            <Text style={styles.muted}>
              {`${game.badges.length} badge${game.badges.length === 1 ? '' : 's'} earned  ·  ${game.stats.totalXp} XP total  ·  tap for all`}
            </Text>
          </Card>
        </Pressable>

        {/* Shortcuts */}
        <Text style={styles.section}>Explore</Text>
        <View style={styles.grid}>
          <ActionTile
            emoji="⚡"
            title="Reaction test"
            subtitle="Beat your best time"
            tint={gameColors.xpMuted}
            onPress={() => router.push('/reaction-test')}
          />
          <ActionTile
            emoji="🗺️"
            title="Journey"
            subtitle="Your run, day by day"
            tint={lightTheme.colors.accentMuted}
            onPress={() => router.push('/progress')}
          />
          <ActionTile
            emoji="🏅"
            title="Badges"
            subtitle={`${game.badges.length} unlocked`}
            tint={gameColors.flameMuted}
            onPress={() => router.push('/achievements')}
          />
          <ActionTile
            emoji="📚"
            title="Library"
            subtitle="What each nootropic does"
            tint={gameColors.mintMuted}
            tag="NEW"
            onPress={() => router.push('/dictionary')}
          />
        </View>
      </Scaffold>

      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
          ]}
        >
          <Text style={styles.toastText}>
            {`+${toast.xpGained} XP  ·  🔥 ${toast.streak}`}
            {toast.levelUp !== null ? `  ·  Level ${toast.levelUp}!` : ''}
            {toast.newBadges.length ? `  ·  ${toast.newBadges.map((b) => `${b.emoji} ${b.title}`).join(', ')}` : ''}
          </Text>
        </Animated.View>
      ) : null}
      {burst > 0 ? <Confetti burstKey={burst} count={60} /> : null}
    </View>
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

const c = lightTheme.colors;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 28, fontWeight: '800', color: c.textPrimary },
  subGreeting: { fontSize: 15, color: c.textSecondary },
  riskBanner: { backgroundColor: gameColors.flameMuted, borderRadius: 14, padding: 12 },
  riskText: { color: '#B5410F', fontWeight: '600', fontSize: 14 },
  hero: {
    backgroundColor: c.accent,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    ...lightTheme.shadows.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  lockBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: { fontSize: 26 },
  heroTrack: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 6, backgroundColor: gameColors.xp },
  heroCaption: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 19 },
  card: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  ringText: { fontSize: 12, fontWeight: '800', color: c.textPrimary },
  body: { fontSize: 16, lineHeight: 22, color: c.textPrimary },
  muted: { fontSize: 14, color: c.textSecondary },
  takenText: { fontSize: 17, fontWeight: '700', color: c.success },
  section: { fontSize: 20, fontWeight: '800', color: c.textPrimary, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    backgroundColor: c.textPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...lightTheme.shadows.lg,
  },
  toastText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
