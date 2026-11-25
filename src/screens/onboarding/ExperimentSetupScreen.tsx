import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadPurchasesAdapter, setupGate } from '@/features/paywall';
import type { BlindingMode } from '@/db';
import { getDatabase } from '@/db';
import { BASELINE_DAYS, addDays, type RunLength } from '@/engines/experiment';
import {
  TEST_WINDOWS,
  createExperiment,
  goalLabel,
  newExperimentId,
  newScheduleSeed,
  validateSelections,
  type OnboardingSelections,
} from '@/engines/onboarding';
import { Button, Chip, Scaffold, brand, fonts } from '@/ui';
import { Icon, type IconName } from '@/brand';
import { tapLight } from '@/components/game';
import { useOnboarding } from './OnboardingContext';
import { startKeyholderRun } from '@/features/referral';
import { track } from '@/features/analytics';

/**
 * Screen 3 — Experiment setup.
 *
 * Length (21 / 28 days), blinding mode (open / friend-blinded / self-blinded),
 * and a daily test-time window. On confirm it validates and calls the
 * experiment-design engine via createExperiment, which stores the experiment
 * row and schedule_day rows. The generated arm assignment is never surfaced
 * here: a blinded run stores only its sealed key.
 */

type BlindingOption = {
  mode: BlindingMode;
  label: string;
  instructions: string;
};

const BLINDING_OPTIONS: readonly [BlindingOption, ...BlindingOption[]] = [
  {
    mode: 'none',
    label: 'Open',
    instructions:
      'You know which days are ON and OFF. Simplest to run, but your expectations can color the result, so mark the verdict as unblinded.',
  },
  {
    mode: 'sealed',
    label: 'Friend-blinded',
    instructions:
      'The gold standard. A friend becomes your keyholder: Placebo sends them a link that says which cup gets the real supplement. They fill cups A and B, you take the cup the app names each day, and on reveal day they send the key that unlocks your verdict. You both get a free month.',
  },
  {
    mode: 'self_blind',
    label: 'Self-blinded',
    instructions:
      'You prepare numbered envelopes from a one-time shuffled list, sealing each day’s dose inside without looking. The app shows only the envelope number to open, so you stay blind to ON vs OFF.',
  },
];

const LENGTH_OPTIONS: { value: RunLength; label: string }[] = [
  { value: 21, label: '21 days' },
  { value: 28, label: '28 days' },
];

