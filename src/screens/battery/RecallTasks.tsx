import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RECALL_WORD_MS, type RecallSet } from '@/engines/cognitive-test';
import { brand, fonts, radius, spacing } from '@/ui';
import { HAIRLINE, ink, LightButton, TaskTrack } from './ink';

/** Word memory, part 1: the words appear one at a time. */
export function RecallStudy({ words, onDone }: { words: string[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const t = setTimeout(() => {
      if (index + 1 >= words.length) onDoneRef.current();
      else setIndex(index + 1);
    }, RECALL_WORD_MS);
    return () => clearTimeout(t);
  }, [index, words.length]);

  return (
    <View style={styles.studyFill}>
      <View style={styles.top}>
        <Text style={ink.progress}>{`${index + 1} / ${words.length}`}</Text>
        <TaskTrack fraction={(index + 1) / words.length} />
        <Text style={ink.muted}>Remember each word</Text>
      </View>
      <Text key={index} style={styles.studyWord}>
        {words[index]}
      </Text>
      <View style={styles.top} />
    </View>
  );
}

/** Word memory, part 2: pick the studied words out of the grid. */
export function RecallTest({
  set,
  onDone,
}: {
  set: RecallSet;
  onDone: (picked: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (w: string) =>
    setPicked((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  return (
    <View style={styles.testFill}>
      <View style={styles.grid}>
        {set.probes.map((w) => {
          const on = picked.includes(w);
          return (
            <Pressable
              key={w}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => toggle(w)}
              style={[styles.cell, on ? styles.cellOn : null]}
            >
              <Text style={[styles.cellText, on ? styles.cellTextOn : null]}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[ink.footnote, ink.center]}>{`${picked.length} picked · wrong picks count against you`}</Text>
      <LightButton label="Done" onPress={() => onDone(picked)} />
    </View>
  );
}

const styles = StyleSheet.create({
  studyFill: { flex: 1, justifyContent: 'space-between', paddingTop: 56, paddingBottom: spacing.xl },
  top: { gap: spacing.md, alignItems: 'center', minHeight: 60 },
  studyWord: {
    fontSize: 52,
    lineHeight: 62,
    fontFamily: fonts.display,
    letterSpacing: -1,
    color: brand.white,
    textAlign: 'center',
  },
  testFill: { gap: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  cell: {
    width: '48.5%',
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: HAIRLINE,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: { backgroundColor: brand.lilac, borderColor: brand.lilac },
  cellText: { fontSize: 16, fontFamily: fonts.medium, color: brand.white },
  cellTextOn: { color: brand.ink, fontFamily: fonts.semibold },
});
