/**
 * Design tokens for the app's light, iOS-style look. Every screen and UI
 * primitive reads colors, spacing, radii, and type from here so there are no
 * hardcoded colors in the component tree.
 *
 * This is a minimal local UI kit: the parallel @/ui kit branch was not merged
 * when this screen set was built, so these tokens and the primitives beside
 * them stand in for it. They follow the same shape (named color roles, a
 * spacing scale, type ramp) so a later real kit can replace them in place.
 */

export const colors = {
  /** App background, near-white. */
  background: '#F2F2F7',
  /** Card / grouped surface. */
  surface: '#FFFFFF',
  /** Subtle surface used for inset rows and inactive dots. */
  surfaceMuted: '#E5E5EA',
  /** Primary text. */
  text: '#1C1C1E',
  /** Secondary / caption text. */
  textSecondary: '#6E6E73',
  /** Tertiary / faint text. */
  textTertiary: '#8E8E93',
  /** Single blue accent. */
  accent: '#0A84FF',
  /** On-accent text (white). */
  onAccent: '#FFFFFF',
  /** Positive / improvement. */
  positive: '#34C759',
  /** Negative / worse. */
  negative: '#FF3B30',
  /** Warning / caution (not-enough-data, adherence). */
  warning: '#FF9F0A',
  /** Hairline separators. */
  border: '#D1D1D6',
  /** Taken-day dot. */
  taken: '#34C759',
  /** Missed-day dot. */
  missed: '#FF3B30',
  /** Test-done ring/dot. */
  tested: '#0A84FF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const },
  title: { fontSize: 24, fontWeight: '700' as const },
  headline: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  callout: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;
