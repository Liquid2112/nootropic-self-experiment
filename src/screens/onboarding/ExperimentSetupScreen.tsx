import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { loadPurchasesAdapter, setupGate } from '@/features/paywall';
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
import { TestPicker } from './TestPicker';
import { DEFAULT_BATTERY, validateBattery } from '@/features/battery';
import { Icon, type IconName } from '@/brand';
import { tapLight } from '@/components/game';
import { useOnboarding } from './OnboardingContext';
import { track } from '@/features/analytics';

/**
 * Screen 3 — Experiment setup.
 *
 * Length (21 / 28 days), the daily test battery, and a daily test-time window.
 * Runs are solo and open-label: no capsules, no keyholder. The app randomizes
 * the ON/OFF days and reveals only today's call each morning. On confirm it
 * validates and calls the experiment-design engine via createExperiment, which
 * stores the experiment row and schedule_day rows.
 */

/**
 * How a solo run stays fair without capsules or a friend. Shown as a read-only
 * explainer: there is nothing to choose, the app does all of it.
 */
const FAIRNESS_POINTS: { icon: IconName; text: string }[] = [
  { icon: 'calendar', text: 'The app picks your ON and OFF days at random and reveals each one that morning, so you can\u2019t save it for good days.' },
  { icon: 'brain', text: 'Your brain tests are the main score, not how you feel. They\u2019re much harder to fool.' },
  { icon: 'sparkle', text: 'A one-tap belief check each day shows how much expectation moved your scores.' },
  { icon: 'eyeOff', text: 'Your results stay hidden until verdict day, so you can\u2019t stop the moment it looks good.' },
];

const LENGTH_OPTIONS: { value: RunLength; label: string }[] = [
  { value: 21, label: '21 days' },
  { value: 28, label: '28 days' },
];

export function ExperimentSetupScreen() {
  const router = useRouter();
  const { state, update, reset } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);

  // The tests the run will use: the user's picks, or the goal's defaults.
  const battery = useMemo(
    () => state.battery ?? (state.goal ? DEFAULT_BATTERY[state.goal] : []),
    [state.battery, state.goal],
  );
  const batteryError = state.goal ? validateBattery(state.goal, battery) : null;

  // Build the selections object the engine validates/consumes. Guarded below;
  // goal and supplement are set on the previous screen before reaching here.
  const selections = useMemo<OnboardingSelections | null>(
    () =>
      state.goal && state.supplement
        ? {
            goal: state.goal,
            supplement: state.supplement,
            lengthDays: state.lengthDays,
            // Solo, open-label: the app randomizes ON/OFF and reveals each day.
            blindingMode: 'none',
            testWindow: state.testWindow,
            battery,
            // The run starts after the 3-day baseline: today through the next
            // two days are baseline (test only, no supplement), day 0 is day 4.
            startDate: addDays(state.startDate, BASELINE_DAYS),
          }
        : null,
    [state, battery],
  );

  const errors = selections ? validateSelections(selections) : [];
  const canConfirm = selections !== null && errors.length === 0 && batteryError === null && !submitting;

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
      // Test count and whether the defaults were changed; never which tests.
      const started = {
        blinding_mode: selections.blindingMode,
        length_days: selections.lengthDays,
        tests_count: battery.length,
        tests_customized: state.battery !== null,
      };
      createExperiment(db, selections, deps);
      track('experiment_started', started);
      reset();
      router.replace('/');
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : 'Could not create the experiment.';
      Alert.alert('Setup failed', message);
    }
  }, [selections, reset, router, state.battery, battery.length]);

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

      <Section icon="target" title="How it stays fair" caption="No pills to make, nothing to buy, no friend needed.">
        <View style={styles.instructionsCard}>
          {FAIRNESS_POINTS.map((p) => (
            <View key={p.icon} style={styles.fairRow}>
              <Icon name={p.icon} size={16} color={brand.lilacDeep} />
              <Text style={[styles.instructions, styles.fairText]}>{p.text}</Text>
            </View>
          ))}
        </View>
      </Section>

      {state.goal ? (
        <Section
          icon="brain"
          title="Your daily tests"
          caption="Your goal's test is locked in. Add or swap the rest. You keep the same set for the whole run so every day compares fairly."
        >
          <TestPicker goal={state.goal} tests={battery} onChange={(tests) => update({ battery: tests })} />
        </Section>
      ) : null}

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
  instructionsCard: { backgroundColor: brand.paper, borderRadius: 14, padding: 14, gap: 6 },
  instructions: { fontSize: 13, lineHeight: 20, fontFamily: fonts.regular, color: brand.ink },
  fairRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  fairText: { flex: 1 },
  errorText: { fontSize: 12, fontFamily: fonts.medium, color: brand.roseInk },
});
