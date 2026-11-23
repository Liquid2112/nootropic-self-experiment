import { View, type ViewStyle } from 'react-native';

import { useTheme } from './theme';
import type { ThemeColors } from './tokens';

/**
 * Adherence state for a single day.
 *  - `taken`    : dose logged / test completed (success)
 *  - `missed`   : scheduled but not logged (danger)
 *  - `partial`  : partially complete (warning)
 *  - `upcoming` : a future scheduled day (faint fill)
 *  - `off`      : not part of the schedule (hollow)
 */
export type AdherenceState = 'taken' | 'missed' | 'partial' | 'upcoming' | 'off';

export type AdherenceDotProps = {
  state: AdherenceState;
  /** Diameter in points. Defaults to 12. */
  size?: number;
  style?: ViewStyle;
};

type DotStyle = { fill: keyof ThemeColors | 'transparent'; outline: keyof ThemeColors | null };

const STATE_STYLE: Record<AdherenceState, DotStyle> = {
  taken: { fill: 'success', outline: null },
  missed: { fill: 'danger', outline: null },
  partial: { fill: 'warning', outline: null },
  upcoming: { fill: 'fill', outline: null },
  off: { fill: 'transparent', outline: 'border' },
};

/** Small status dot summarizing one day's adherence. */
export function AdherenceDot({ state, size = 12, style }: AdherenceDotProps) {
  const theme = useTheme();
  const spec = STATE_STYLE[state];
  const backgroundColor = spec.fill === 'transparent' ? 'transparent' : theme.colors[spec.fill];
  return (
    <View
      accessibilityLabel={`adherence: ${state}`}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderWidth: spec.outline ? 1 : 0,
          borderColor: spec.outline ? theme.colors[spec.outline] : undefined,
        },
        style,
      ]}
    />
  );
}
