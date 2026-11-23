import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  Scaffold,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '@/ui';
import { useOnboarding } from './OnboardingContext';

/**
 * Screen 1 — Welcome + disclaimer.
 *
 * Gate before anything else: the user must acknowledge this is not medical
 * advice and confirm they are 18+. The continue action stays disabled until
 * both are checked, and the disclaimer acknowledgment is recorded in onboarding
 * state so later screens know the gate was passed.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const { update } = useOnboarding();
  const [notMedical, setNotMedical] = useState(false);
  const [adult, setAdult] = useState(false);

  const canContinue = notMedical && adult;

  function onContinue() {
    update({ acknowledgedDisclaimer: true });
    router.push('/goal-picker');
  }

  return (
    <Scaffold
      testID="welcome-screen"
      footer={
        <Button
          label="Continue"
          testID="welcome-continue"
          onPress={onContinue}
          disabled={!canContinue}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.promise}>Find out if your nootropic actually works for you.</Text>
        <Text style={styles.subtitle}>
          A blinded 3–4 week self-experiment on one supplement, measured on your own device.
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Before you start</Text>
        <Text style={styles.body}>
          This app helps you run a personal experiment. It is not medical advice and does not
          diagnose, treat, or prevent any condition.
        </Text>
        <View style={styles.safety}>
          <Text style={styles.safetyText}>
            If you take prescription medication, are pregnant, or have a medical condition, check
            with a doctor or pharmacist first.
          </Text>
        </View>
      </Card>

      <View style={styles.acks}>
        <AcknowledgeRow
          testID="ack-not-medical"
          checked={notMedical}
          onToggle={() => setNotMedical((v) => !v)}
          label="I understand this is not medical advice."
        />
        <AcknowledgeRow
          testID="ack-adult"
          checked={adult}
          onToggle={() => setAdult((v) => !v)}
          label="I am 18 years of age or older."
        />
      </View>
    </Scaffold>
  );
}

type AcknowledgeRowProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testID?: string;
};

function AcknowledgeRow({ label, checked, onToggle, testID }: AcknowledgeRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      testID={testID}
      onPress={onToggle}
      style={({ pressed }) => [styles.ackRow, pressed ? styles.ackPressed : null]}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={styles.ackLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  promise: {
    fontSize: fontSize.largeTitle,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  safety: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cautionSurface,
  },
  safetyText: {
    fontSize: fontSize.footnote,
    color: colors.caution,
    lineHeight: 21,
  },
  acks: {
    gap: spacing.md,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  ackPressed: {
    opacity: 0.6,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  boxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  check: {
    color: colors.onAccent,
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.bold,
  },
  ackLabel: {
    flex: 1,
    fontSize: fontSize.footnote,
    color: colors.text,
  },
});
