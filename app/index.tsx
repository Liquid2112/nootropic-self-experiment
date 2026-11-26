import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import {
  experiments,
  getDatabase,
  scheduleDays,
  supplements,
  testSessions,
  type AdverseEvent,
  type Experiment,
  type ScheduleDay,
} from '@/db';
import { BASELINE_DAYS } from '@/engines/experiment';
import { goalLabel, type Goal } from '@/engines/onboarding';
import { TEST_CATALOG, batteryOf, type TestId } from '@/features/battery';
import {
  buildTodayView,
  DEFAULT_CHECK_IN_WINDOW,
  type TodayView,
} from '@/features/daily-loop';
import {
  claimProgress,
  ensureSnapshot,
  loadGameState,
  localDay,
  type GameState,
  type ProgressDelta,
} from '@/features/gamification';
import { cancelDailyReminders, loadNotificationsAdapter, scheduleDailyReminders } from '@/features/notifications';
import { RESUME_WARNING, activePause, endExperimentForSafety, resumeExperiment } from '@/features/safety';
import { track, trackOnce } from '@/features/analytics';
import { rewardCopy } from '@/config/referralRewards';
import { refreshWidgets } from '@/features/widget/useWidgetSync';
import {
  ActionTile,
  Confetti,
  StreakFlame,
  XpBar,
  celebrate,
  tapLight,
} from '@/components/game';
import { Icon, Logo, Brian, type IconName } from '@/brand';
import { Button, Scaffold, brand, fonts } from '@/ui';

type Loaded = {
  experiment: Experiment;
  schedule: ScheduleDay[];
  view: TodayView;
  supplementName: string;
  game: GameState;
  /** Run day indexes (0-based) that have a check-in. */
  checkedIn: Set<number>;
  /** Set while the run is paused after a logged bad reaction. */
  pause: AdverseEvent | null;
};

