import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CALM_ITEMS, CALM_SCALE } from '@/engines/cognitive-test';
import { brand, fonts, radius, spacing } from '@/ui';
import { HAIRLINE, ink } from './ink';

/**
 * The calm check: four statements, each answered on a four-step scale. Laid
 * out as segmented rows so the whole thing is four taps.
 */
export function CalmCheck({
  answers,
  onChange,
}: {
  answers: (number | null)[];
  onChange: (answers: (number | null)[]) => void;
}) {
  return (
    <View style={styles.list}>
      {CALM_ITEMS.map((item, i) => (
        <View key={item.id} style={ink.darkCard}>
          <Text style={ink.label}>{item.prompt}</Text>
          <View style={styles.segments}>
            {CALM_SCALE.map((label, value) => {
              const selected = answers[i] === value;
              return (
                <Pressable
                  key={label}
                  testID={`calm-${item.id}-${value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item.prompt}: ${label}`}
                  onPress={() => {
                    const next = [...answers];
                    next[i] = value;
                    onChange(next);
                  }}
                  style={[styles.segment, selected ? styles.segmentOn : null]}
                >
                  <Text style={[styles.segmentText, selected ? styles.segmentTextOn : null]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  segments: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: HAIRLINE,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: brand.white, borderColor: brand.white },
  segmentText: { fontSize: 12, lineHeight: 15, fontFamily: fonts.medium, color: brand.white, textAlign: 'center' },
  segmentTextOn: { color: brand.ink, fontFamily: fonts.semibold },
});
