import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { appState, getDatabase, quickTests } from '@/db';
import { generatePvtSchedule, PVT_DEFAULT_TRIALS } from '@/engines/cognitive-test';
import { scoreQuickTest, type QuickTestScore } from '@/features/quick-test';
import {
  QUIZ_INTERSTITIALS,
  QUIZ_QUESTIONS,
  baselinePercentile,
  planMilestones,
  quizGoal,
  quizTestWindow,
  shortDate,
  stakesLine,
  type QuizAnswers,
  type QuizQuestion,
} from '@/features/quiz';
import { PvtTask } from '@/screens/PvtTask';
import { useOnboarding } from '@/screens/onboarding/OnboardingContext';
import { Icon, Brian, type IconName } from '@/brand';
import { celebrate, tapLight } from '@/components/game';
import { Button, brand, fonts } from '@/ui';

/** The run length the plan screen previews; setup can still change it. */
const PLAN_LENGTH_DAYS = 28;

type Step =
  | { kind: 'question'; index: number }
  | { kind: 'fact'; afterIndex: number }
  | { kind: 'baselineIntro' }
  | { kind: 'baselineTest' }
  | { kind: 'baselineResult' }
  | { kind: 'building' }
  | { kind: 'plan' };

const OPTION_ICONS: Record<string, IconName> = {
  focus: 'target',
  memory: 'brain',
  calm: 'smile',
  sleep: 'moon',
};

/**
 * Quiz onboarding. Sells the payoff of finishing a run before it asks for
 * anything: a few quick questions about the user's stack and spend, two short
 * facts about placebo, a Brain Baseline (the free reaction test, as an
 * approximate percentile), a "building your experiment" moment, and a dated
 * plan to the verdict reveal. It ends by pre-filling the goal and test time
 * and handing off to the normal setup.
 */
