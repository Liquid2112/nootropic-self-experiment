import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from './tokens';

export type SliderProps = {
  /** Field label shown above the track. */
  label: string;
  /** Current value, an integer in [min, max]. */
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Optional captions for the low and high ends. */
  lowLabel?: string;
  highLabel?: string;
};

/**
 * Discrete 0..10 rating control built from tappable segments. A gesture slider
 * would pull in a native dependency; the self-report scales here are coarse
 * integers, so a segmented control is both dependency-free and unambiguous to
 * read back. Each segment is an accessible button.
 */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  lowLabel,
  highLabel,
}: SliderProps) {
  const steps: number[] = [];
  for (let i = min; i <= max; i += 1) {
    steps.push(i);
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
      >
        {steps.map((step) => {
          const filled = step <= value;
          return (
            <Pressable
              key={step}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${step}`}
              onPress={() => onChange(step)}
              style={[styles.segment, filled ? styles.segmentFilled : styles.segmentEmpty]}
            />
          );
        })}
      </View>
      {(lowLabel ?? highLabel) !== undefined && (
        <View style={styles.endsRow}>
          <Text style={styles.endLabel}>{lowLabel ?? ''}</Text>
          <Text style={styles.endLabel}>{highLabel ?? ''}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: typography.headline.fontSize,
    fontWeight: typography.headline.fontWeight,
    color: colors.text,
  },
  value: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.accent,
  },
  track: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 28,
    borderRadius: radius.sm,
  },
  segmentFilled: {
    backgroundColor: colors.accent,
  },
  segmentEmpty: {
    backgroundColor: colors.border,
  },
  endsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
  },
});
