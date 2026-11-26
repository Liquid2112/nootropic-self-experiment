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

/** Ink colors tuned to read clearly on the dark background. */
export const STROOP_INK: Record<StroopColor, string> = {
  red: '#FF4D5E',
  blue: '#4F8BFF',
  green: '#2FCB7F',
  yellow: '#FFC93D',
};

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
      <View style={styles.top}>
        <Text style={ink.progress}>{`${Math.min(index + 1, trials.length)} / ${trials.length}`}</Text>
        <TaskTrack fraction={index / Math.max(1, trials.length)} />
        <Text style={ink.muted}>Tap the ink color, not the word</Text>
      </View>
      <View style={styles.stage}>
        {visible && trial ? (
          <Text
            style={[styles.word, { color: STROOP_INK[trial.ink] }]}
            accessibilityLabel={`The word ${trial.word} in ${trial.ink} ink`}
          >
            {trial.word.toUpperCase()}
          </Text>
        ) : null}
      </View>
      <View style={styles.pad}>
        {STROOP_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={c}
            disabled={!visible}
            onPress={() => record(index, c)}
            style={({ pressed }) => [styles.swatch, pressed ? styles.swatchPressed : null]}
          >
            <View style={[styles.swatchFill, { backgroundColor: STROOP_INK[c] }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'space-between', paddingTop: 56, paddingBottom: spacing.xl },
  top: { gap: spacing.md, alignItems: 'center' },
  stage: { height: 160, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 64, lineHeight: 76, fontFamily: fonts.display, letterSpacing: -1 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  swatch: {
    width: '46%',
    height: 76,
    borderRadius: 22,
    padding: 8,
    backgroundColor: brand.ink2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  swatchPressed: { transform: [{ scale: 0.97 }] },
  swatchFill: { flex: 1, borderRadius: 16 },
});
