import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  adherencePercent,
  buildCalendar,
  COMPLIANCE_DISCLAIMER,
  isMidpointWindow,
  isRunComplete,
  summarizeAdherence,
} from '@/results';
import { BASELINE_DAYS } from '@/engines/experiment';
import { getDatabase } from '@/db';
import { loadGameState } from '@/features/gamification';
import { useExperimentData } from '@/screens/useExperimentData';
import { JourneyPath, StreakFlame } from '@/components/game';
import { Button, Card, Scaffold, gameColors, lightTheme } from '@/ui';

/**
 * Journey (progress) screen: the run as a winding trail of day stops with
 * milestones, plus adherence and streak stats. It shows per-day done / missed
 * status and never a metric value or trend, so the user cannot peek at results
 * and unblind themselves. Results are revealed only once the run is complete,
 * via the Verdict screen.
 */
export default function ProgressScreen() {
  const { experiment, schedule, sessions, todayIndex, baselineDaysLeft } = useExperimentData();
  const game = useMemo(() => loadGameState(getDatabase()), []);

  const calendar = useMemo(
    () => (experiment ? buildCalendar(schedule, sessions, todayIndex) : []),
    [experiment, schedule, sessions, todayIndex],
  );
  const summary = useMemo(
    () => (experiment ? summarizeAdherence(schedule, sessions, todayIndex) : null),
    [experiment, schedule, sessions, todayIndex],
  );

  if (!experiment || !summary) {
    return (
      <Scaffold>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.title}>Your journey starts here</Text>
          <Text style={styles.muted}>Start an experiment to see your run mapped out day by day.</Text>
        </View>
      </Scaffold>
    );
  }

  const complete = isRunComplete(todayIndex, experiment.lengthDays);
  const midpoint = isMidpointWindow(todayIndex, experiment.lengthDays);
  const pct = adherencePercent(summary);

  return (
    <Scaffold>
      <Text style={styles.subtitle}>
        {baselineDaysLeft > 0
          ? `Baseline: the experiment starts in ${baselineDaysLeft} day${baselineDaysLeft === 1 ? '' : 's'}`
          : `Day ${todayIndex + 1} of ${experiment.lengthDays}`}
      </Text>

      <View style={styles.row}>
        <View style={[styles.tile, { backgroundColor: lightTheme.colors.accentMuted }]}>
          <Text style={[styles.big, { color: lightTheme.colors.accent }]}>{pct}%</Text>
          <Text style={styles.tileLabel}>Adherence</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: gameColors.flameMuted }]}>
          <StreakFlame count={game.streak.current} atRisk={game.streak.atRisk} size="lg" style={styles.clear} />
          <Text style={styles.tileLabel}>Day streak</Text>
        </View>
      </View>
      <Text style={styles.muted}>
        {`${summary.takenDays} of ${summary.scheduledDays} scheduled days taken and tested. Keep it at 80% or more for a trustworthy verdict.`}
      </Text>

      {midpoint && !complete && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>⭐ Halfway there</Text>
          <Text style={styles.muted}>
            We show adherence only for now. Your results stay sealed until the experiment ends, so the
            wait can&apos;t sway what you measure.
          </Text>
        </Card>
      )}

      {complete && <Button label="Reveal my verdict 🏆" onPress={() => router.push('/verdict')} />}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Your trail</Text>
        <View style={styles.legend}>
          <Legend color={gameColors.mint} label="Dose + check-in" />
          <Legend color={lightTheme.colors.accent} label="Half done" />
          <Legend color="#C9C4D9" label="Missed" />
          <Legend color={gameColors.locked} label="Ahead" />
        </View>
        <JourneyPath
          days={calendar}
          todayIndex={todayIndex}
          baselineDaysLeft={baselineDaysLeft}
          baselineDays={BASELINE_DAYS}
        />
      </Card>

      {!complete && (
        <Text style={styles.muted}>
          Results appear once the experiment ends. Steady days are what make the verdict trustworthy.
        </Text>
      )}

      <Text style={styles.disclaimer}>{COMPLIANCE_DISCLAIMER}</Text>
    </Scaffold>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const c = lightTheme.colors;
const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 10, paddingTop: 60 },
  emptyEmoji: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: '800', color: c.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', color: c.textSecondary },
  row: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', gap: 6 },
  clear: { backgroundColor: 'transparent' },
  big: { fontSize: 36, fontWeight: '800' },
  tileLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
  card: { gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  muted: { fontSize: 14, lineHeight: 19, color: c.textSecondary, textAlign: 'left' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 12, color: c.textSecondary },
  disclaimer: { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
});
