import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from './AppText';
import { useTheme } from './theme';
import type { ThemeColors } from './tokens';

export type ProgressRingColor = Extract<keyof ThemeColors, 'accent' | 'success' | 'warning' | 'danger'>;

export type ProgressRingProps = {
  /** Progress in the range [0, 1]. Values outside are clamped. */
  progress: number;
  /** Outer diameter in points. Defaults to 72. */
  size?: number;
  /** Ring thickness in points. Defaults to 8. */
  thickness?: number;
  /** Progress arc color role. Defaults to `accent`. */
  color?: ProgressRingColor;
  /** Content centered inside the ring (e.g. a streak count). */
  children?: ReactNode;
  style?: ViewStyle;
};

/**
 * Determinate circular progress indicator built only from Views — two rotating
 * half-ring layers over a full track — so it needs no SVG dependency. Used for
 * streak / completion progress. Pass a count or label as `children` to show it
 * in the center.
 */
export function ProgressRing({
  progress,
  size = 72,
  thickness = 8,
  color = 'accent',
  children,
  style,
}: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const arcColor = theme.colors[color];
  const trackColor = theme.colors.fill;

  // The right half shows 0-50% (0-180deg); the left half shows 50-100%.
  const rightRotation = `${Math.min(clamped, 0.5) * 360}deg`;
  const leftRotation = `${Math.max(0, clamped - 0.5) * 360}deg`;

  const halfStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: thickness,
    borderColor: arcColor,
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ width: size, height: size }, style]}
    >
      {/* Full track underneath. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: trackColor,
          },
        ]}
      />
      {/* Right-half arc (first 50%). */}
      <View style={[styles.clip, { width: size / 2, right: 0 }]}>
        <View style={styles.rotor}>
          <View
            style={[
              halfStyle,
              styles.rightHalf,
              { transform: [{ rotate: rightRotation }] },
            ]}
          />
        </View>
      </View>
      {/* Left-half arc (last 50%). */}
      {clamped > 0.5 ? (
        <View style={[styles.clip, { width: size / 2, left: 0 }]}>
          <View style={[styles.rotor, { left: -size / 2 }]}>
            <View
              style={[
                halfStyle,
                styles.leftHalf,
                { transform: [{ rotate: leftRotation }] },
              ]}
            />
          </View>
        </View>
      ) : null}
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

export type StreakIndicatorProps = {
  /** Current streak length in days. */
  count: number;
  /** Goal length used to fill the ring. Defaults to 7. */
  goal?: number;
  /** Ring diameter. Defaults to 72. */
  size?: number;
  style?: ViewStyle;
};

/** Streak count rendered inside a progress ring that fills toward `goal`. */
export function StreakIndicator({ count, goal = 7, size = 72, style }: StreakIndicatorProps) {
  const progress = goal > 0 ? count / goal : 0;
  const color: ProgressRingColor = progress >= 1 ? 'success' : 'accent';
  return (
    <ProgressRing progress={progress} size={size} color={color} style={style}>
      <AppText variant="title3" color="textPrimary" center>
        {count}
      </AppText>
      <AppText variant="caption2" color="textSecondary" center>
        {count === 1 ? 'day' : 'days'}
      </AppText>
    </ProgressRing>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  rotor: {
    position: 'absolute',
    top: 0,
  },
  rightHalf: {
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  leftHalf: {
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
