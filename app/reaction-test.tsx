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
import { Button, Card, Scaffold, Text, spacing } from '@/ui';

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
  const [score, setScore] = useState<QuickTestScore | null>(null);
  const [comparison, setComparison] = useState<string | null>(null);
  const [history, setHistory] = useState<{ best: QuickTest | undefined; recent: QuickTest[] }>(() => {
    const db = getDatabase();
    return { best: quickTests.best(db), recent: quickTests.listRecent(db, 5) };
  });

  const hasActiveExperiment = useMemo(
    () => experiments.listByStatus(getDatabase(), 'active').length > 0,
    [],
  );

  const schedule = useMemo(
    () => generatePvtSchedule({ trials: PVT_DEFAULT_TRIALS, seed: (Date.now() + runKey) & 0xffff }),
    [runKey],
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
      } else {
        setComparison(null);
      }
      setPhase('result');
    },
    [schedule.length],
  );

  const start = useCallback(() => {
    setRunKey((k) => k + 1);
    setPhase('test');
  }, []);

  if (phase === 'test') {
    return <PvtTask key={runKey} schedule={schedule} onDone={onDone} />;
  }

  if (phase === 'result' && score) {
    return (
      <Scaffold
        footer={
          <View style={styles.footer}>
            <Button label="Try again" onPress={start} />
            <Button label="Done" variant="subtle" onPress={() => router.back()} />
          </View>
        }
      >
        {score.ok ? (
          <View style={styles.hero}>
            <Text variant="caption" tone="secondary">
              YOUR REACTION TIME
            </Text>
            <Text style={styles.bigNumber}>{`${score.medianMs} ms`}</Text>
            <Text variant="title3" tone="accent">
              {speedLabel(score.medianMs)}
            </Text>
            {comparison && <Text tone="secondary">{comparison}</Text>}
            <Button
              label="Share my score"
              variant="secondary"
              onPress={() => {
                void Share.share({ message: shareText(score.medianMs) });
              }}
            />
          </View>
        ) : (
          <View style={styles.hero}>
            <Text variant="title2">No score this time</Text>
            <Text tone="secondary">
              {score.reason === 'abandoned'
                ? 'The run ended early. Tap every dot to get a score.'
                : 'Too many taps came before the dot appeared. Wait for it, then tap.'}
            </Text>
          </View>
        )}

        {!hasActiveExperiment && (
          <Card>
            <Text variant="headline">Does your nootropic change this?</Text>
            <Text tone="secondary">
              Run a blinded 3 to 4 week experiment with this test every day and get a real verdict
              on whether it works for you.
            </Text>
            <Button label="Start an experiment" variant="secondary" onPress={() => router.push('/welcome')} />
          </Card>
        )}

        <Text variant="caption" tone="tertiary">
          Scores vary with your phone&apos;s touch latency, so compare yourself with yourself. Not a
          medical test.
        </Text>
      </Scaffold>
    );
  }

  return (
    <Scaffold footer={<Button label="Start" onPress={start} />}>
      <View style={styles.hero}>
        <Text variant="largeTitle">Reaction test</Text>
        <Text tone="secondary">
          About 30 seconds. A dot appears {PVT_DEFAULT_TRIALS} times at random moments; tap it as fast
          as you can. Free, no sign-up.
        </Text>
      </View>

      {history.best && (
        <Card>
          <Text variant="headline">Personal best</Text>
          <Text variant="title2" tone="accent">{`${Math.round(history.best.medianMs)} ms`}</Text>
          {history.recent.length > 0 && (
            <Text tone="secondary">
              {`Recent: ${history.recent.map((q) => `${Math.round(q.medianMs)}`).join(', ')} ms`}
            </Text>
          )}
        </Card>
      )}
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  bigNumber: {
    fontSize: 64,
    fontWeight: '700',
  },
  footer: {
    gap: spacing.sm,
  },
});
