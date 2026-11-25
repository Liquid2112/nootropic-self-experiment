import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from './theme';
import type { ThemeColors, TypographyStyle, TypographyToken } from './tokens';

/** Which semantic color role the text uses. */
export type TextColorToken = Extract<
  keyof ThemeColors,
  'textPrimary' | 'textSecondary' | 'textTertiary' | 'accent' | 'success' | 'warning' | 'danger' | 'onAccent'
>;

export type AppTextProps = TextProps & {
  /** Typography scale entry. Defaults to `body`. */
  variant?: TypographyToken;
  /** Semantic color role. Defaults to `textPrimary`. */
  color?: TextColorToken;
  /** Center the text. */
  center?: boolean;
};

/**
 * Typed text primitive. All app text goes through here so size, weight and
 * color come from tokens rather than inline numbers.
 */
export function AppText({
  variant = 'body',
  color = 'textPrimary',
  center = false,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const typeStyle = theme.typography[variant];
  const resolved: TextStyle = {
    fontSize: typeStyle.fontSize,
    lineHeight: typeStyle.lineHeight,
    ...(typeStyle.fontFamily
      ? { fontFamily: typeStyle.fontFamily }
      : { fontWeight: (typeStyle as TypographyStyle).fontWeight }),
    letterSpacing: typeStyle.letterSpacing,
    color: theme.colors[color],
    ...(center ? { textAlign: 'center' } : null),
  };
  return <Text {...rest} style={[resolved, style]} />;
}
