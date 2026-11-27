import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Button, Scaffold, brand, fonts } from '@/ui';
import { Icon, Logo, Brian } from '@/brand';
import { tapLight } from '@/components/game';
import { PRIVACY_POLICY_URL } from '@/config/links';
import { useOnboarding } from './OnboardingContext';
import { setAnalyticsProgressConsent, track } from '@/features/analytics';
import { getDatabase } from '@/db';
import { checkBirthYear } from '@/features/age/ageGate';

/**
 * Screen 1 — Welcome + disclaimer.
 *
 * Two pages: the hero (what Placebo is, from the Figma "01 Onboarding"
 * mockup), then the disclaimer gate below.
 *
 * Gate before anything else: the user must acknowledge this is not medical
 * advice and enter a birth year that makes them 18+. The continue action stays disabled
 * until the box is checked and the year passes, and the disclaimer acknowledgment is recorded in onboarding
 * state so later screens know the gate was passed.
 *
 * A third, optional box asks to share anonymous progress counts (run days,
 * check-ins). It starts unchecked: that's an opt-in, which the FTC Health
 * Breach Notification Rule and Washington's My Health My Data Act expect
 * before a health app shares activity with an analytics service.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const { update } = useOnboarding();
  const [notMedical, setNotMedical] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [shareProgress, setShareProgress] = useState(false);
  const [page, setPage] = useState<'hero' | 'gate'>('hero');

  const ageCheck = checkBirthYear(birthYear);
  const adult = ageCheck === 'ok';
  const canContinue = notMedical && adult;

  function onContinue() {
    update({ acknowledgedDisclaimer: true });
    try {
      setAnalyticsProgressConsent(getDatabase(), shareProgress);
    } catch {
      // No database: nothing is sent anyway.
    }
    track('onboarding_started');
    router.push('/quiz');
  }

  if (page === 'hero') {
    return (
      <Scaffold
        testID="welcome-screen"
        contentStyle={styles.heroContent}
        footer={
          <View style={styles.footer}>
            <Pager page={0} />
            <Button
              label="Start my experiment"
              testID="welcome-start"
              onPress={() => {
                tapLight();
                setPage('gate');
              }}
            />
            <Pressable
              accessibilityRole="button"
              testID="welcome-reaction-test"
              onPress={() => router.push('/reaction-test')}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Just curious? Try the free reaction test</Text>
            </Pressable>
          </View>
        }
      >
        <Logo size={20} />
        <HeroArt />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Does your stack actually work?</Text>
          <Text style={styles.heroBody}>
            A randomized 28-day test on you. The app picks ON and OFF days, you do two minutes of
            brain tests, and your own data gives the answer.
          </Text>
        </View>
      </Scaffold>
    );
  }

  return (
    <Scaffold
      testID="welcome-gate"
      footer={
        <View style={styles.footer}>
          {!canContinue ? (
            <View style={styles.gateHint} accessibilityLiveRegion="polite">
              <Icon name="check" size={14} color={brand.muted} strokeWidth={2.6} />
              <Text style={styles.gateHintText}>
                {ageCheck === 'under'
                  ? 'Placebo is for adults 18 and older'
                  : 'Tick the box and enter your birth year to start'}
              </Text>
            </View>
          ) : null}
          <Button
            label="Start my experiment"
            testID="welcome-continue"
            onPress={() => {
              tapLight();
              onContinue();
            }}
            disabled={!canContinue}
          />
        </View>
      }
    >
      <View style={styles.gateHeader}>
        <Pager page={1} />
        <Text style={styles.gateTitle}>Two quick things first</Text>
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
        <View style={styles.ageRow}>
          <Text style={styles.ackLabel}>Year you were born (18+ only)</Text>
          <TextInput
            testID="birth-year"
            value={birthYear}
            onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="YYYY"
            placeholderTextColor={brand.muted}
            accessibilityLabel="Birth year"
            style={styles.ageInput}
          />
        </View>
        {ageCheck === 'under' ? (
          <Text testID="age-blocked" style={styles.ageBlocked} accessibilityLiveRegion="polite">
            Sorry, Placebo is only for people 18 and older, so we can't start an experiment for you.
          </Text>
        ) : ageCheck === 'invalid' ? (
          <Text style={styles.ageBlocked} accessibilityLiveRegion="polite">
            Enter a valid four-digit year.
          </Text>
        ) : null}
      </View>

      <View style={styles.acks}>
        <AcknowledgeRow
          testID="ack-share-progress"
          checked={shareProgress}
          onToggle={() => {
            tapLight();
            setShareProgress((v) => !v);
          }}
          label="Optional: share anonymous progress counts (which day you're on, check-ins done) to help improve Placebo. Never your scores, health data or supplement. Change it anytime."
          small
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
  /** Smaller label, for the optional consent row. */
  small?: boolean;
};

