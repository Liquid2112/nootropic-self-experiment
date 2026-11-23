import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, typography } from './tokens';

/**
 * Typed text primitive. `variant` selects a slot from the type ramp and `tone`
 * selects a text color role, so screens never hardcode a font size or color.
 */
export type TextVariant = keyof typeof typography;
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'positive' | 'negative';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

const TONE_COLOR: Record<TextTone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  accent: colors.accent,
  positive: colors.positive,
  negative: colors.negative,
};

export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps) {
  return <RNText style={[styles.base, typography[variant], { color: TONE_COLOR[tone] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: {
    // System font: SF on iOS, Roboto on Android, matching the native look.
  },
});
