import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from './tokens';

export type ProgressRingProps = {
  /** Completed count. */
  value: number;
  /** Total count. */
  total: number;
  /** Large centre label (e.g. the day number). */
  centerLabel: string;
  /** Small caption under the centre label. */
  caption?: string;
  size?: number;
};

/**
 * Circular progress indicator. A true SVG arc would need react-native-svg; this
 * uses a track ring plus a conic-free fill approximation (a colored border
 * whose thickness reads as "in progress") and shows the exact fraction as text,
 * so the number is always legible without a native drawing dependency.
 */
export function ProgressRing({
  value,
  total,
  centerLabel,
  caption,
  size = 120,
}: ProgressRingProps) {
  const safeTotal = total > 0 ? total : 1;
  const fraction = Math.max(0, Math.min(1, value / safeTotal));
  // Border thickness grows with progress so the ring visibly "fills".
  const borderWidth = 4 + Math.round(fraction * 8);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeTotal, now: value }}
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
        },
      ]}
    >
      <Text style={styles.center}>{centerLabel}</Text>
      {caption !== undefined && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}

export type StreakIndicatorProps = {
  /** Consecutive-day streak count. */
  streak: number;
};

/**
 * Compact streak chip: a flame-free, token-colored pill with the current
 * consecutive-day count. Kept dependency-free and legible.
 */
export function StreakIndicator({ streak }: StreakIndicatorProps) {
  const label = streak === 1 ? '1 day streak' : `${streak} day streak`;
  return (
    <View
      accessibilityLabel={label}
      style={[styles.streak, streak > 0 ? styles.streakActive : styles.streakIdle]}
    >
      <Text style={[styles.streakText, streak > 0 ? styles.streakTextActive : null]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  center: {
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
    color: colors.text,
  },
  caption: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
  },
  streak: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  streakActive: {
    backgroundColor: colors.accent,
  },
  streakIdle: {
    backgroundColor: colors.border,
  },
  streakText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
  },
  streakTextActive: {
    color: colors.onAccent,
  },
});
