import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SymbolSet } from '@/engines/cognitive-test';
import { brand, fonts, spacing } from '@/ui';
import { HAIRLINE, ink, TaskTrack } from './ink';
import { SymbolGlyph } from './SymbolGlyph';

/**
 * Symbol code (digit-symbol substitution): the key across the top pairs each
 * symbol with a digit; tap the digit for the big symbol, as many as possible
 * before the timer runs out.
 */
export function SymbolTask({
  set,
  durationMs,
  onDone,
}: {
  set: SymbolSet;
  durationMs: number;
  onDone: (answers: number[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const answersRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => {
      const ms = Date.now() - started;
      setElapsed(ms);
      if (ms >= durationMs && !doneRef.current) {
        doneRef.current = true;
        clearInterval(tick);
        onDoneRef.current(answersRef.current);
      }
    }, 100);
    return () => clearInterval(tick);
  }, [durationMs]);

  const answer = (digit: number) => {
    if (doneRef.current) return;
    answersRef.current = [...answersRef.current, digit];
    const next = index + 1;
    if (next >= set.stream.length) {
      doneRef.current = true;
      onDoneRef.current(answersRef.current);
      return;
    }
    setIndex(next);
  };

  const symbol = set.stream[index] ?? 0;
  const secondsLeft = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
  // key[symbol] = digit; show the key sorted by digit so it reads 1..9.
  const keyByDigit = set.key
    .map((digit, symbolId) => ({ digit, symbolId }))
    .sort((a, b) => a.digit - b.digit);

  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <Text style={ink.progress}>{`${secondsLeft}s`}</Text>
        <TaskTrack fraction={elapsed / durationMs} />
      </View>

      <View style={styles.keyRow} accessibilityLabel="Symbol key">
        {keyByDigit.map(({ digit, symbolId }) => (
          <View key={digit} style={styles.keyCell}>
            <SymbolGlyph id={symbolId} size={22} color={brand.ink} />
            <View style={styles.keyRule} />
            <Text style={styles.keyDigit}>{digit}</Text>
          </View>
        ))}
      </View>

      <View style={styles.target}>
        <SymbolGlyph id={symbol} size={84} color={brand.lilacDeep} strokeWidth={1.8} />
      </View>

      <View style={styles.pad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${d}`}
            onPress={() => answer(d)}
            style={({ pressed }) => [styles.key, pressed ? styles.keyPressed : null]}
          >
            <Text style={styles.keyText}>{d}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'space-between', paddingTop: 48, paddingBottom: spacing.lg, gap: spacing.md },
  top: { gap: spacing.sm, alignItems: 'center' },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: brand.white,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  keyCell: { alignItems: 'center', gap: 6, flex: 1 },
  keyRule: { width: 16, height: StyleSheet.hairlineWidth, backgroundColor: brand.faint },
  keyDigit: { fontSize: 15, fontFamily: fonts.semibold, color: brand.ink },
  target: {
    alignSelf: 'center',
    width: 148,
    height: 148,
    borderRadius: 36,
    backgroundColor: brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  key: {
    width: '31.5%',
    height: 58,
    borderRadius: 18,
    backgroundColor: brand.paperDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: brand.line },
  keyText: { fontSize: 24, fontFamily: fonts.displayBold, color: brand.ink },
});
