import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { now } from '@/features/daily-loop';
import { brand, fonts, spacing } from '@/ui';

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
  // Parents often pass an inline onDone; keep the latest without restarting.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const scheduleNext = useCallback(
    (i: number) => {
      if (i >= schedule.length) {
        onDoneRef.current(rtsRef.current);
        return;
      }
      const isi = schedule[i] ?? 1000;
      timeoutRef.current = setTimeout(() => {
        onsetRef.current = now();
        setVisible(true);
      }, isi);
    },
    [schedule],
  );

  // Start the first trial on mount; don't fire a pending stimulus after the
  // screen is left.
  useEffect(() => {
    scheduleNext(0);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scheduleNext]);

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

  const total = schedule.length;
  const done = Math.min(index, total);
  return (
    <Pressable
      style={styles.pvtArea}
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel="Tap when the dot appears"
    >
      <View style={styles.top}>
        <Text style={styles.progress}>{`${Math.min(index + 1, total)} / ${total}`}</Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${total > 0 ? (done / total) * 100 : 0}%` }]} />
        </View>
      </View>
      <View style={styles.stage}>
        {visible ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
      </View>
      <Text style={styles.muted}>Tap anywhere the moment the dot appears</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pvtArea: {
    flex: 1,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: spacing.xl,
  },
  top: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md },
  track: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: brand.lilac, borderRadius: 2 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  progress: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  // The stimulus: large, high-contrast Tang on ink so it is unmissable.
  dot: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: brand.tang,
  },
  dotPlaceholder: {
    width: 132,
    height: 132,
  },
});
