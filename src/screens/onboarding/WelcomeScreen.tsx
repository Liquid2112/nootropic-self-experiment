import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  Scaffold,
  colors,
  fontSize,
  gameColors,
  radius,
  spacing,
} from '@/ui';
import { tapLight } from '@/components/game';
import { PRIVACY_POLICY_URL } from '@/config/links';
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
        <View style={styles.footer}>
          <Button
            label="Let's go"
            testID="welcome-continue"
            onPress={() => {
              tapLight();
              onContinue();
            }}
            disabled={!canContinue}
          />
          <Button
            label="⚡ Just try the free reaction test"
            variant="subtle"
            testID="welcome-reaction-test"
            onPress={() => router.push('/reaction-test')}
          />
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroBubble}>
          <Text style={styles.heroEmoji}>🧠</Text>
        </View>
        <Text style={styles.heroEyebrow}>YOUR BRAIN, YOUR DATA</Text>
        <Text style={styles.promise}>Find out if your nootropic actually works for you.</Text>
        <Text style={styles.subtitle}>
          A blinded 3–4 week self-experiment on one supplement, measured on your own device.
        </Text>
      </View>

      <View style={styles.benefits}>
        <BenefitRow
          emoji="🙈"
          tint={colors.cautionSurface}
          title="Blinded, like a real trial"
          body="You won't know which days are the real thing, so hype can't fake the result."
        />
        <BenefitRow
          emoji="🔥"
          tint={gameColors.flameMuted}
          title="90 seconds a day"
          body="A quick reaction and memory check-in. Build streaks, earn XP, unlock badges."
        />
        <BenefitRow
          emoji="🏆"
          tint={gameColors.xpMuted}
          title="A real verdict in ~4 weeks"
          body="Stats on your own data tell you if it works, does nothing, or backfires."
        />
      </View>

      <Card radius="xl" style={styles.card}>
        <Text style={styles.cardTitle}>⚠️ Before you start</Text>
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
          onToggle={() => {
            tapLight();
            setNotMedical((v) => !v);
          }}
          label="I understand this is not medical advice."
        />
        <AcknowledgeRow
          testID="ack-adult"
          checked={adult}
          onToggle={() => {
            tapLight();
            setAdult((v) => !v);
          }}
          label="I am 18 years of age or older."
        />
      </View>

      <Pressable
        accessibilityRole="link"
        testID="welcome-privacy"
        onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
      >
        <Text style={styles.privacyLink}>
          🔒 Your data stays on this phone. Read the privacy policy.
        </Text>
      </Pressable>
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

type BenefitRowProps = { emoji: string; tint: string; title: string; body: string };

function BenefitRow({ emoji, tint, title, body }: BenefitRowProps) {
  return (
    <View style={styles.benefit}>
      <View style={[styles.benefitIcon, { backgroundColor: tint }]}>
        <Text style={styles.benefitEmoji}>{emoji}</Text>
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 8,
  },
  hero: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  heroBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroEmoji: {
    fontSize: 34,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  promise: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: fontSize.callout,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
  },
  benefits: {
    gap: spacing.md,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitEmoji: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  benefitBody: {
    fontSize: fontSize.footnote,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  safety: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: gameColors.flameMuted,
  },
  safetyText: {
    fontSize: fontSize.footnote,
    color: '#B5410F',
    lineHeight: 21,
  },
  acks: {
    gap: spacing.sm,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  ackPressed: {
    opacity: 0.6,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  boxChecked: {
    backgroundColor: gameColors.mint,
    borderColor: gameColors.mint,
  },
  check: {
    color: colors.onAccent,
    fontSize: fontSize.callout,
    fontWeight: '800',
  },
  privacyLink: {
    fontSize: fontSize.footnote,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
  ackLabel: {
    flex: 1,
    fontSize: fontSize.callout,
    fontWeight: '600',
    color: colors.text,
  },
});
