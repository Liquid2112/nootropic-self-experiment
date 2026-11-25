import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Icon, Brian, type IconName, type BrianMood } from '@/brand';
import { Button, Card, Text, brand, fonts, spacing, radius } from '@/ui';
import {
  COMPLIANCE_DISCLAIMER,
  computeExperimentVerdict,
  type MetricVerdict,
  type VerdictViewModel,
} from '@/results';
import { experiments, getDatabase, healthNights } from '@/db';
import { addDays, selfBlindPassphrase } from '@/engines/experiment';
import { useExperimentData } from '@/screens/useExperimentData';
import { ShareCard, type ViewRef } from '@/screens/ShareCard';
import { shareCard } from '@/screens/share';
import { normalizeKey, referralMessage, referralState } from '@/features/referral';
import { track, trackOnce } from '@/features/analytics';
import { localDay } from '@/features/gamification';

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
  // A keyholder's unlock link opens this screen with the key filled in.
  const params = useLocalSearchParams<{ key?: string }>();
  const [friendPassphrase, setFriendPassphrase] = useState(() =>
    typeof params.key === 'string' ? normalizeKey(params.key) : '',
  );
  const [referralCode] = useState(() => {
    try {
      return referralState(getDatabase()).myCode;
    } catch {
      return null;
    }
  });
  const [unsealError, setUnsealError] = useState<string | null>(null);

  const vm: VerdictViewModel | null = useMemo(() => {
    if (!experiment) return null;
    // Resolve the unseal passphrase per blinding mode:
    //   - open ('none')      : no passphrase needed.
    //   - self-blind         : derived from the seed persisted at seal time, so
    //                          the same key input is used to seal and unseal.
    //   - friend-blind       : the friend's passphrase, typed in below.
    //                          A keyholder key ("K7QX-M2PA-...") may be typed
    //                          without dashes, so its normalized form is tried
    //                          first, then the text exactly as typed.
    const candidates: (string | undefined)[] = [];
    if (experiment.blindingMode === 'self_blind') {
      candidates.push(experiment.seed ? selfBlindPassphrase(experiment.seed) : undefined);
    } else if (experiment.blindingMode === 'sealed') {
      const typed = friendPassphrase.trim();
      if (typed.length > 0) candidates.push(normalizeKey(typed), friendPassphrase);
    }
    if (candidates.length === 0) candidates.push(undefined);
    const nights = healthNights.listBetween(
      getDatabase(),
      addDays(experiment.startDate, 1),
      addDays(experiment.startDate, experiment.lengthDays),
    );
    for (const passphrase of candidates) {
      try {
        return computeExperimentVerdict(getDatabase(), {
          experiment,
          schedule,
          sessions,
          unsealPassphrase: passphrase,
          // Nights from Apple Health / Health Connect, matched to the dose the
          // day before. Empty when Health isn't connected.
          healthNights: nights,
        });
      } catch {
        // Wrong passphrase form; try the next one.
      }
    }
    return null;
  }, [experiment, schedule, sessions, friendPassphrase]);

  // Funnel: the run reached its verdict. Counts only, never the result.
  const unlocked = vm !== null;
  useEffect(() => {
    if (!experiment || !unlocked) return;
    const today = localDay(new Date());
    if (schedule.length === 0 || !schedule.every((d) => d.date < today)) return;
    const daysCheckedIn = new Set(sessions.filter((s) => s.dayIndex >= 0).map((s) => s.dayIndex)).size;
    trackOnce(`completed:${experiment.id}`, 'experiment_completed', {
      length_days: experiment.lengthDays,
      days_checked_in: daysCheckedIn,
    });
  }, [experiment, unlocked, schedule, sessions]);

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
          <Brian size={120} mood="sleepy" />
          <Text variant="title" style={styles.center}>
            Your verdict is sealed
          </Text>
          <Text tone="secondary" style={styles.center}>
            Your verdict appears here once the experiment ends.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const supplementName = supplement?.name ?? 'Your supplement';

  async function onShare() {
    const ok = await shareCard(shareRef, referralCode ? referralMessage(referralCode) : undefined);
    setShareNote(ok ? null : 'Sharing isn\u2019t available on this device.');
    if (ok) track('verdict_shared');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>THE VERDICT</Text>
          <Text variant="largeTitle">{supplementName}</Text>
        </View>

        {!vm.adherenceMet ? (
          <View style={[styles.hero, styles.heroMuted]}>
            <View style={styles.heroTop}>
              <View style={[styles.verdictChip, { backgroundColor: brand.paperDeep }]}>
                <Icon name="calendar" size={14} color={brand.ink} strokeWidth={2.4} />
                <Text style={[styles.chipText, { color: brand.ink }]}>Not enough data</Text>
              </View>
              <Brian size={72} mood="sleepy" tilt={0} />
            </View>
            <Text style={styles.heroTitleDark}>{vm.primary.verdictSentence}</Text>
            <Text tone="secondary">
              Adherence was {Math.round(vm.adherence.rate * 100)}%. A verdict needs at least 80% of
              days both taken and tested, so there isn&apos;t enough clean data yet.
            </Text>
          </View>
        ) : (
          <PrimaryVerdict primary={vm.primary} monthlyCost={vm.monthlyCost} />
        )}

        {vm.revealedMapping && (
          <View style={styles.revealCard}>
            <View style={styles.cupsRow}>
              <Icon name="cups" size={22} color={brand.ink} />
              <Text variant="headline">Unblinded</Text>
            </View>
            <Text tone="secondary">
              {vm.revealedMapping.supplementLabel} was the supplement;{' '}
              {vm.revealedMapping.placeboLabel} was the placebo.
            </Text>
          </View>
        )}

        {vm.primaryNote && (
          <View style={styles.caveatCard}>
            <Icon name="moon" size={18} color={brand.muted} />
            <Text variant="footnote" tone="secondary" style={styles.flex}>
              {vm.primaryNote}
            </Text>
          </View>
        )}

        {vm.unblindedCaveat && (
          <View style={styles.caveatCard}>
            <Icon name="eyeOff" size={18} color={brand.muted} />
            <Text variant="footnote" tone="secondary" style={styles.flex}>
              {vm.unblindedCaveat}
            </Text>
          </View>
        )}

        {vm.adherenceMet && vm.secondary.some((s) => s.analyzed) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other measures</Text>
            <View style={styles.listCard}>
              {vm.secondary
                .filter((s) => s.analyzed)
                .map((s, i) => (
                  <SecondaryRow key={s.metric} metric={s} first={i === 0} />
                ))}
            </View>
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

        <View style={styles.listCard}>
          <LinkRow icon="book" label="See the evidence" onPress={() => router.push('/evidence-card')} />
          <LinkRow
            icon="flask"
            label="Start another experiment"
            first={false}
            onPress={() => {
              // Close out this run so Today and onboarding treat the next one as new.
              if (experiment && experiment.status === 'active') {
                experiments.setStatus(getDatabase(), experiment.id, 'completed');
              }
              router.replace('/goal-picker');
            }}
          />
        </View>

        <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
          {COMPLIANCE_DISCLAIMER}
        </Text>
      </ScrollView>

      {/* Off-screen capture target for the share image. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard
          ref={shareRef}
          supplementName={supplementName}
          primary={vm.primary}
          monthlyCost={vm.monthlyCost}
          blinded={experiment.blindingMode !== 'none'}
          referralCode={referralCode}
        />
      </View>
    </SafeAreaView>
  );
}

const VERDICT_STYLE: Record<
  MetricVerdict['dbVerdict'],
  { label: string; color: string; icon: IconName; mood: BrianMood }
> = {
  works: { label: 'Effect detected', color: brand.mint, icon: 'check', mood: 'proud' },
  no_effect: { label: 'No clear effect', color: brand.lilac, icon: 'eyeOff', mood: 'focused' },
  inconclusive: { label: 'Inconclusive', color: brand.sun, icon: 'clock', mood: 'focused' },
  harmful: { label: 'Negative effect', color: brand.rose, icon: 'close', mood: 'wow' },
};

function PrimaryVerdict({ primary, monthlyCost }: { primary: MetricVerdict; monthlyCost: string | null }) {
  const v = VERDICT_STYLE[primary.dbVerdict] ?? VERDICT_STYLE.inconclusive;
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={[styles.verdictChip, { backgroundColor: v.color }]}>
          <Icon name={v.icon} size={14} color={brand.ink} strokeWidth={2.6} />
          <Text style={styles.chipText}>{v.label}</Text>
        </View>
        <Brian size={72} mood={v.mood} tilt={0} />
      </View>
      <Text style={styles.heroTitle}>{primary.verdictSentence}</Text>
      {primary.effectSentence && <Text style={styles.heroEffect}>{primary.effectSentence}</Text>}
      {monthlyCost && (
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Cost</Text>
          <Text style={styles.costValue}>{monthlyCost}</Text>
        </View>
      )}
    </View>
  );
}

function SecondaryRow({ metric, first }: { metric: MetricVerdict; first: boolean }) {
  return (
    <View style={[styles.row, !first && styles.rowDivider]}>
      <Text variant="headline" style={styles.secondaryLabel}>
        {metric.label}
      </Text>
      <Text variant="subhead" tone="secondary">
        {metric.effectSentence ?? metric.verdictSentence}
      </Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  first = true,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  first?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, !first && styles.rowDivider, pressed && styles.pressed]}
    >
      <View style={styles.linkIcon}>
        <Icon name={icon} size={18} color={brand.ink} />
      </View>
      <Text variant="headline" style={styles.flex}>
        {label}
      </Text>
      <Icon name="chevronRight" size={18} color={brand.faint} />
    </Pressable>
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
        <View style={styles.lockBadge}>
          <Icon name="lock" size={26} color={brand.white} />
        </View>
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
            placeholderTextColor={brand.faint}
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
  safe: { flex: 1, backgroundColor: brand.paper },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  center: { textAlign: 'center' },
  header: { gap: spacing.xs },
  eyebrow: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 1.2, color: brand.tang },
  hero: {
    backgroundColor: brand.ink,
    borderRadius: 28,
    padding: spacing.xl,
    gap: spacing.md,
  },
  heroMuted: {
    backgroundColor: brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  verdictChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontFamily: fonts.semibold, color: brand.ink },
  heroTitle: { fontSize: 28, lineHeight: 34, fontFamily: fonts.display, letterSpacing: -0.6, color: brand.white },
  heroTitleDark: { fontSize: 26, lineHeight: 32, fontFamily: fonts.display, letterSpacing: -0.5, color: brand.ink },
  heroEffect: { fontSize: 17, lineHeight: 24, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.75)' },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  costLabel: { fontSize: 14, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.6)' },
  costValue: { fontSize: 14, fontFamily: fonts.semibold, color: brand.white },
  revealCard: {
    backgroundColor: brand.lilacSoft,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cupsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  caveatCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: brand.paperDeep,
    borderRadius: 16,
    padding: spacing.md,
  },
  primaryCard: { gap: spacing.md, borderRadius: 24 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontFamily: fonts.displayBold, color: brand.ink },
  listCard: {
    backgroundColor: brand.white,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  row: { paddingVertical: spacing.md, gap: 2 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.line },
  secondaryLabel: { textTransform: 'capitalize' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: brand.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  shareWrap: { gap: spacing.sm },
  disclaimer: { marginTop: spacing.sm, textAlign: 'center' },
  offscreen: { position: 'absolute', left: -9999, top: 0 },
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 17,
    fontFamily: fonts.regular,
    color: brand.ink,
    backgroundColor: brand.paper,
  },
});
