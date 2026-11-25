import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import {
  experiments,
  getDatabase,
  scheduleDays,
  supplements,
  type AdverseEvent,
  type Experiment,
  type ScheduleDay,
} from '@/db';
import { BASELINE_DAYS, addDays } from '@/engines/experiment';
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
import { cancelDailyReminders, loadNotificationsAdapter, scheduleDailyReminders } from '@/features/notifications';
import { RESUME_WARNING, activePause, endExperimentForSafety, resumeExperiment } from '@/features/safety';
import { track, trackOnce } from '@/features/analytics';
import { refreshWidgets } from '@/features/widget/useWidgetSync';
import {
  dueProgressMilestone,
  keyRequestMessage,
  keyholderRun,
  markProgressShared,
  pendingInvite,
  progressMessage,
  type KeyholderRun,
} from '@/features/referral';
import {
  ActionTile,
  Confetti,
  QuestList,
  StreakFlame,
  XpBar,
  celebrate,
  tapLight,
} from '@/components/game';
import { Icon, Logo, Brian } from '@/brand';
import { Button, ProgressRing, Scaffold, brand, fonts } from '@/ui';

type Loaded = {
  experiment: Experiment;
  schedule: ScheduleDay[];
  view: TodayView;
  supplementName: string;
  game: GameState;
  /** Set while the run is paused after a logged bad reaction. */
  pause: AdverseEvent | null;
  /** Friend-blinded (keyholder) state, or null for other blinding modes. */
  keyholder: KeyholderToday | null;
};

type KeyholderToday = {
  /** The key link was made but never reached a keyholder. */
  unsent: boolean;
  run: KeyholderRun | null;
  reveal: string;
};

