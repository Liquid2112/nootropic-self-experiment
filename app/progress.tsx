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
import { Button, Card, Scaffold, brand, fonts } from '@/ui';
import { Icon, Brian } from '@/brand';

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
          <Brian size={110} mood="sleepy" />
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
        <View style={styles.tile}>
          <Text style={styles.big}>{pct}%</Text>
          <Text style={styles.tileLabel}>Adherence</Text>
        </View>
        <View style={styles.tile}>
          <StreakFlame count={game.streak.current} atRisk={game.streak.atRisk} size="lg" style={styles.clear} />
          <Text style={styles.tileLabel}>Day streak</Text>
        </View>
      </View>
      <Text style={styles.muted}>
        {`${summary.takenDays} of ${summary.scheduledDays} scheduled days taken and tested. Keep it at 80% or more for a trustworthy verdict.`}
      </Text>

      {midpoint && !complete && (
        <Card style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Icon name="star" size={16} color={brand.sun} strokeWidth={2.4} />
            </View>
            <Text style={styles.cardTitle}>Halfway there</Text>
          </View>
          <Text style={styles.muted}>
            We show adherence only for now. Your results stay sealed until the experiment ends, so the
            wait can&apos;t sway what you measure.
          </Text>
        </Card>
      )}

      {complete &&  <Button label="Reveal my verdict" onPress={() => router.push('/verdict')} />}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Your trail</Text>
        <View style={styles.legend}>
          <Legend color={brand.mint} label="Dose + check-in" />
          <Legend color={brand.sun} label="Half done" />
          <Legend color="#D8D2C6" label="Missed" />
          <Legend color={brand.paperDeep} label="Ahead" />
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

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 12, paddingTop: 56 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: fonts.display, letterSpacing: -0.6, color: brand.ink, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: fonts.semibold, color: brand.muted },
  row: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  clear: { backgroundColor: 'transparent' },
  big: { fontSize: 34, lineHeight: 40, fontFamily: fonts.display, letterSpacing: -0.8, color: brand.ink },
  tileLabel: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  card: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: brand.ink, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, lineHeight: 23, fontFamily: fonts.displayBold, color: brand.ink },
  muted: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: brand.muted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: fonts.medium, color: brand.muted },
  disclaimer: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, color: brand.faint, textAlign: 'center' },
});
