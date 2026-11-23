import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card, Text, colors, spacing } from '@/ui';
import {
  COMPLIANCE_DISCLAIMER,
  computeExperimentVerdict,
  type MetricVerdict,
  type VerdictViewModel,
} from '@/results';
import { getDatabase } from '@/db';
import { useExperimentData } from '@/screens/useExperimentData';
import { ShareCard, type ViewRef } from '@/screens/ShareCard';
import { shareCard } from '@/screens/share';

/**
 * Verdict screen: the payoff. It runs the stats engine over the finished run,
 * persists the result rows, and shows the primary metric prominently with the
 * engine's plain-language verdict, secondary metrics below, the unblinded A/B
 * mapping for a blinded run, a monthly cost line, and the compliance copy.
 * Below the 80% adherence gate it shows the improve-adherence state instead of
 * a verdict. A branded share card can be exported to the OS share sheet.
 */
export default function VerdictScreen() {
  const { experiment, schedule, sessions, supplement } = useExperimentData();
  const shareRef = useRef<ViewRef>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const vm: VerdictViewModel | null = useMemo(() => {
    if (!experiment) return null;
    // Open runs unblind without a passphrase; a sealed/self-blind run needs the
    // stored unseal passphrase, which the unblinding step provides at run end.
    const passphrase =
      experiment.blindingMode === 'self_blind'
        ? `self-blind:${experiment.id}`
        : undefined;
    try {
      return computeExperimentVerdict(getDatabase(), {
        experiment,
        schedule,
        sessions,
        unsealPassphrase: passphrase,
      });
    } catch {
      return null;
    }
  }, [experiment, schedule, sessions]);

  if (!experiment || !vm) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text variant="title">Verdict</Text>
          <Text tone="secondary" style={styles.center}>
            Your verdict appears here once the experiment ends.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const supplementName = supplement?.name ?? 'Your supplement';

  async function onShare() {
    const ok = await shareCard(shareRef);
    setShareNote(ok ? null : 'Sharing isn\u2019t available on this device.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="largeTitle">Your verdict</Text>
        <Text tone="secondary">{supplementName}</Text>

        {!vm.adherenceMet ? (
          <Card style={styles.primaryCard}>
            <Text variant="title" tone="secondary">
              {vm.primary.verdictSentence}
            </Text>
            <Text tone="secondary">
              Adherence was {Math.round(vm.adherence.rate * 100)}%. A verdict needs at least 80%
              of days both taken and tested, so there isn\u2019t enough clean data yet.
            </Text>
          </Card>
        ) : (
          <PrimaryVerdict primary={vm.primary} monthlyCost={vm.monthlyCost} />
        )}

        {vm.unblindedCaveat && (
          <Card style={styles.caveatCard}>
            <Text variant="caption" tone="secondary">
              {vm.unblindedCaveat}
            </Text>
          </Card>
        )}

        {vm.revealedMapping && (
          <Card style={styles.caveatCard}>
            <Text variant="headline">Unblinded</Text>
            <Text tone="secondary">
              {vm.revealedMapping.supplementLabel} was the supplement;{' '}
              {vm.revealedMapping.placeboLabel} was the placebo.
            </Text>
          </Card>
        )}

        {vm.adherenceMet && vm.secondary.some((s) => s.analyzed) && (
          <View style={styles.section}>
            <Text variant="headline">Other measures</Text>
            {vm.secondary
              .filter((s) => s.analyzed)
              .map((s) => (
                <SecondaryRow key={s.metric} metric={s} />
              ))}
          </View>
        )}

        {vm.adherenceMet && (
          <View style={styles.shareWrap}>
            <Button label="Share your result" onPress={onShare} />
            {shareNote && (
              <Text variant="caption" tone="secondary" style={styles.center}>
                {shareNote}
              </Text>
            )}
          </View>
        )}

        <Button label="See the evidence" variant="secondary" onPress={() => router.push('/evidence-card')} />

        <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
          {COMPLIANCE_DISCLAIMER}
        </Text>
      </ScrollView>

      {/* Off-screen capture target for the share image. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard ref={shareRef} supplementName={supplementName} primary={vm.primary} monthlyCost={vm.monthlyCost} />
      </View>
    </SafeAreaView>
  );
}

function PrimaryVerdict({ primary, monthlyCost }: { primary: MetricVerdict; monthlyCost: string | null }) {
  const tone =
    primary.dbVerdict === 'works' ? 'positive' : primary.dbVerdict === 'harmful' ? 'negative' : 'primary';
  return (
    <Card style={styles.primaryCard}>
      <Text variant="title" tone={tone}>
        {primary.verdictSentence}
      </Text>
      {primary.effectSentence && (
        <Text variant="headline" tone="secondary">
          {primary.effectSentence}
        </Text>
      )}
      {monthlyCost && (
        <Text variant="body" tone="secondary">
          Cost: {monthlyCost}
        </Text>
      )}
    </Card>
  );
}

function SecondaryRow({ metric }: { metric: MetricVerdict }) {
  return (
    <Card style={styles.secondaryCard}>
      <Text variant="headline" style={styles.secondaryLabel}>
        {metric.label}
      </Text>
      <Text tone="secondary">{metric.effectSentence ?? metric.verdictSentence}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  center: { textAlign: 'center' },
  primaryCard: { gap: spacing.md },
  caveatCard: { gap: spacing.xs },
  section: { gap: spacing.sm },
  secondaryCard: { gap: spacing.xs },
  secondaryLabel: { textTransform: 'capitalize' },
  shareWrap: { gap: spacing.sm },
  disclaimer: { marginTop: spacing.sm, textAlign: 'center' },
  offscreen: { position: 'absolute', left: -9999, top: 0 },
});
