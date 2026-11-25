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
import {
  Button,
  Card,
  Chip,
  Scaffold,
  SectionHeader,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '@/ui';
import { useOnboarding } from './OnboardingContext';

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
      'A friend fills two sets of identical cups — supplement and placebo — labels them A and B, and keeps a sealed note of which is which. You take the cup the app names each day and never see the mapping until the run ends.',
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
            friendPassphrase: state.friendPassphrase,
          }
        : null,
    [state],
  );

  const errors = selections ? validateSelections(selections) : [];
  const passphraseError = errors.find((e) => e.field === 'friendPassphrase');
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
      createExperiment(db, selections, {
        experimentId: newExperimentId(),
        seed: newScheduleSeed(),
      });
      reset();
      router.replace('/');
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : 'Could not create the experiment.';
      Alert.alert('Setup failed', message);
    }
  }, [selections, reset, router]);

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
          label="Confirm & start"
          testID="setup-confirm"
          onPress={() => void onConfirm()}
          disabled={!canConfirm}
          loading={submitting}
        />
      }
    >
      {state.goal && state.supplement ? (
        <Card>
          <Text style={styles.summary}>
            {goalLabel(state.goal)} · {state.supplement.name} ·{' '}
            {state.supplement.type === 'acute' ? 'acute' : 'cumulative'} design
          </Text>
        </Card>
      ) : null}

      <View>
        <SectionHeader
          title="How long?"
          caption={`A longer run gives a clearer answer. It starts with a ${BASELINE_DAYS}-day baseline: just the daily test, no supplement, so practice effects settle first.`}
        />
        <View style={styles.chipRow} testID="length-slider">
          {LENGTH_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              testID={`length-${option.value}`}
              label={option.label}
              selected={state.lengthDays === option.value}
              onPress={() => update({ lengthDays: option.value })}
            />
          ))}
        </View>
      </View>

      <View>
        <SectionHeader
          title="Blinding"
          caption="Blinding keeps your expectations out of the result."
        />
        <View style={styles.chipRow}>
          {BLINDING_OPTIONS.map((option) => (
            <Chip
              key={option.mode}
              testID={`blinding-${option.mode}`}
              label={option.label}
              selected={state.blindingMode === option.mode}
              onPress={() => update({ blindingMode: option.mode })}
            />
          ))}
        </View>
        <Card style={styles.instructionsCard}>
          <Text style={styles.instructions}>{selectedBlinding.instructions}</Text>
        </Card>
        {state.blindingMode === 'sealed' ? (
          <View style={styles.passphraseBlock}>
            <Text style={styles.fieldLabel}>Friend’s sealing passphrase</Text>
            <TextInput
              testID="friend-passphrase"
              value={state.friendPassphrase}
              onChangeText={(text) => update({ friendPassphrase: text })}
              placeholder="Ask your friend to type a secret phrase"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            {passphraseError ? (
              <Text style={styles.errorText}>{passphraseError.message}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View>
        <SectionHeader
          title="Daily test time"
          caption="Test at the same time each day for a fair comparison."
        />
        <View style={styles.chipRow} testID="test-window-slider">
          {TEST_WINDOWS.map((w) => (
            <Chip
              key={w.id}
              testID={`test-window-${w.id}`}
              label={w.label}
              selected={state.testWindow === w.id}
              onPress={() => update({ testWindow: w.id })}
            />
          ))}
        </View>
      </View>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  instructionsCard: {
    backgroundColor: colors.surface,
  },
  instructions: {
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  passphraseBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
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
  errorText: {
    fontSize: fontSize.caption,
    color: colors.caution,
  },
});
