import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Scaffold, brand, fonts } from '@/ui';
import { Icon, Logo, Brian, type IconName } from '@/brand';
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
    router.push('/quiz');
  }

  return (
    <Scaffold
      testID="welcome-screen"
      footer={
        <View style={styles.footer}>
          <Button
            label="Start my experiment"
            testID="welcome-continue"
            onPress={() => {
              tapLight();
              onContinue();
            }}
            disabled={!canContinue}
          />
          <Pressable
            accessibilityRole="button"
            testID="welcome-reaction-test"
            onPress={() => router.push('/reaction-test')}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Icon name="bolt" size={18} color={brand.ink} />
            <Text style={styles.secondaryText}>Just try the free reaction test</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.hero}>
        <Logo size={24} />
        <View style={styles.mascot}>
          <Brian size={148} mood="happy" />
        </View>
        <Text style={styles.promise}>Does your nootropic actually work?</Text>
        <Text style={styles.subtitle}>
          Run a blinded 3 to 4 week experiment on one supplement and get a real answer, measured
          on your own phone.
        </Text>
      </View>

      <View style={styles.benefits}>
        <BenefitRow
          icon="eyeOff"
          tint={brand.lilacSoft}
          title="Blinded, like a real trial"
          body="You won't know which days are the real thing, so hype can't fake the result."
        />
        <BenefitRow
          icon="flame"
          tint={brand.tangSoft}
          title="90 seconds a day"
          body="A quick reaction and memory check-in. Keep your streak, earn XP, unlock badges."
        />
        <BenefitRow
          icon="trophy"
          tint={brand.sunSoft}
          title="A real verdict in about 4 weeks"
          body="Stats on your own data tell you if it works, does nothing, or backfires."
          last
        />
      </View>

      <View style={styles.notice}>
        <View style={styles.noticeHeader}>
          <Icon name="shield" size={18} color={brand.muted} />
          <Text style={styles.noticeTitle}>Before you start</Text>
        </View>
        <Text style={styles.noticeBody}>
          This app helps you run a personal experiment. It is not medical advice and does not
          diagnose, treat, or prevent any condition.
        </Text>
        <Text style={styles.noticeBody}>
          If you take prescription medication, are pregnant, or have a medical condition, check
          with a doctor or pharmacist first.
        </Text>
      </View>

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
          last
        />
      </View>

      <Pressable
        accessibilityRole="link"
        testID="welcome-privacy"
        onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        style={styles.privacy}
      >
        <Icon name="lock" size={14} color={brand.muted} />
        <Text style={styles.privacyLink}>
          Your data stays on this phone. <Text style={styles.privacyUnderline}>Privacy policy</Text>
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
  last?: boolean;
};

function AcknowledgeRow({ label, checked, onToggle, testID, last }: AcknowledgeRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      testID={testID}
      onPress={onToggle}
      style={({ pressed }) => [styles.ackRow, !last && styles.divider, pressed ? styles.pressed : null]}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? <Icon name="check" size={16} color={brand.white} strokeWidth={3} /> : null}
      </View>
      <Text style={styles.ackLabel}>{label}</Text>
    </Pressable>
  );
}

type BenefitRowProps = { icon: IconName; tint: string; title: string; body: string; last?: boolean };

function BenefitRow({ icon, tint, title, body, last }: BenefitRowProps) {
  return (
    <View style={[styles.benefit, !last && styles.divider]}>
      <View style={[styles.benefitIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={22} color={brand.ink} />
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 4 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  secondaryText: { fontSize: 16, fontFamily: fonts.semibold, color: brand.ink },
  pressed: { opacity: 0.6 },
  hero: { alignItems: 'center', gap: 12, paddingTop: 8 },
  mascot: { marginVertical: 8 },
  promise: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontFamily: fonts.display,
    color: brand.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    fontFamily: fonts.regular,
    color: brand.muted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  benefits: {
    backgroundColor: brand.white,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
    paddingHorizontal: 16,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  benefitIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, gap: 2 },
  benefitTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: brand.ink },
  benefitBody: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.muted },
  notice: {
    backgroundColor: brand.paperDeep,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noticeTitle: { fontSize: 15, fontFamily: fonts.semibold, color: brand.ink },
  noticeBody: { fontSize: 13, lineHeight: 19, fontFamily: fonts.regular, color: brand.muted },
  acks: {
    backgroundColor: brand.white,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
    paddingHorizontal: 16,
  },
  ackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.white,
  },
  boxChecked: { backgroundColor: brand.ink, borderColor: brand.ink },
  ackLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: fonts.medium, color: brand.ink },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  privacyLink: { fontSize: 13, fontFamily: fonts.regular, color: brand.muted },
  privacyUnderline: { fontFamily: fonts.semibold, color: brand.ink, textDecorationLine: 'underline' },
});