function AcknowledgeRow({ label, checked, onToggle, testID, last, small }: AcknowledgeRowProps) {
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
      <Text style={[styles.ackLabel, small && styles.ackLabelSmall]}>{label}</Text>
    </Pressable>
  );
}

/** Page dots: a wide ink dash for the current page. */
function Pager({ page }: { page: number }) {
  return (
    <View style={styles.pager} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1].map((i) => (
        <View key={i} style={[styles.pagerDot, i === page && styles.pagerDotOn]} />
      ))}
    </View>
  );
}

/** A tilted day card: tang "ON" or lilac "OFF". */
function DayCard({ label, fill, rotate }: { label: string; fill: string; rotate: string }) {
  return (
    <View style={{ transform: [{ rotate }] }}>
      <Svg width={116} height={150} viewBox="0 0 116 150">
        <Rect x={3} y={3} width={110} height={144} rx={24} fill={fill} stroke={brand.ink} strokeWidth={4} />
        <Path d="M22 26 v40" stroke={brand.white} strokeWidth={6} strokeLinecap="round" opacity={0.45} />
        <SvgText
          x={58}
          y={92}
          textAnchor="middle"
          fontSize={label.length > 2 ? 34 : 40}
          fontFamily={fonts.display}
          fill={brand.ink}
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  );
}

/** Brian over today's two possible calls, from the Figma hero card. */
function HeroArt() {
  return (
    <View style={styles.art} accessibilityRole="image" accessibilityLabel="Brian the brain over an ON card and an OFF card">
      <View style={styles.cards}>
        <DayCard label="ON" fill={brand.tang} rotate="-5deg" />
        <DayCard label="OFF" fill={brand.lilac} rotate="5deg" />
      </View>
      <View style={styles.artBrian}>
        <Brian size={132} mood="wink" />
      </View>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>Is it doing anything?</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gateHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 6 },
  gateHintText: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium, color: brand.muted },
  footer: { gap: 4 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  secondaryText: { fontSize: 15, fontFamily: fonts.semibold, color: brand.ink },
  pressed: { opacity: 0.6 },
  heroContent: { paddingTop: 8, gap: 20 },
  art: {
    height: 300,
    borderRadius: 32,
    backgroundColor: brand.paperDeep,
    overflow: 'hidden',
  },
  cards: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  artBrian: { position: 'absolute', top: 36, left: 0, right: 0, alignItems: 'center' },
  bubble: {
    position: 'absolute',
    top: 28,
    right: 12,
    backgroundColor: brand.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    transform: [{ rotate: '-4deg' }],
  },
  bubbleText: { fontSize: 13, fontFamily: fonts.semibold, color: brand.ink },
  heroCopy: { gap: 14, paddingTop: 8 },
  heroTitle: {
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1.4,
    fontFamily: fonts.display,
    color: brand.ink,
  },
  heroBody: { fontSize: 17, lineHeight: 25, letterSpacing: -0.2, fontFamily: fonts.regular, color: brand.muted },
  pager: { flexDirection: 'row', gap: 6, paddingBottom: 14 },
  pagerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.line },
  pagerDotOn: { width: 22, backgroundColor: brand.ink },
  gateHeader: { gap: 14, paddingTop: 8 },
  gateTitle: { fontSize: 32, lineHeight: 36, letterSpacing: -1, fontFamily: fonts.display, color: brand.ink },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
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
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  ageInput: {
    width: 92,
    borderWidth: 2,
    borderColor: brand.line,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 17,
    fontFamily: fonts.semibold,
    color: brand.ink,
    textAlign: 'center',
  },
  ageBlocked: { fontSize: 14, lineHeight: 19, fontFamily: fonts.medium, color: brand.ink, paddingBottom: 12 },
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
  ackLabelSmall: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.muted },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  privacyLink: { fontSize: 13, fontFamily: fonts.regular, color: brand.muted },
  privacyUnderline: { fontFamily: fonts.semibold, color: brand.ink, textDecorationLine: 'underline' },
});