export default function QuizScreen() {
  const router = useRouter();
  const { update } = useOnboarding();
  const [step, setStep] = useState<Step>({ kind: 'question', index: 0 });
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [score, setScore] = useState<QuickTestScore | null>(null);
  const [schedule] = useState(() =>
    generatePvtSchedule({ trials: PVT_DEFAULT_TRIALS, seed: Date.now() & 0xffff }),
  );

  // Progress across the quiz part (questions + facts) for the top bar.
  const totalQuestions = QUIZ_QUESTIONS.length;
  const progress =
    step.kind === 'question'
      ? step.index / totalQuestions
      : step.kind === 'fact'
        ? (step.afterIndex + 1) / totalQuestions
        : 1;

  const next = useCallback((from: Step) => {
    if (from.kind === 'question') {
      const q = QUIZ_QUESTIONS[from.index];
      if (q && QUIZ_INTERSTITIALS[q.id]) {
        setStep({ kind: 'fact', afterIndex: from.index });
        return;
      }
      const i = from.index + 1;
      setStep(i < QUIZ_QUESTIONS.length ? { kind: 'question', index: i } : { kind: 'baselineIntro' });
      return;
    }
    if (from.kind === 'fact') {
      const i = from.afterIndex + 1;
      setStep(i < QUIZ_QUESTIONS.length ? { kind: 'question', index: i } : { kind: 'baselineIntro' });
    }
  }, []);

  const back = useCallback(() => {
    if (step.kind === 'question' && step.index > 0) {
      const prev = QUIZ_QUESTIONS[step.index - 1];
      setStep(prev && QUIZ_INTERSTITIALS[prev.id] ? { kind: 'fact', afterIndex: step.index - 1 } : { kind: 'question', index: step.index - 1 });
    } else if (step.kind === 'fact') {
      setStep({ kind: 'question', index: step.afterIndex });
    } else if (step.kind === 'question') {
      router.back();
    }
  }, [step, router]);

  const choose = useCallback(
    (q: QuizQuestion, optionId: string) => {
      tapLight();
      setAnswers((a) => ({ ...a, [q.id]: optionId }));
      // A beat so the selection registers visually before moving on.
      setTimeout(() => next({ kind: 'question', index: QUIZ_QUESTIONS.indexOf(q) }), 260);
    },
    [next],
  );

  const onBaselineDone = useCallback(
    (rts: number[]) => {
      const result = scoreQuickTest(rts, schedule.length);
      setScore(result);
      if (result.ok) {
        quickTests.insert(getDatabase(), {
          id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          takenAt: new Date().toISOString(),
          medianMs: result.medianMs,
          lapses: result.lapses,
          trials: result.trials,
        });
        celebrate();
      }
      setStep({ kind: 'baselineResult' });
    },
    [schedule.length],
  );

  const finish = useCallback(() => {
    try {
      appState.set(getDatabase(), 'quiz_answers_v1', JSON.stringify(answers));
    } catch {
      // Personalisation only; never block onboarding on it.
    }
    const goal = quizGoal(answers);
    const testWindow = quizTestWindow(answers);
    update({ ...(goal ? { goal } : {}), ...(testWindow ? { testWindow } : {}), lengthDays: PLAN_LENGTH_DAYS });
    router.push('/goal-picker');
  }, [answers, update, router]);

  if (step.kind === 'baselineTest') {
    return <PvtTask schedule={schedule} onDone={onBaselineDone} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      {(step.kind === 'question' || step.kind === 'fact') && (
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={12} style={styles.backBtn}>
            <Icon name="chevronRight" size={22} color={brand.ink} />
          </Pressable>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(4, progress * 100)}%` }]} />
          </View>
        </View>
      )}

      {step.kind === 'question' && (
        <QuestionView
          key={step.index}
          question={QUIZ_QUESTIONS[step.index]!}
          selected={answers[QUIZ_QUESTIONS[step.index]!.id]}
          onChoose={choose}
        />
      )}

      {step.kind === 'fact' && (
        <FactView
          key={`fact-${step.afterIndex}`}
          fact={QUIZ_INTERSTITIALS[QUIZ_QUESTIONS[step.afterIndex]!.id]!}
          onNext={() => next(step)}
        />
      )}

      {step.kind === 'baselineIntro' && (
        <Centered
          mascot="focused"
          eyebrow="Brain Baseline"
          title="Let's see where your brain is today"
          body={`A dot appears ${PVT_DEFAULT_TRIALS} times. Tap it the moment it shows. About 30 seconds, and it becomes the starting line for your experiment.`}
          action="I'm ready"
          onAction={() => setStep({ kind: 'baselineTest' })}
          secondary="Skip for now"
          onSecondary={() => setStep({ kind: 'building' })}
        />
      )}

      {step.kind === 'baselineResult' && (
        <BaselineResult score={score} onNext={() => setStep({ kind: 'building' })} onRetry={() => setStep({ kind: 'baselineTest' })} />
      )}

      {step.kind === 'building' && <Building onDone={() => setStep({ kind: 'plan' })} />}

      {step.kind === 'plan' && <Plan answers={answers} onStart={finish} />}
    </SafeAreaView>
  );
}

// --- pieces ----------------------------------------------------------------------

function useEnter(): Animated.Value {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  return v;
}

function enterStyle(v: Animated.Value) {
  return { opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] };
}

function QuestionView({
  question,
  selected,
  onChoose,
}: {
  question: QuizQuestion;
  selected: string | undefined;
  onChoose: (q: QuizQuestion, optionId: string) => void;
}) {
  const v = useEnter();
  return (
    <Animated.ScrollView style={[styles.flex, enterStyle(v)]} contentContainerStyle={styles.body}>
      <Text style={styles.eyebrow}>{question.eyebrow.toUpperCase()}</Text>
      <Text style={styles.title}>{question.title}</Text>
      {question.subtitle ? <Text style={styles.subtitle}>{question.subtitle}</Text> : null}
      <View style={styles.options}>
        {question.options.map((o) => {
          const on = selected === o.id;
          const icon = question.id === 'goal' ? OPTION_ICONS[o.id] : undefined;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChoose(question, o.id)}
              style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.optionPressed]}
            >
              {icon ? (
                <View style={[styles.optionIcon, on && styles.optionIconOn]}>
                  <Icon name={icon} size={20} color={brand.ink} />
                </View>
              ) : null}
              <View style={styles.flex}>
                <Text style={[styles.optionLabel, on && styles.optionLabelOn]}>{o.label}</Text>
                {o.hint ? <Text style={[styles.optionHint, on && styles.optionHintOn]}>{o.hint}</Text> : null}
              </View>
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <Icon name="check" size={14} color={brand.ink} strokeWidth={3} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </Animated.ScrollView>
  );
}

function FactView({ fact, onNext }: { fact: { title: string; body: string }; onNext: () => void }) {
  const v = useEnter();
  return (
    <View style={styles.flex}>
      <Animated.View style={[styles.centerBody, enterStyle(v)]}>
        <View style={styles.factCard}>
          <View style={styles.factIcon}>
            <Icon name="flask" size={22} color={brand.lilac} />
          </View>
          <Text style={styles.factTitle}>{fact.title}</Text>
          <Text style={styles.factBody}>{fact.body}</Text>
        </View>
      </Animated.View>
      <View style={styles.footer}>
        <Button label="Got it" onPress={onNext} />
      </View>
    </View>
  );
}

function Centered({
  mascot,
  eyebrow,
  title,
  body,
  action,
  onAction,
  secondary,
  onSecondary,
}: {
  mascot: 'focused' | 'happy' | 'wow' | 'proud';
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  const v = useEnter();
  return (
    <View style={styles.flex}>
      <Animated.View style={[styles.centerBody, enterStyle(v)]}>
        <Brian size={140} mood={mascot} />
        <Text style={[styles.eyebrow, styles.centerText]}>{eyebrow.toUpperCase()}</Text>
        <Text style={[styles.title, styles.centerText]}>{title}</Text>
        <Text style={[styles.subtitle, styles.centerText]}>{body}</Text>
      </Animated.View>
      <View style={styles.footer}>
        <Button label={action} onPress={onAction} />
        {secondary && onSecondary ? (
          <Pressable accessibilityRole="button" onPress={onSecondary} style={styles.textBtn}>
            <Text style={styles.textBtnLabel}>{secondary}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function BaselineResult({ score, onNext, onRetry }: { score: QuickTestScore | null; onNext: () => void; onRetry: () => void }) {
  const v = useEnter();
  if (!score || !score.ok) {
    return (
      <Centered
        mascot="wow"
        eyebrow="Brain Baseline"
        title="That one didn't count"
        body="Too many taps came early, or the run ended. Wait for the dot, then tap."
        action="Try again"
        onAction={onRetry}
        secondary="Skip for now"
        onSecondary={onNext}
      />
    );
  }
  const pct = baselinePercentile(score.medianMs);
  return (
    <View style={styles.flex}>
      <Animated.View style={[styles.centerBody, enterStyle(v)]}>
        <Text style={[styles.eyebrow, styles.centerText]}>YOUR BRAIN BASELINE</Text>
        <View style={styles.baselineCard}>
          <View style={styles.baselineRow}>
            <Text style={styles.baselineBig}>{score.medianMs}</Text>
            <Text style={styles.baselineUnit}>ms</Text>
          </View>
          <Text style={styles.baselinePct}>{`Faster than about ${pct}% of people`}</Text>
          <View style={styles.baselineTrack}>
            <View style={[styles.baselineFill, { width: `${pct}%` }]} />
            <View style={[styles.baselineDot, { left: `${pct}%` }]} />
          </View>
          <Text style={styles.baselineNote}>
            An estimate for phone reaction tests. What matters is how you move from here.
          </Text>
        </View>
        <Text style={[styles.subtitle, styles.centerText]}>
          This is your starting line. Over the next 4 weeks we’ll see if your supplement moves it.
        </Text>
      </Animated.View>
      <View style={styles.footer}>
        <Button label="Build my experiment" onPress={onNext} />
      </View>
    </View>
  );
}

const BUILD_STEPS = [
  'Reading your answers',
  'Randomizing your on and off days',
  'Sealing the schedule so you stay blind',
  'Setting your daily check-in',
];

function Building({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(0);
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  useEffect(() => {
    if (done >= BUILD_STEPS.length) {
      const t = setTimeout(() => {
        celebrate();
        onDone();
      }, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      tapLight();
      setDone((d) => d + 1);
    }, 750);
    return () => clearTimeout(t);
  }, [done, onDone]);

  return (
    <View style={styles.centerBody}>
      <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-6deg', '6deg', '-6deg'] }) }] }}>
        <Brian size={140} mood="focused" tilt={0} />
      </Animated.View>
      <Text style={[styles.title, styles.centerText]}>Building your experiment</Text>
      <View style={styles.buildList}>
        {BUILD_STEPS.map((label, i) => {
          const complete = i < done;
          const active = i === done;
          return (
            <View key={label} style={styles.buildRow}>
              <View style={[styles.buildDot, complete && styles.buildDotDone, active && styles.buildDotActive]}>
                {complete ? <Icon name="check" size={14} color={brand.white} strokeWidth={3} /> : null}
              </View>
              <Text style={[styles.buildLabel, !complete && !active && styles.buildLabelIdle]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Plan({ answers, onStart }: { answers: QuizAnswers; onStart: () => void }) {
  const v = useEnter();
  const milestones = useMemo(() => planMilestones(new Date(), PLAN_LENGTH_DAYS), []);
  const verdict = milestones[milestones.length - 1]!;
  const icons: Record<string, IconName> = { baseline: 'flag', start: 'cups', halfway: 'star', verdict: 'trophy' };
  return (
    <View style={styles.flex}>
      <Animated.ScrollView contentContainerStyle={styles.body} {...{ style: [styles.flex, enterStyle(v)] }}>
        <Text style={styles.eyebrow}>YOUR PLAN</Text>
        <Text style={styles.title}>{`Your verdict unlocks ${shortDate(verdict.date)}`}</Text>
        <Text style={styles.subtitle}>{stakesLine(answers)}</Text>

        <View style={styles.timeline}>
          {milestones.map((m, i) => {
            const last = i === milestones.length - 1;
            return (
              <View key={m.id} style={styles.tlRow}>
                <View style={styles.tlRail}>
                  <View style={[styles.tlNode, last && styles.tlNodeLast]}>
                    <Icon name={icons[m.id] ?? 'star'} size={18} color={last ? brand.sun : brand.ink} strokeWidth={2.2} />
                  </View>
                  {!last ? <View style={styles.tlLine} /> : null}
                </View>
                <View style={styles.tlText}>
                  <Text style={styles.tlLabel}>{m.label}</Text>
                  <Text style={styles.tlDate}>{i === 0 ? 'Today' : shortDate(m.date)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.promise}>
          <Icon name="lock" size={18} color={brand.ink} />
          <Text style={styles.promiseText}>
            Your results stay sealed until the reveal, so nothing can sway what you measure. That’s what makes the answer real.
          </Text>
        </View>
      </Animated.ScrollView>
      <View style={styles.footer}>
        <Button label="Set up my experiment" onPress={onStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.paper },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backBtn: { transform: [{ scaleX: -1 }] },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: brand.paperDeep, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: brand.tang },
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, gap: 10 },
  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  centerText: { textAlign: 'center' },
  eyebrow: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.2, color: brand.tang },
  title: { fontSize: 30, lineHeight: 36, fontFamily: fonts.display, letterSpacing: -0.8, color: brand.ink },
  subtitle: { fontSize: 16, lineHeight: 23, fontFamily: fonts.regular, color: brand.muted },
  options: { gap: 10, marginTop: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: brand.line,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionOn: { borderColor: brand.ink, backgroundColor: brand.ink },
  optionPressed: { transform: [{ scale: 0.98 }] },
  optionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: brand.paper, alignItems: 'center', justifyContent: 'center' },
  optionIconOn: { backgroundColor: brand.white },
  optionLabel: { fontSize: 17, fontFamily: fonts.semibold, color: brand.ink },
  optionLabelOn: { color: brand.white },
  optionHint: { fontSize: 13, fontFamily: fonts.regular, color: brand.muted, marginTop: 2 },
  optionHintOn: { color: 'rgba(255,255,255,0.7)' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: brand.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: brand.white, borderColor: brand.white },
  footer: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8, gap: 6 },
  textBtn: { alignItems: 'center', paddingVertical: 12 },
  textBtnLabel: { fontSize: 15, fontFamily: fonts.semibold, color: brand.muted },
  factCard: { backgroundColor: brand.ink, borderRadius: 28, padding: 24, gap: 12, alignSelf: 'stretch' },
  factIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  factTitle: { fontSize: 28, lineHeight: 34, fontFamily: fonts.display, color: brand.white, letterSpacing: -0.6 },
  factBody: { fontSize: 17, lineHeight: 25, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.82)' },
  baselineCard: {
    alignSelf: 'stretch',
    backgroundColor: brand.white,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  baselineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  baselineBig: { fontSize: 76, lineHeight: 84, fontFamily: fonts.display, letterSpacing: -2.5, color: brand.ink },
  baselineUnit: { fontSize: 22, fontFamily: fonts.displayBold, color: brand.muted },
  baselinePct: { fontSize: 18, fontFamily: fonts.semibold, color: brand.ink },
  baselineTrack: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: brand.paperDeep, marginTop: 6, marginBottom: 6 },
  baselineFill: { height: '100%', borderRadius: 5, backgroundColor: brand.tang },
  baselineDot: {
    position: 'absolute',
    top: -5,
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brand.white,
    borderWidth: 3,
    borderColor: brand.ink,
  },
  baselineNote: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, color: brand.faint, textAlign: 'center' },
  buildList: { alignSelf: 'stretch', gap: 14, marginTop: 12 },
  buildRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buildDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: brand.line, alignItems: 'center', justifyContent: 'center' },
  buildDotActive: { borderColor: brand.tang },
  buildDotDone: { backgroundColor: brand.mint, borderColor: brand.mint },
  buildLabel: { fontSize: 16, fontFamily: fonts.medium, color: brand.ink },
  buildLabelIdle: { color: brand.faint },
  timeline: { marginTop: 18, backgroundColor: brand.white, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, padding: 18 },
  tlRow: { flexDirection: 'row', gap: 14 },
  tlRail: { alignItems: 'center', width: 40 },
  tlNode: { width: 40, height: 40, borderRadius: 13, backgroundColor: brand.paper, alignItems: 'center', justifyContent: 'center' },
  tlNodeLast: { backgroundColor: brand.ink },
  tlLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: brand.line, marginVertical: 4 },
  tlText: { flex: 1, paddingTop: 2, paddingBottom: 18 },
  tlLabel: { fontSize: 16, fontFamily: fonts.semibold, color: brand.ink },
  tlDate: { fontSize: 14, fontFamily: fonts.regular, color: brand.muted, marginTop: 2 },
  promise: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: brand.lilacSoft, borderRadius: 18, padding: 16, marginTop: 6 },
  promiseText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, color: brand.ink },
});
