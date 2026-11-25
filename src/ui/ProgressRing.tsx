import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import Svg, { Circle } from 'react-native-svg';

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
 * Determinate circular progress indicator drawn with SVG: a full track circle
 * and an arc whose dash length is the progress, starting at 12 o'clock with
 * round caps. Pass a count or label as `children` to show it in the center.
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
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.fill} strokeWidth={thickness} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors[color]}
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
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
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
