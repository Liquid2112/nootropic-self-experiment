import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, CalendarCell, Text, colors, spacing } from '@/ui';
import {
  adherencePercent,
  buildCalendar,
  COMPLIANCE_DISCLAIMER,
  isMidpointWindow,
  isRunComplete,
  summarizeAdherence,
} from '@/results';
import { useExperimentData } from '@/screens/useExperimentData';
import { router } from 'expo-router';

/**
 * Progress screen: the adherence calendar ONLY. It shows per-day taken / missed
 * / test-done status and never a metric value or trend, so the user cannot peek
 * at results and unblind themselves. During the mid-point window (days 10-14)
 * it shows the adherence summary with an explicit "results after it ends" note.
 * Results are revealed only once the run is complete, via the Verdict screen.
 */
export default function ProgressScreen() {
  const { experiment, schedule, sessions, todayIndex } = useExperimentData();

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
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text variant="title">Progress</Text>
          <Text tone="secondary" style={styles.center}>
            Start an experiment to track your daily adherence here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const complete = isRunComplete(todayIndex, experiment.lengthDays);
  const midpoint = isMidpointWindow(todayIndex, experiment.lengthDays);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="largeTitle">Progress</Text>
        <Text tone="secondary">
          Day {todayIndex + 1} of {experiment.lengthDays}
        </Text>

        <Card style={styles.summaryCard}>
          <Text variant="headline">Adherence</Text>
          <Text variant="largeTitle" tone="accent">
            {adherencePercent(summary)}%
          </Text>
          <Text tone="secondary">
            {summary.takenDays} of {summary.scheduledDays} scheduled days taken and tested.
          </Text>
        </Card>

        {midpoint && !complete && (
          <Card style={styles.noteCard}>
            <Text variant="headline">Mid-point check</Text>
            <Text tone="secondary">
              You\u2019re halfway. We show adherence only for now \u2014 your results stay sealed
              until the experiment ends, so the wait can\u2019t sway what you measure.
            </Text>
          </Card>
        )}

        <Card>
          <Text variant="headline" style={styles.calendarTitle}>
            Daily log
          </Text>
          <View style={styles.legend}>
            <Legend color={colors.taken} label="Taken" />
            <Legend color={colors.missed} label="Missed" />
            <Legend color={colors.surfaceMuted} label="Upcoming" />
            <Legend ring label="Test done" />
          </View>
          <View style={styles.grid}>
            {calendar.map((day) => (
              <CalendarCell
                key={day.dayIndex}
                dayNumber={day.dayNumber}
                status={day.status}
                tested={day.tested}
              />
            ))}
          </View>
        </Card>

        {complete ? (
          <Button label="See your verdict" onPress={() => router.push('/verdict')} />
        ) : (
          <Card style={styles.noteCard}>
            <Text tone="secondary">
              Results appear here once the experiment ends. Keep going \u2014 steady adherence is
              what makes the verdict trustworthy.
            </Text>
          </Card>
        )}

        <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
          {COMPLIANCE_DISCLAIMER}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({ color, ring, label }: { color?: string; ring?: boolean; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color ?? colors.surface },
          ring ? { borderWidth: 2, borderColor: colors.tested } : null,
        ]}
      />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  center: { textAlign: 'center' },
  summaryCard: { alignItems: 'flex-start', gap: spacing.xs },
  noteCard: { gap: spacing.sm },
  calendarTitle: { marginBottom: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendSwatch: { width: 16, height: 16, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  disclaimer: { marginTop: spacing.sm, textAlign: 'center' },
});
