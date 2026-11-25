import { useCallback, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { experiments, getDatabase, quickTests, type QuickTest } from '@/db';
import { generatePvtSchedule, PVT_DEFAULT_TRIALS } from '@/engines/cognitive-test';
import {
  comparedToBest,
  scoreQuickTest,
  shareText,
  speedLabel,
  type QuickTestScore,
} from '@/features/quick-test';
import { PvtTask } from '@/screens/PvtTask';
import { claimProgress, type ProgressDelta } from '@/features/gamification';
import { Confetti, celebrate } from '@/components/game';
import { Icon, Brian, type IconName } from '@/brand';
import { Button, Card, Scaffold, Text, brand, fonts, spacing } from '@/ui';

type Phase = 'intro' | 'test' | 'result';

function newId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Free reaction test: the check-in's reaction-time task on its own. No
 * experiment, no supplement, no paywall. Shows the score, a personal best, and
 * a share button, then points to running a real experiment.
 */
export default function ReactionTestScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [runKey, setRunKey] = useState(0);
  const [schedule, setSchedule] = useState<number[]>([]);
  const [score, setScore] = useState<QuickTestScore | null>(null);
  const [comparison, setComparison] = useState<string | null>(null);
  const [reward, setReward] = useState<ProgressDelta | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [history, setHistory] = useState<{ best: QuickTest | undefined; recent: QuickTest[] }>(() => {
    const db = getDatabase();
    return { best: quickTests.best(db), recent: quickTests.listRecent(db, 5) };
  });

  const hasActiveExperiment = useMemo(
    () => experiments.listByStatus(getDatabase(), 'active').length > 0,
    [],
  );

  const onDone = useCallback(
    (rts: number[]) => {
      const result = scoreQuickTest(rts, schedule.length);
      setScore(result);
      if (result.ok) {
        const db = getDatabase();
        const previousBest = quickTests.best(db)?.medianMs ?? null;
        setComparison(comparedToBest(result.medianMs, previousBest));
        quickTests.insert(db, {
          id: newId(),
          takenAt: new Date().toISOString(),
          medianMs: result.medianMs,
          lapses: result.lapses,
          trials: result.trials,
        });
        setHistory({ best: quickTests.best(db), recent: quickTests.listRecent(db, 5) });
        setNewBest(previousBest === null || result.medianMs < previousBest);
        setReward(claimProgress(db).delta);
        celebrate();
      } else {
        setComparison(null);
        setReward(null);
        setNewBest(false);
      }
      setPhase('result');
    },
    [schedule.length],
  );

  const start = useCallback(() => {
    setSchedule(generatePvtSchedule({ trials: PVT_DEFAULT_TRIALS, seed: Date.now() & 0xffff }));
    setRunKey((k) => k + 1);
    setPhase('test');
  }, []);

  if (phase === 'test') {
    return <PvtTask key={runKey} schedule={schedule} onDone={onDone} />;
  }

  if (phase === 'result' && score) {
    const party = score.ok && (newBest || (reward !== null && (reward.newBadges.length > 0 || reward.levelUp !== null)));
    return (
      <View style={styles.flex}>
        <Scaffold
          footer={
            <View style={styles.footer}>
              <Button label="Try again" onPress={start} />
              <Button label="Done" variant="subtle" onPress={() => router.back()} />
            </View>
          }
        >
          {score.ok ? (
            <View style={styles.resultCard}>
              <Text style={styles.eyebrow}>YOUR REACTION TIME</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.bigNumber}>{String(score.medianMs)}</Text>
                <Text style={styles.unit}>ms</Text>
              </View>
              <View style={styles.speedChip}>
                <Icon name="bolt" size={16} color={brand.tang} strokeWidth={2.4} />
                <Text style={styles.speedText}>{speedLabel(score.medianMs)}</Text>
              </View>
              {comparison && (
                <Text tone="secondary" style={styles.centerText}>
                  {comparison}
                </Text>
              )}
              {reward && (
                <View style={styles.rewardRow}>
                  <RewardPill
                    icon="sparkle"
                    tint={brand.sunSoft}
                    color={brand.sunDeep}
                    label={reward.xpGained > 0 ? `+${reward.xpGained} XP` : 'Daily XP maxed'}
                  />
                  <RewardPill icon="flame" tint={brand.tangSoft} color={brand.tang} label={`${reward.streak} day streak`} />
                  {reward.newBadges.map((b) => (
                    <RewardPill key={b.id} icon="medal" tint={brand.mintSoft} color={brand.mint} label={b.title} />
                  ))}
                  {reward.levelUp !== null && (
                    <RewardPill icon="crown" tint={brand.lilacSoft} color={brand.lilacDeep} label={`Level ${reward.levelUp}`} />
                  )}
                </View>
              )}
              <Button
                label="Share my score"
                variant="secondary"
                fullWidth
                onPress={() => {
                  void Share.share({ message: shareText(score.medianMs) });
                }}
              />
            </View>
          ) : (
            <View style={styles.failCard}>
              <Brian size={110} mood="wow" />
              <Text variant="title2" style={styles.centerText}>
                No score this time
              </Text>
              <Text tone="secondary" style={styles.centerText}>
                {score.reason === 'abandoned'
                  ? 'The run ended early. Tap every dot to get a score.'
                  : 'Too many taps came before the dot appeared. Wait for it, then tap.'}
              </Text>
            </View>
          )}

          {!hasActiveExperiment && (
            <Card style={styles.upsell}>
              <View style={styles.upsellIcon}>
                <Icon name="flask" size={22} color={brand.white} />
              </View>
              <Text variant="title3">Does your nootropic change this?</Text>
              <Text tone="secondary">
                Run a blinded 3 to 4 week experiment with this test every day and get a real verdict
                on whether it works for you.
              </Text>
              <Button label="Start an experiment" variant="secondary" onPress={() => router.push('/welcome')} />
            </Card>
          )}

          <Text variant="caption" tone="tertiary" style={styles.centerText}>
            Scores vary with your phone&apos;s touch latency, so compare yourself with yourself. Not a
            medical test.
          </Text>
        </Scaffold>
        {party ? <Confetti burstKey={runKey} /> : null}
      </View>
    );
  }

  return (
    <Scaffold footer={<Button label="Start" onPress={start} />}>
      <View style={styles.intro}>
        <Brian size={140} mood="focused" />
        <Text variant="largeTitle" style={styles.centerText}>
          How fast is your brain today?
        </Text>
        <Text tone="secondary" style={styles.centerText}>
          About 30 seconds. A dot appears {PVT_DEFAULT_TRIALS} times at random moments. Tap it as fast
          as you can. Free, no sign-up.
        </Text>
      </View>

      {history.best && (
        <Card style={styles.bestCard}>
          <View style={styles.bestRow}>
            <View style={styles.bestIcon}>
              <Icon name="trophy" size={20} color={brand.sun} />
            </View>
            <View style={styles.flex}>
              <Text variant="caption" tone="secondary">
                PERSONAL BEST
              </Text>
              <Text style={styles.bestValue}>{`${Math.round(history.best.medianMs)} ms`}</Text>
            </View>
          </View>
          {history.recent.length > 0 && (
            <Text variant="footnote" tone="secondary">
              {`Recent: ${history.recent.map((q) => `${Math.round(q.medianMs)}`).join(', ')} ms`}
            </Text>
          )}
        </Card>
      )}
    </Scaffold>
  );
}

