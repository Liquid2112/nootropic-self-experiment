/**
 * Flat-token and `Text` compatibility shims over the semantic design system.
 *
 * The canonical kit models styling as a semantic `Theme` consumed through
 * `useTheme()` (see `tokens.ts`, `theme.tsx`). Several screens were written
 * against an earlier flat-token shape — importing `colors`, `fontSize`,
 * `fontWeight`, `radii` maps and a `Text` primitive with a `tone` prop. Rather
 * than keep a second private kit per screen, those names are provided here as
 * thin derivations of the one canonical palette so every screen imports from
 * the single `@/ui` barrel.
 *
 * New screens should prefer `useTheme()` + `AppText` directly. These shims
 * exist so the merged screens share one kit; they add no second source of
 * truth — every value traces back to `lightTheme`.
 */
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { lightTheme, radius, type TypographyStyle, type TypographyToken } from './tokens';

const t = lightTheme.colors;

/**
 * Flat color map. A superset of the color roles the screens reference, each
 * pointing at the canonical light palette. Inverse / status aliases (used by
 * the distraction-free daily test and the results calendar) are included so a
 * screen never reaches for a raw hex.
 */
export const colors = {
  background: t.background,
  surface: t.surface,
  surfaceRaised: t.surfaceRaised,
  surfaceMuted: t.fill,
  surfaceInverse: t.textPrimary,
  text: t.textPrimary,
  textPrimary: t.textPrimary,
  textSecondary: t.textSecondary,
  textTertiary: t.textTertiary,
  textMuted: t.textTertiary,
  textInverse: t.surface,
  border: t.border,
  accent: t.accent,
  accentPressed: t.accentPressed,
  onAccent: t.onAccent,
  success: t.success,
  warning: t.warning,
  danger: t.danger,
  positive: t.success,
  negative: t.danger,
  taken: t.success,
  missed: t.danger,
  tested: t.accent,
  stimulus: t.success,
  caution: t.warning,
  cautionSurface: t.accentMuted,
} as const;

export type ColorToken = keyof typeof colors;

/** Flat font-size map derived from the typography scale. */
export const fontSize = {
  caption: lightTheme.typography.caption.fontSize,
  footnote: lightTheme.typography.footnote.fontSize,
  body: lightTheme.typography.body.fontSize,
  callout: lightTheme.typography.callout.fontSize,
  headline: lightTheme.typography.headline.fontSize,
  title: lightTheme.typography.title.fontSize,
  largeTitle: lightTheme.typography.largeTitle.fontSize,
} as const;

/** Named font weights. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** `radii` is the plural spelling some screens use for the radius scale. */
export const radii = radius;

/** Legacy `Text` tone roles mapped onto semantic color roles. */
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'positive' | 'negative';
/** Legacy `Text` variants alias the typography scale. */
export type TextVariant = TypographyToken;

const TONE_COLOR: Record<TextTone, keyof typeof lightTheme.colors> = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'accent',
  positive: 'success',
  negative: 'danger',
};

export type TextProps = RNTextProps & {
  /** Typography scale entry. Defaults to `body`. */
  variant?: TextVariant;
  /** Semantic tone. Defaults to `primary`. */
  tone?: TextTone;
};

/**
 * Compatibility text primitive: same look as `AppText` but keyed by a `tone`
 * role rather than a color-token name. Screens that predate `AppText` use this;
 * both render identical styling from the one theme.
 */
export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps) {
  const typeStyle = lightTheme.typography[variant];
  const resolved: TextStyle = {
    fontSize: typeStyle.fontSize,
    lineHeight: typeStyle.lineHeight,
    ...(typeStyle.fontFamily
      ? { fontFamily: typeStyle.fontFamily }
      : { fontWeight: (typeStyle as TypographyStyle).fontWeight }),
    letterSpacing: typeStyle.letterSpacing,
    color: lightTheme.colors[TONE_COLOR[tone]],
  };
  return <RNText {...rest} style={[resolved, style]} />;
}
