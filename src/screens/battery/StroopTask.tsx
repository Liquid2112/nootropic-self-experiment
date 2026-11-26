import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { now } from '@/features/daily-loop';
import {
  STROOP_COLORS,
  type StroopColor,
  type StroopResponse,
  type StroopTrial,
} from '@/engines/cognitive-test';
import { brand, fonts, spacing } from '@/ui';
import { HAIRLINE, ink, TaskTrack } from './ink';

/** Ink colors tuned to read clearly on the white stage. */
export const STROOP_INK: Record<StroopColor, string> = {
  red: '#E8384F',
  blue: '#3366E6',
  green: '#1A9E5F',
  yellow: '#F2B200',
};

const LABEL: Record<StroopColor, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' };

/** A trial left unanswered this long counts as a miss. */
const TRIAL_TIMEOUT_MS = 3000;
/** Blank gap between trials so each word is a fresh onset. */
const GAP_MS = 250;

/**
 * Color clash (Stroop): a color word appears in an ink color, and the user taps
 * the swatch for the ink. Reaction time is measured from the word's onset on
 * the high-resolution clock.
 */
export function StroopTask({
  trials,
  onDone,
}: {
  trials: StroopTrial[];
  onDone: (responses: StroopResponse[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const onsetRef = useRef(0);
  const responsesRef = useRef<StroopResponse[]>([]);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const record = useCallback((i: number, choice: StroopColor | null) => {
    // Ignore a late tap or timeout for a trial that's already answered.
    if (responsesRef.current.length !== i) return;
    responsesRef.current = [...responsesRef.current, { choice, rtMs: now() - onsetRef.current }];
    setVisible(false);
    setIndex(i + 1);
  }, []);

  // Each trial: a short blank, then the word, then a timeout if nobody taps.
  useEffect(() => {
    if (index >= trials.length) {
      onDoneRef.current(responsesRef.current);
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const gap = setTimeout(() => {
      onsetRef.current = now();
      setVisible(true);
      timeout = setTimeout(() => record(index, null), TRIAL_TIMEOUT_MS);
    }, GAP_MS);
    return () => {
      clearTimeout(gap);
      if (timeout) clearTimeout(timeout);
    };
  }, [index, trials.length, record]);

  const trial = trials[index];
  return (
    <View style={styles.fill}>
      <View style={styles.head}>
        <TaskTrack fraction={index / Math.max(1, trials.length)} />
        <Text style={styles.title}>Color clash</Text>
        <Text style={ink.muted}>Tap the color of the ink, not the word.</Text>
      </View>
      <View style={styles.stage}>
        {visible && trial ? (
          <Text
            style={[styles.word, { color: STROOP_INK[trial.ink] }]}
            accessibilityLabel={`The word ${trial.word} in ${trial.ink} ink`}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {trial.word.charAt(0).toUpperCase() + trial.word.slice(1).toLowerCase()}
          </Text>
        ) : (
          <View style={styles.wordPlaceholder} />
        )}
        <Text style={styles.counter}>{`${Math.min(index + 1, trials.length)} of ${trials.length}`}</Text>
      </View>
      <View style={styles.pad}>
        {STROOP_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={c}
            disabled={!visible}
            onPress={() => record(index, c)}
            style={({ pressed }) => [styles.answer, pressed ? styles.answerPressed : null]}
          >
            <View style={[styles.answerDot, { backgroundColor: STROOP_INK[c] }]} />
            <Text style={styles.answerText}>{LABEL[c]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[ink.footnote, ink.center]}>Speed and accuracy both count.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: spacing.lg, paddingBottom: spacing.sm },
  head: { gap: 6 },
  title: {
    fontSize: 32,
    letterSpacing: -0.8,
    fontFamily: fonts.display,
    color: brand.ink,
    marginTop: spacing.lg,
  },
  stage: {
    flex: 1,
    minHeight: 220,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: HAIRLINE,
    backgroundColor: brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
  },
  word: { fontSize: 84, lineHeight: 96, letterSpacing: -3, fontFamily: fonts.display },
  wordPlaceholder: { height: 96 },
  counter: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  answer: {
    flexGrow: 1,
    flexBasis: '45%',
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    backgroundColor: brand.white,
  },
  answerPressed: { transform: [{ scale: 0.97 }], backgroundColor: brand.paperDeep },
  answerDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: brand.ink },
  answerText: { fontSize: 18, fontFamily: fonts.semibold, color: brand.ink },
});