function RewardPill({ icon, tint, color, label }: { icon: IconName; tint: string; color: string; label: string }) {
  return (
    <View style={[styles.rewardPill, { backgroundColor: tint }]}>
      <Icon name={icon} size={14} color={color} strokeWidth={2.4} />
      <Text style={[styles.rewardText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  intro: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  resultCard: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: brand.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  failCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  eyebrow: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 1.2, color: brand.muted },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bigNumber: {
    // Its own line height: the base Text style's 24pt line would clip a 88pt
    // number and push it up over the label above.
    fontSize: 88,
    lineHeight: 96,
    fontFamily: fonts.display,
    letterSpacing: -3,
    color: brand.ink,
  },
  unit: { fontSize: 22, lineHeight: 40, fontFamily: fonts.displayBold, color: brand.muted },
  speedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand.tangSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  speedText: { fontSize: 15, fontFamily: fonts.semibold, color: brand.tangDeep },
  footer: {
    gap: spacing.sm,
  },
  rewardRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rewardText: { fontSize: 13, fontFamily: fonts.semibold },
  upsell: { gap: spacing.sm, borderRadius: 24 },
  upsellIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  bestCard: { gap: spacing.sm, borderRadius: 20 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bestIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestValue: { fontSize: 24, lineHeight: 30, fontFamily: fonts.display, color: brand.ink },
});