function loadKeyholder(db: ReturnType<typeof getDatabase>, experiment: Experiment): KeyholderToday | null {
  if (experiment.blindingMode !== 'sealed') return null;
  const run = keyholderRun(db, experiment.id);
  const pending = pendingInvite(db);
  const unsent = run === null && pending !== null && pending.run === experiment.id;
  if (!run && !unsent) return null;
  return { unsent, run, reveal: addDays(experiment.startDate, experiment.lengthDays) };
}

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
    const isoDate = localDay(new Date());
    const view = buildTodayView({ experiment, schedule, isoDate });
    const pause = activePause(db, experiment.id);
    // Retention: once per day the app is opened during the baseline or the run.
    if (!pause && (view.isBaseline || view.hasDayForToday)) {
      trackOnce(`active:${experiment.id}:${isoDate}`, 'run_day_active', {
        run_day: view.dayNumber,
        phase: view.isBaseline ? 'baseline' : 'run',
      });
    }
    setLoaded({
      pause,
      experiment,
      schedule,
      view,
      supplementName: supplements.getById(db, experiment.supplementId)?.name ?? 'your supplement',
      game: loadGameState(db),
      keyholder: loadKeyholder(db, experiment),
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
    if (!loaded || loaded.pause || !loaded.view.hasDayForToday || loaded.view.taken) {
      return;
    }
    const db = getDatabase();
    scheduleDays.markTaken(db, loaded.experiment.id, loaded.view.dayNumber - 1, new Date().toISOString());
    track('dose_logged', { run_day: loaded.view.dayNumber });
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

  const shareProgress = useCallback(async () => {
    const kh = loaded?.keyholder;
    if (!loaded || !kh?.run) return;
    const day = loaded.view.dayNumber;
    try {
      const res = await Share.share({
        message: progressMessage({
          v: 1,
          t: 'p',
          run: loaded.experiment.id,
          day,
          of: loaded.experiment.lengthDays,
          from: kh.run.from,
          reveal: kh.reveal,
        }),
      });
      if (res.action === Share.dismissedAction) return;
      markProgressShared(getDatabase(), loaded.experiment.id, day);
      track('progress_shared', { run_day: day });
      load();
    } catch {
      // Share sheet unavailable.
    }
  }, [loaded, load]);

  const skipProgress = useCallback(() => {
    if (!loaded) return;
    markProgressShared(getDatabase(), loaded.experiment.id, loaded.view.dayNumber);
    load();
  }, [loaded, load]);

  const askForKey = useCallback(async () => {
    if (!loaded) return;
    try {
      await Share.share({ message: keyRequestMessage(loaded.supplementName) });
    } catch {
      // Share sheet unavailable.
    }
  }, [loaded]);

  // Schedule the morning dose + check-in reminders for the active experiment.
  // Degrades to a no-op when notification permission is denied or the module is
  // unavailable (headless), so it never blocks the hub.
  // While the run is paused after a bad reaction, the dose reminders stay off.
  const instruction = loaded?.view.instruction;
  const experimentId = loaded?.experiment.id;
  const paused = loaded?.pause != null;
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
      if (paused) {
        await cancelDailyReminders(adapter);
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
  }, [experimentId, instruction, paused]);

  const [confirm, setConfirm] = useState<'resume' | 'end' | null>(null);
  const onResume = useCallback(() => {
    if (!experimentId) return;
    resumeExperiment(getDatabase(), experimentId);
    setConfirm(null);
    refreshWidgets();
    load();
  }, [experimentId, load]);
  const onEnd = useCallback(() => {
    if (!experimentId) return;
    endExperimentForSafety(getDatabase(), experimentId);
    setConfirm(null);
    refreshWidgets();
    load();
  }, [experimentId, load]);

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

  if (loaded.pause) {
    return (
      <PausedToday
        loggedAt={loaded.pause.loggedAt}
        confirm={confirm}
        onConfirm={setConfirm}
        onResume={onResume}
        onEnd={onEnd}
        onShowHelp={() => router.push('/bad-reaction')}
      />
    );
  }
  const quests = buildDailyQuests({
    doseScheduled: view.hasDayForToday,
    checkInScheduled: view.hasDayForToday || view.isBaseline,
    game,
    // Only an open (unblinded) run ever says "No capsule today"; logging that
    // day still counts as following the plan.
    doseTitle: view.instruction.startsWith('No capsule') ? 'Log your off day' : undefined,
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
  const kh = loaded.keyholder;
  const progressDue =
    kh?.run && view.hasDayForToday && !view.isBaseline
      ? dueProgressMilestone(view.dayNumber, experiment.lengthDays, kh.run.lastSharedDay)
      : null;

  return (
    <View style={styles.root}>
      <Scaffold>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Logo size={22} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Streak and achievements"
            onPress={() => router.push('/achievements')}
          >
            <StreakFlame count={game.streak.current} atRisk={game.streak.atRisk} />
          </Pressable>
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting(new Date())}</Text>
          <Text style={styles.subGreeting} numberOfLines={1}>
            {`Testing ${loaded.supplementName}`}
          </Text>
        </View>

        {game.streak.atRisk ? (
          <View style={styles.riskBanner}>
            <Icon name="flame" size={18} color={brand.tang} strokeWidth={2.4} />
            <Text style={styles.riskText}>
              {`Your ${game.streak.current}-day streak ends at midnight. One quest keeps it alive.`}
            </Text>
          </View>
        ) : null}

        {kh?.unsent ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/keyholder-invite')}
            style={styles.riskBanner}
          >
            <Icon name="lock" size={18} color={brand.tang} strokeWidth={2.4} />
            <Text style={styles.riskText}>
              Your key isn’t with a keyholder yet. Without it your verdict can’t unlock. Send it now.
            </Text>
            <Icon name="chevronRight" size={16} color={brand.tangDeep} />
          </Pressable>
        ) : null}

        {/* Hero: verdict countdown + run progress */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <Text style={styles.heroEyebrow}>
                {view.isFinished ? 'YOUR EXPERIMENT IS DONE' : 'VERDICT UNLOCKS IN'}
              </Text>
              {view.isFinished ? (
                <Text style={styles.heroBig}>Ready</Text>
              ) : (
                <View style={styles.heroBigRow}>
                  <Text style={styles.heroBig}>{verdictIn}</Text>
                  <Text style={styles.heroUnit}>{verdictIn === 1 ? 'day' : 'days'}</Text>
                </View>
              )}
            </View>
            <View style={styles.heroMascot}>
              <Brian size={96} mood={view.isFinished ? 'wow' : game.today.checkIn ? 'proud' : 'focused'} tilt={8} />
            </View>
          </View>
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${Math.max(3, Math.round(runProgress * 100))}%` }]} />
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>
              {view.isBaseline
                ? `Baseline day ${view.dayNumber} of ${BASELINE_DAYS}`
                : view.hasDayForToday
                  ? `Day ${view.dayNumber} of ${view.totalDays}`
                  : view.isFinished
                    ? `${experiment.lengthDays} of ${experiment.lengthDays} days`
                    : 'Between days'}
            </Text>
            <View style={styles.heroSealed}>
              <Icon name={view.isFinished ? 'sparkle' : 'lock'} size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroMetaText}>{view.isFinished ? 'Unsealed' : 'Results sealed'}</Text>
            </View>
          </View>
          {view.isFinished ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/verdict')} style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Reveal my verdict</Text>
              <Icon name="arrowRight" size={18} color={brand.ink} />
            </Pressable>
          ) : null}
          {view.isFinished && kh?.run ? (
            <Pressable accessibilityRole="button" onPress={() => void askForKey()} style={styles.heroLink}>
              <Icon name="lock" size={15} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroLinkText}>Ask your keyholder for the key</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Daily quests */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Today&apos;s quests</Text>
              <Text style={styles.muted}>
                {goal >= 1 ? 'Daily goal done. See you tomorrow.' : 'Finish them to keep your streak.'}
              </Text>
            </View>
            <ProgressRing progress={goal} size={44} thickness={5} color={goal >= 1 ? 'success' : 'accent'}>
              {goal >= 1 ? (
                <Icon name="check" size={18} color={brand.mint} strokeWidth={2.8} />
              ) : (
                <Text style={styles.ringText}>{`${goalDone}/${goalTotal}`}</Text>
              )}
            </ProgressRing>
          </View>
          <QuestList quests={quests} onPressQuest={onQuest} />
        </View>

        {/* Weekly check-in with the keyholder */}
        {progressDue !== null ? (
          <View style={[styles.card, styles.keyholderCard]}>
            <View style={styles.doseHeader}>
              <View style={[styles.iconBubble, { backgroundColor: brand.white }]}>
                <Icon name="share" size={20} color={brand.tang} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{`Week ${Math.round(progressDue / 7)} done`}</Text>
                <Text style={styles.muted}>Let your keyholder know you’re still going</Text>
              </View>
            </View>
            <Text style={styles.body}>
              {`They’re holding your key until the reveal. Send them a day count. It never includes a score.`}
            </Text>
            <Button label="Send an update" onPress={() => void shareProgress()} />
            <Pressable accessibilityRole="button" onPress={skipProgress} style={styles.skipRow}>
              <Text style={styles.skipText}>Not this week</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Dose instruction (blinded wording) */}
        {(view.hasDayForToday || view.isBaseline) && (
          <View style={styles.card}>
            <View style={styles.doseHeader}>
              <View style={[styles.iconBubble, { backgroundColor: brand.lilacSoft }]}>
                <Icon name={view.isBaseline ? 'clock' : 'cups'} size={20} color={brand.lilacDeep} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{view.isBaseline ? 'Baseline' : 'Today\u2019s dose'}</Text>
                {!view.isBaseline && <Text style={styles.muted}>{windowLabel}</Text>}
              </View>
            </View>
            <Text style={styles.body}>{view.instruction}</Text>
            {view.hasDayForToday &&
              (view.taken ? (
                <View style={styles.takenRow}>
                  <Icon name="check" size={18} color={brand.mint} strokeWidth={2.6} />
                  <Text style={styles.takenText}>Dose logged</Text>
                </View>
              ) : (
                <Button label="Mark taken" onPress={markTaken} accessibilityHint="Records that you took today's dose" />
              ))}
          </View>
        )}

        {(view.hasDayForToday || view.isBaseline) && (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Pauses your experiment and shows where to get help"
            onPress={() => router.push('/bad-reaction')}
            style={styles.reactionRow}
          >
            <Icon name="alert" size={16} color={brand.muted} />
            <Text style={styles.reactionText}>Feeling unwell? Log a bad reaction</Text>
          </Pressable>
        )}

        {checkInDue && (
          <Button label="Start today's check-in" onPress={() => router.push('/daily-test')} />
        )}

        {/* Level */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/achievements')} style={styles.card}>
          <XpBar level={game.level} />
          <View style={styles.levelMeta}>
            <Text style={styles.muted}>
              {`${game.badges.length} badge${game.badges.length === 1 ? '' : 's'} \u00b7 ${game.stats.totalXp} XP total`}
            </Text>
            <Icon name="chevronRight" size={16} color={brand.faint} />
          </View>
        </Pressable>

        {/* Shortcuts */}
        <Text style={styles.section}>Explore</Text>
        <View style={styles.grid}>
          <ActionTile
            icon="bolt"
            title="Reaction test"
            subtitle="Beat your best time"
            tint={brand.sunSoft}
            iconColor={brand.sunDeep}
            onPress={() => router.push('/reaction-test')}
          />
          <ActionTile
            icon="map"
            title="Journey"
            subtitle="Your run, day by day"
            tint={brand.lilacSoft}
            iconColor={brand.lilacDeep}
            onPress={() => router.push('/progress')}
          />
          <ActionTile
            icon="medal"
            title="Badges"
            subtitle={`${game.badges.length} unlocked`}
            tint={brand.tangSoft}
            iconColor={brand.tang}
            onPress={() => router.push('/achievements')}
          />
          <ActionTile
            icon="book"
            title="Library"
            subtitle="What each nootropic does"
            tint={brand.mintSoft}
            iconColor={brand.mint}
            onPress={() => router.push('/dictionary')}
          />
          <ActionTile
            icon="moon"
            title="Health sync"
            subtitle="Sleep, heart rate, HRV"
            tint={brand.lilacSoft}
            iconColor={brand.lilacDeep}
            onPress={() => router.push('/health')}
          />
          <ActionTile
            icon="gift"
            title="Invite friends"
            subtitle="You both get a month free"
            tint={brand.tangSoft}
            iconColor={brand.tang}
            onPress={() => router.push('/invite')}
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
          <Icon name="sparkle" size={18} color={brand.sun} />
          <Text style={styles.toastText}>
            {`+${toast.xpGained} XP \u00b7 ${toast.streak}-day streak`}
            {toast.levelUp !== null ? ` \u00b7 Level ${toast.levelUp}` : ''}
            {toast.newBadges.length ? ` \u00b7 ${toast.newBadges.map((b) => b.title).join(', ')}` : ''}
          </Text>
        </Animated.View>
      ) : null}
      {burst > 0 ? <Confetti burstKey={burst} count={60} /> : null}
    </View>
  );
}

type PausedProps = {
  loggedAt: string;
  confirm: 'resume' | 'end' | null;
  onConfirm: (c: 'resume' | 'end' | null) => void;
  onResume: () => void;
  onEnd: () => void;
  onShowHelp: () => void;
};

/**
 * Today while the run is paused after a logged bad reaction: no dose, no
 * quests, no streak pressure. Resuming asks for a doctor's OK first; ending
 * closes the run without a verdict.
 */
function PausedToday({ loggedAt, confirm, onConfirm, onResume, onEnd, onShowHelp }: PausedProps) {
  const date = new Date(loggedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <Scaffold>
      <View style={styles.topBar}>
        <Logo size={22} />
      </View>
      <View style={styles.pausedCard}>
        <View style={[styles.iconBubble, { backgroundColor: brand.tangSoft }]}>
          <Icon name="alert" size={22} color={brand.rose} strokeWidth={2.4} />
        </View>
        <Text style={styles.cardTitle}>Your experiment is paused</Text>
        <Text style={styles.body}>
          {`You logged a bad reaction on ${date}. Don\u2019t take any more doses. Your dose reminders are off.`}
        </Text>
        <Pressable accessibilityRole="button" onPress={onShowHelp} style={styles.helpLink}>
          <Text style={styles.helpLinkText}>See where to get help</Text>
          <Icon name="arrowRight" size={16} color={brand.tangDeep} />
        </Pressable>
      </View>

      {confirm === 'resume' ? (
        <View style={styles.card}>
          <Text style={styles.body}>{RESUME_WARNING}</Text>
          <Button label="A doctor said it’s OK. Resume" onPress={onResume} />
          <Button label="Not yet" variant="subtle" onPress={() => onConfirm(null)} />
        </View>
      ) : confirm === 'end' ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            End this experiment? What you’ve recorded stays on your phone, but there won’t be a verdict.
          </Text>
          <Button label="End experiment" onPress={onEnd} />
          <Button label="Keep it paused" variant="subtle" onPress={() => onConfirm(null)} />
        </View>
      ) : (
        <>
          <Button label="End this experiment" variant="secondary" onPress={() => onConfirm('end')} />
          <Button label="Resume experiment" variant="subtle" onPress={() => onConfirm('resume')} />
        </>
      )}
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
  root: { flex: 1, backgroundColor: brand.paper },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greetingBlock: { gap: 2, marginTop: 4 },
  greeting: { fontSize: 30, lineHeight: 36, fontFamily: fonts.display, letterSpacing: -0.8, color: brand.ink },
  subGreeting: { fontSize: 15, fontFamily: fonts.regular, color: brand.muted },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brand.tangSoft,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  riskText: { flex: 1, color: brand.tangDeep, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  hero: { backgroundColor: brand.ink, borderRadius: 28, padding: 20, gap: 14, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroEyebrow: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1.2 },
  heroBigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroBig: { color: brand.white, fontSize: 64, lineHeight: 70, fontFamily: fonts.display, letterSpacing: -2 },
  heroUnit: { color: brand.white, fontSize: 22, fontFamily: fonts.displayBold },
  heroMascot: { marginRight: -8, marginTop: -4 },
  heroTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: 4, backgroundColor: brand.tang },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroSealed: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: fonts.medium },
  heroButton: {
    marginTop: 4,
    backgroundColor: brand.white,
    borderRadius: 999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroButtonText: { color: brand.ink, fontSize: 16, fontFamily: fonts.semibold },
  heroLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  heroLinkText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: fonts.semibold },
  keyholderCard: { backgroundColor: brand.tangSoft, borderColor: brand.tangSoft },
  skipRow: { alignItems: 'center', paddingVertical: 2 },
  skipText: { color: brand.muted, fontSize: 14, fontFamily: fonts.medium },
  card: {
    backgroundColor: brand.white,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 19, lineHeight: 24, fontFamily: fonts.displayBold, color: brand.ink },
  ringText: { fontSize: 12, fontFamily: fonts.bold, color: brand.ink },
  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBubble: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 16, lineHeight: 23, fontFamily: fonts.regular, color: brand.ink },
  muted: { fontSize: 14, lineHeight: 19, fontFamily: fonts.regular, color: brand.muted },
  takenRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  takenText: { fontSize: 16, fontFamily: fonts.semibold, color: brand.mint },
  levelMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 22, fontFamily: fonts.display, letterSpacing: -0.4, color: brand.ink, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brand.ink,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toastText: { flex: 1, color: brand.white, fontSize: 15, fontFamily: fonts.semibold },
  reactionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  reactionText: { fontSize: 14, fontFamily: fonts.medium, color: brand.muted, textDecorationLine: 'underline' },
  pausedCard: {
    backgroundColor: brand.white,
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderWidth: 1.5,
    borderColor: brand.rose,
  },
  helpLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helpLinkText: { fontSize: 15, fontFamily: fonts.semibold, color: brand.tangDeep },
});
