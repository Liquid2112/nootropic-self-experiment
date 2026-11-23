import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card, Text, colors, spacing, radius, fontSize } from '@/ui';
import {
  COMPLIANCE_DISCLAIMER,
  computeExperimentVerdict,
  type MetricVerdict,
  type VerdictViewModel,
} from '@/results';
import { getDatabase } from '@/db';
import { selfBlindPassphrase } from '@/engines/experiment';
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
  // Friend-blinded runs need the friend's passphrase typed in at run end; held
  // here until entered. Self-blind and open runs never use it.
  const [friendPassphrase, setFriendPassphrase] = useState('');
  const [unsealError, setUnsealError] = useState<string | null>(null);

  const vm: VerdictViewModel | null = useMemo(() => {
    if (!experiment) return null;
    // Resolve the unseal passphrase per blinding mode:
    //   - open ('none')      : no passphrase needed.
    //   - self-blind         : derived from the seed persisted at seal time, so
    //                          the same key input is used to seal and unseal.
    //   - friend-blind       : the friend's passphrase, typed in below.
    let passphrase: string | undefined;
    if (experiment.blindingMode === 'self_blind') {
      passphrase = experiment.seed ? selfBlindPassphrase(experiment.seed) : undefined;
    } else if (experiment.blindingMode === 'sealed') {
      passphrase = friendPassphrase.trim().length > 0 ? friendPassphrase : undefined;
    }
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
  }, [experiment, schedule, sessions, friendPassphrase]);

  // A friend-blinded run can't be unblinded until the friend enters the
  // passphrase. Show the entry step (not the permanent placeholder) so the run
  // can actually reach its verdict.
  if (experiment && experiment.blindingMode === 'sealed' && !vm) {
    return (
      <FriendPassphraseEntry
        value={friendPassphrase}
        error={unsealError}
        onChange={(t) => {
          setFriendPassphrase(t);
          setUnsealError(null);
        }}
        onSubmit={() => {
          if (friendPassphrase.trim().length === 0) {
            setUnsealError('Enter the passphrase your friend sealed the run with.');
          } else {
            // vm stays null until the passphrase unseals; surface a wrong-phrase
            // message rather than silently showing the placeholder.
            setUnsealError('That passphrase didn\u2019t unlock the run. Check it and try again.');
          }
        }}
      />
    );
  }

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

/**
 * Friend-blinded unblinding step. The friend sealed the A/B -> supplement
 * mapping with a passphrase they kept off-device; at run end they enter it here
 * to unseal and reveal the verdict. Without this step a friend-blinded run can
 * never leave the placeholder.
 */
function FriendPassphraseEntry({
  value,
  error,
  onChange,
  onSubmit,
}: {
  value: string;
  error: string | null;
  onChange: (text: string) => void;
  onSubmit: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="largeTitle">Unblind your run</Text>
        <Text tone="secondary">
          Your run is over. Ask your friend for the passphrase they sealed the A/B assignment
          with, then enter it to reveal your verdict.
        </Text>
        <Card style={styles.primaryCard}>
          <Text variant="headline">Sealing passphrase</Text>
          <TextInput
            testID="friend-unseal-passphrase"
            value={value}
            onChangeText={onChange}
            placeholder="Enter the sealed passphrase"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {error && (
            <Text variant="caption" tone="negative">
              {error}
            </Text>
          )}
          <Button label="Reveal verdict" testID="friend-unseal-submit" onPress={onSubmit} />
        </Card>
      </ScrollView>
    </SafeAreaView>
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