export function ExperimentSetupScreen() {
  const router = useRouter();
  const { state, update, reset } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);

  const selectedBlinding = useMemo(
    () => BLINDING_OPTIONS.find((o) => o.mode === state.blindingMode) ?? BLINDING_OPTIONS[0],
    [state.blindingMode],
  );

  // Build the selections object the engine validates/consumes. Guarded below;
  // goal and supplement are set on the previous screen before reaching here.
  const selections = useMemo<OnboardingSelections | null>(
    () =>
      state.goal && state.supplement
        ? {
            goal: state.goal,
            supplement: state.supplement,
            lengthDays: state.lengthDays,
            blindingMode: state.blindingMode,
            testWindow: state.testWindow,
            // The run starts after the 3-day baseline: today through the next
            // two days are baseline (test only, no supplement), day 0 is day 4.
            startDate: addDays(state.startDate, BASELINE_DAYS),
            // Friend-blinded runs are sealed with a key Placebo generates when
            // the run starts (see startKeyholderRun), so nothing is typed here.
            friendPassphrase: state.blindingMode === 'sealed' ? 'generated-on-start' : state.friendPassphrase,
          }
        : null,
    [state],
  );

  const errors = selections ? validateSelections(selections) : [];
  const canConfirm = selections !== null && errors.length === 0 && !submitting;

  // Set when the paywall was shown for this confirm, so returning from a
  // successful purchase finishes starting the experiment.
  const awaitingPurchase = useRef(false);

  const createAndStart = useCallback(() => {
    if (!selections) {
      return;
    }
    try {
      const db = getDatabase();
      const deps = { experimentId: newExperimentId(), seed: newScheduleSeed() };
      // Funnel: onboarding finished. Only the run's shape, never the supplement or goal.
      const started = { blinding_mode: selections.blindingMode, length_days: selections.lengthDays };
      if (selections.blindingMode === 'sealed') {
        // Seal with a fresh key and hand it to a keyholder next.
        startKeyholderRun(db, selections, deps, state.keyholderFromName);
        track('experiment_started', started);
        reset();
        router.replace('/keyholder-invite');
        return;
      }
      createExperiment(db, selections, deps);
      track('experiment_started', started);
      reset();
      router.replace('/');
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : 'Could not create the experiment.';
      Alert.alert('Setup failed', message);
    }
  }, [selections, reset, router, state.keyholderFromName]);

  async function onConfirm() {
    if (!selections) {
      return;
    }
    setSubmitting(true);
    // Running an experiment needs Pro; the store product carries the free trial.
    const purchases = await loadPurchasesAdapter(Platform.OS);
    const isPro = await purchases.isPro();
    const gate = setupGate({ isPro, available: purchases.available, isDev: __DEV__ });
    if (gate === 'paywall') {
      awaitingPurchase.current = true;
      setSubmitting(false);
      router.push('/paywall');
      return;
    }
    createAndStart();
  }

  // Back from the paywall: start the experiment only if Pro is now active.
  useFocusEffect(
    useCallback(() => {
      if (!awaitingPurchase.current) {
        return;
      }
      awaitingPurchase.current = false;
      let cancelled = false;
      void (async () => {
        const purchases = await loadPurchasesAdapter(Platform.OS);
        if (!cancelled && (await purchases.isPro())) {
          setSubmitting(true);
          createAndStart();
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [createAndStart]),
  );

  return (
    <Scaffold
      testID="experiment-setup-screen"
      footer={
        <Button
          label="Start my experiment"
          testID="setup-confirm"
          onPress={() => void onConfirm()}
          disabled={!canConfirm}
          loading={submitting}
        />
      }
    >
      <View style={styles.stepHeader}>
        <Text style={styles.step}>Step 2 of 2</Text>
        <Text style={styles.title}>Design your experiment</Text>
      </View>

      {state.goal && state.supplement ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Icon name="flask" size={22} color={brand.ink} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>{state.supplement.name}</Text>
            <Text style={styles.summaryBody}>
              {goalLabel(state.goal)} goal · {state.supplement.type === 'acute' ? 'acute' : 'cumulative'} design
            </Text>
          </View>
        </View>
      ) : null}

      <Section
        icon="clock"
        title="How long?"
        caption={`A longer run gives a clearer answer. It starts with a ${BASELINE_DAYS}-day baseline: just the daily test, no supplement, so practice effects settle first.`}
      >
        <View style={styles.chipRow} testID="length-slider">
          {LENGTH_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              testID={`length-${option.value}`}
              label={option.label}
              selected={state.lengthDays === option.value}
              onPress={() => {
                tapLight();
                update({ lengthDays: option.value });
              }}
            />
          ))}
        </View>
      </Section>

      <Section icon="eyeOff" title="Blinding" caption="Blinding keeps your expectations out of the result.">
        <View style={styles.chipRow}>
          {BLINDING_OPTIONS.map((option) => (
            <Chip
              key={option.mode}
              testID={`blinding-${option.mode}`}
              label={option.label}
              selected={state.blindingMode === option.mode}
              onPress={() => {
                tapLight();
                update({ blindingMode: option.mode });
              }}
            />
          ))}
        </View>
        <View style={styles.instructionsCard}>
          <Text style={styles.instructions}>{selectedBlinding.instructions}</Text>
        </View>
        {state.blindingMode === 'sealed' ? (
          <View style={styles.passphraseBlock}>
            <Text style={styles.fieldLabel}>Your first name</Text>
            <TextInput
              testID="keyholder-from-name"
              value={state.keyholderFromName}
              onChangeText={(text) => update({ keyholderFromName: text })}
              placeholder="So your keyholder knows it’s you"
              placeholderTextColor={brand.faint}
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
            />
          </View>
        ) : null}
      </Section>

      <Section icon="calendar" title="Daily test time" caption="Test at the same time each day for a fair comparison.">
        <View style={styles.chipRow} testID="test-window-slider">
          {TEST_WINDOWS.map((w) => (
            <Chip
              key={w.id}
              testID={`test-window-${w.id}`}
              label={w.label}
              selected={state.testWindow === w.id}
              onPress={() => {
                tapLight();
                update({ testWindow: w.id });
              }}
            />
          ))}
        </View>
      </Section>
    </Scaffold>
  );
}

function Section({
  icon,
  title,
  caption,
  children,
}: {
  icon: IconName;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={20} color={brand.ink} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionCaption}>{caption}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stepHeader: { gap: 6 },
  step: { fontSize: 13, fontFamily: fonts.semibold, color: brand.tangInk },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.7, fontFamily: fonts.display, color: brand.ink },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: brand.ink,
    borderRadius: 20,
    padding: 16,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: brand.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: brand.white },
  summaryBody: { fontSize: 13, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.7)' },
  block: {
    backgroundColor: brand.white,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: brand.ink },
  sectionCaption: { fontSize: 13, lineHeight: 19, fontFamily: fonts.regular, color: brand.muted, marginTop: -4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  instructionsCard: { backgroundColor: brand.paper, borderRadius: 14, padding: 14 },
  instructions: { fontSize: 13, lineHeight: 20, fontFamily: fonts.regular, color: brand.ink },
  passphraseBlock: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: fonts.semibold, color: brand.ink },
  input: {
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: brand.ink,
    backgroundColor: brand.white,
  },
  errorText: { fontSize: 12, fontFamily: fonts.medium, color: brand.roseInk },
});