function longDate(now: Date): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
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
 * Results stay hidden: nothing here shows a score. XP and streaks only count
 * that the dose and check-in happened. Today's ON/OFF call is revealed here
 * each morning; future days never are.
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
      checkedIn: new Set(
        testSessions
          .listForExperiment(db, experiment.id)
          .map((t) => t.dayIndex)
          .filter((d) => d >= 0),
      ),
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
  const verdictIn = daysUntilVerdict(view, experiment.lengthDays);
  const tests = batteryOf(experiment);
  const checkInSeconds = tests.reduce((sum, id) => sum + TEST_CATALOG[id].seconds, 0);
  const checkInDue = (view.hasDayForToday || view.isBaseline) && !game.today.checkIn;

  return (
    <View style={styles.root}>
      <Scaffold>
        {/* Header: date, run day, supplement + streak */}
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.date}>{longDate(new Date())}</Text>
            <View style={styles.dayRow}>
              <Text style={styles.dayBig}>
                {view.isFinished ? 'Done' : `${view.isBaseline ? 'Baseline' : 'Day'} ${view.dayNumber}`}
              </Text>
              {!view.isFinished && (
                <Text style={styles.dayOf}>{`of ${view.isBaseline ? BASELINE_DAYS : view.totalDays}`}</Text>
              )}
            </View>
            <Text style={styles.subGreeting} numberOfLines={1}>
              {`${loaded.supplementName}, for ${goalLabel(experiment.goal as Goal).toLowerCase()}`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Streak and achievements"
            onPress={() => router.push('/achievements')}
          >
            <StreakFlame count={game.streak.current} atRisk={game.streak.atRisk} />
          </Pressable>
        </View>

        {game.streak.atRisk ? (
          <View style={styles.riskBanner}>
            <Icon name="flame" size={18} color={brand.tang} strokeWidth={2.4} />
            <Text style={styles.riskText}>
              {`Your ${game.streak.current}-day streak ends at midnight. One check-in keeps it alive.`}
            </Text>
          </View>
        ) : null}

        {view.isFinished ? (
          <View style={styles.checkIn}>
            <View style={styles.checkInHead}>
              <View style={styles.flex}>
                <Text style={styles.checkInTitle}>Your verdict is ready</Text>
                <Text style={styles.checkInSub}>{`${experiment.lengthDays} days, all in.`}</Text>
              </View>
              <Brian size={64} mood="wow" />
            </View>
            <Button variant="tang" label="Reveal my verdict" onPress={() => router.push('/verdict')} />
          </View>
        ) : null}

        {/* Today's ON/OFF call, revealed each morning */}
        {(view.hasDayForToday || view.isBaseline) && (
          <View style={styles.doseCard}>
            <ArmTile arm={view.isBaseline ? null : view.arm} />
            <View style={styles.doseText}>
              <Text style={styles.doseTitle}>
                {view.isBaseline ? 'Baseline day' : view.arm ? `Today: ${view.arm}` : 'Today\u2019s dose'}
              </Text>
              <Text style={styles.doseBody}>{view.instruction}</Text>
              {view.hasDayForToday &&
                (view.taken ? (
                  <View style={styles.takenRow}>
                    <Icon name="check" size={18} color={brand.mintInk} strokeWidth={2.6} />
                    <Text style={styles.takenText}>
                      {view.arm === 'OFF'
                        ? 'OFF day logged'
                        : view.takenAt
                          ? `Taken at ${new Date(view.takenAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                          : 'Dose logged'}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint={view.arm === 'OFF' ? 'Records that you skipped it as planned' : "Records that you took today's dose"}
                    onPress={() => {
                      tapLight();
                      markTaken();
                    }}
                    style={({ pressed }) => [styles.doseButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.doseButtonText}>
                      {view.arm === 'OFF' ? 'I skipped it today' : 'Mark taken'}
                    </Text>
                  </Pressable>
                ))}
              {view.arm === 'ON' && !view.taken ? (
                <Text style={styles.windowText}>{windowLabel}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Today's check-in */}
        {(view.hasDayForToday || view.isBaseline) && (
          <View style={styles.checkIn}>
            <View style={styles.checkInHead}>
              <View style={styles.flex}>
                <Text style={styles.checkInTitle}>Today&apos;s check-in</Text>
                <Text style={styles.checkInSub}>
                  {checkInDue
                    ? `${tests.length} test${tests.length === 1 ? '' : 's'}, about ${Math.max(1, Math.round(checkInSeconds / 60))} minute${Math.round(checkInSeconds / 60) > 1 ? 's' : ''}`
                    : 'Done for today. See you tomorrow.'}
                </Text>
              </View>
              <Brian size={64} mood={checkInDue ? 'focused' : 'proud'} />
            </View>
            {checkInDue ? (
              <>
                <View style={styles.testList}>
                  {tests.map((id, i) => (
                    <TestRow key={id} id={id} color={TEST_DOT[i % TEST_DOT.length]!} />
                  ))}
                </View>
                <Button variant="tang" label="Start check-in" onPress={() => router.push('/daily-test')} />
              </>
            ) : (
              <View style={styles.doneRow}>
                <Icon name="check" size={18} color={brand.mint} strokeWidth={2.8} />
                <Text style={styles.doneText}>Check-in saved</Text>
              </View>
            )}
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

        {/* The 28-day grid, filled in one check-in at a time */}
        <RunGrid
          totalDays={view.isBaseline ? experiment.lengthDays : view.totalDays}
          todayIndex={view.isBaseline ? -1 : view.isFinished ? view.totalDays : view.dayNumber - 1}
          checkedIn={loaded.checkedIn}
          verdictIn={verdictIn}
          finished={view.isFinished}
        />

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
            subtitle={rewardCopy('homeTile')}
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

/** Icon circle colors for the check-in test rows, in battery order. */
const TEST_DOT = [brand.tang, brand.lilac, brand.mint, brand.sun] as const;

/** One test in today's check-in: icon dot, name, what to do, rough time. */
function TestRow({ id, color }: { id: TestId; color: string }) {
  const t = TEST_CATALOG[id];
  return (
    <View style={styles.testRow}>
      <View style={[styles.testDot, { backgroundColor: color }]}>
        <Icon name={t.icon as IconName} size={20} color={brand.ink} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.testName}>{t.name}</Text>
        <Text style={styles.testBlurb} numberOfLines={1}>
          {t.blurb.replace(/\.$/, '')}
        </Text>
      </View>
      <Text style={styles.testTime}>{`${t.seconds} s`}</Text>
    </View>
  );
}

/** Today's call as a tilted card: tang ON, white OFF, lilac during baseline. */
function ArmTile({ arm }: { arm: 'ON' | 'OFF' | null }) {
  const fill = arm === 'ON' ? brand.tang : arm === 'OFF' ? brand.white : brand.lilac;
  return (
    <View style={[styles.armTile, { backgroundColor: fill }]}>
      {arm ? (
        <Text style={styles.armText}>{arm}</Text>
      ) : (
        <Icon name="clock" size={26} color={brand.ink} />
      )}
    </View>
  );
}

type RunGridProps = {
  totalDays: number;
  /** 0-based index of today in the run; -1 before day 1, totalDays when done. */
  todayIndex: number;
  checkedIn: Set<number>;
  verdictIn: number;
  finished: boolean;
};

/**
 * The run as a grid of days: ink with a check for each check-in, a dash for a
 * missed day (shown, not shamed), today ringed in tang, the rest outlined.
 * Which days were ON or OFF stays off this grid; results stay locked.
 */
function RunGrid({ totalDays, todayIndex, checkedIn, verdictIn, finished }: RunGridProps) {
  const days = Array.from({ length: totalDays }, (_, i) => i);
  const done = days.filter((i) => checkedIn.has(i)).length;
  const missed = days.filter((i) => i < todayIndex && !checkedIn.has(i)).length;
  const toGo = Math.max(0, totalDays - Math.max(0, todayIndex) - (checkedIn.has(todayIndex) ? 1 : 0));
  const unlock = new Date();
  unlock.setDate(unlock.getDate() + verdictIn);
  return (
    <View style={styles.gridCard}>
      <View style={styles.gridHead}>
        <Icon name={finished ? 'sparkle' : 'lock'} size={22} color={brand.ink} />
        <Text style={styles.gridTitle}>
          {finished
            ? 'Results unlocked'
            : `Results locked until ${unlock.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
        </Text>
      </View>
      <Text style={styles.gridBody}>
        {finished
          ? 'Every day is in. Open your verdict to see whether your ON days beat your OFF days.'
          : `Every check-in adds to your result. On day ${totalDays} you see whether your ON days beat your OFF days.`}
      </Text>
      <View style={styles.dayGrid}>
        {days.map((i) => {
          const isToday = i === todayIndex;
          if (checkedIn.has(i)) {
            return (
              <View key={i} style={[styles.cell, styles.cellDone]}>
                <Icon name="check" size={16} color={brand.white} strokeWidth={3} />
              </View>
            );
          }
          if (i < todayIndex) {
            return (
              <View key={i} style={[styles.cell, styles.cellMissed]}>
                <View style={styles.missDash} />
              </View>
            );
          }
          if (isToday) {
            return (
              <View key={i} style={[styles.cell, styles.cellToday]}>
                <Text style={styles.cellTodayText}>{i + 1}</Text>
              </View>
            );
          }
          return <View key={i} style={[styles.cell, styles.cellFuture]} />;
        })}
      </View>
      <View style={styles.gridFoot}>
        <Text style={styles.gridFootStrong}>{`${done} done`}</Text>
        <Text style={styles.gridFootText}>{`${missed} missed`}</Text>
        <Text style={styles.gridFootText}>{`${toGo} to go`}</Text>
      </View>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  date: { fontSize: 15, fontFamily: fonts.medium, color: brand.muted },
  dayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  dayBig: { fontSize: 38, letterSpacing: -1.2, fontFamily: fonts.display, color: brand.ink },
  dayOf: { fontSize: 22, letterSpacing: -0.4, fontFamily: fonts.displayBold, color: brand.muted },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: brand.lilacSoft,
  },
  armTile: {
    width: 64,
    height: 76,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '6deg' }],
  },
  armText: { fontSize: 22, fontFamily: fonts.display, color: brand.ink },
  doseText: { flex: 1, gap: 6 },
  doseTitle: { fontSize: 22, letterSpacing: -0.4, fontFamily: fonts.displayBold, color: brand.ink },
  doseBody: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted },
  doseButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: brand.ink,
  },
  doseButtonText: { fontSize: 15, fontFamily: fonts.semibold, color: brand.paper },
  windowText: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  pressed: { opacity: 0.7 },
  checkIn: { backgroundColor: brand.ink, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 22, gap: 16 },
  checkInHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkInTitle: { fontSize: 26, letterSpacing: -0.6, fontFamily: fonts.display, color: brand.paper },
  checkInSub: { fontSize: 15, fontFamily: fonts.regular, color: 'rgba(247,244,238,0.72)', marginTop: 4 },
  testList: { gap: 8 },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: brand.ink2,
  },
  testDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  testName: { fontSize: 16, fontFamily: fonts.semibold, color: brand.paper },
  testBlurb: { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(247,244,238,0.62)' },
  testTime: { fontSize: 13, fontFamily: fonts.medium, color: 'rgba(247,244,238,0.62)' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneText: { fontSize: 16, fontFamily: fonts.semibold, color: brand.paper },
  gridCard: {
    backgroundColor: brand.white,
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  gridHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gridTitle: { flex: 1, fontSize: 20, letterSpacing: -0.3, fontFamily: fonts.displayBold, color: brand.ink },
  gridBody: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '12.5%', aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellDone: { backgroundColor: brand.ink },
  cellMissed: { backgroundColor: brand.paperDeep },
  missDash: { width: 12, height: 2.5, borderRadius: 2, backgroundColor: brand.muted },
  cellToday: { backgroundColor: brand.tangSoft, borderWidth: 2.5, borderColor: brand.tang },
  cellTodayText: { fontSize: 13, fontFamily: fonts.bold, color: brand.tangInk },
  cellFuture: { borderWidth: 1.5, borderColor: brand.line },
  gridFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  gridFootStrong: { fontSize: 13, fontFamily: fonts.semibold, color: brand.ink },
  gridFootText: { fontSize: 13, fontFamily: fonts.semibold, color: brand.muted },
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
  riskText: { flex: 1, color: brand.tangInk, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  hero: { backgroundColor: brand.ink, borderRadius: 28, padding: 20, gap: 14, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.2 },
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
  takenText: { fontSize: 16, fontFamily: fonts.semibold, color: brand.mintInk },
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
  helpLinkText: { fontSize: 15, fontFamily: fonts.semibold, color: brand.tangInk },
});
