import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { now } from '@/features/daily-loop';
import { colors, spacing, typography } from '@/ui';

/**
 * Psychomotor vigilance task (PVT): a dot appears after each inter-stimulus
 * interval in `schedule`; the user taps as soon as it shows. Reaction times are
 * measured with the high-resolution clock. Shared by the daily check-in and the
 * free standalone reaction test.
 */
export function PvtTask({
  schedule,
  onDone,
}: {
  schedule: number[];
  onDone: (reactionTimesMs: number[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const onsetRef = useRef<number>(0);
  const rtsRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = useCallback(
    (i: number) => {
      if (i >= schedule.length) {
        onDone(rtsRef.current);
        return;
      }
      const isi = schedule[i] ?? 1000;
      timeoutRef.current = setTimeout(() => {
        onsetRef.current = now();
        setVisible(true);
      }, isi);
    },
    [schedule, onDone],
  );

  // Kick off the first trial once.
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    scheduleNext(0);
  }

  // Don't fire a pending stimulus after the screen is left.
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const onTap = useCallback(() => {
    if (!visible) {
      return;
    }
    const rt = now() - onsetRef.current;
    rtsRef.current = [...rtsRef.current, rt];
    setVisible(false);
    const next = index + 1;
    setIndex(next);
    scheduleNext(next);
  }, [visible, index, scheduleNext]);

  return (
    <Pressable
      style={styles.pvtArea}
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel="Tap when the dot appears"
    >
      <Text style={styles.muted}>Tap the moment the dot appears</Text>
      <Text style={styles.progress}>{`${Math.min(index + 1, schedule.length)} / ${schedule.length}`}</Text>
      {visible ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pvtArea: {
    flex: 1,
    backgroundColor: colors.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  muted: {
    fontSize: typography.body.fontSize,
    color: colors.textInverse,
    opacity: 0.7,
    textAlign: 'center',
  },
  progress: {
    fontSize: typography.body.fontSize,
    color: colors.textInverse,
    opacity: 0.6,
  },
  dot: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.stimulus,
  },
  dotPlaceholder: {
    width: 120,
    height: 120,
  },
});
