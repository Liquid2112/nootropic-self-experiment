import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from './theme';
import type { RadiusToken, SpacingToken } from './tokens';

export type CardElevation = 'none' | 'sm' | 'md' | 'lg';

export type CardProps = ViewProps & {
  /** Use the raised surface color (for a card nested above another card). */
  raised?: boolean;
  /** Shadow preset. Defaults to `sm`. */
  elevation?: CardElevation;
  /** Inner padding token. Defaults to `lg`. Pass `'none'` for edge-to-edge content. */
  padding?: SpacingToken | 'none';
  /** Corner radius token. Defaults to `lg`. */
  radius?: RadiusToken;
  style?: ViewStyle;
};

/**
 * Rounded content surface with gentle depth. The default card sits on the app
 * background; `raised` is for a card layered above another surface.
 */
export function Card({
  raised = false,
  elevation = 'sm',
  padding = 'lg',
  radius = 'lg',
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: raised ? theme.colors.surfaceRaised : theme.colors.surface,
          borderRadius: theme.radius[radius],
          padding: padding === 'none' ? 0 : theme.spacing[padding],
        },
        theme.shadows[elevation],
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
