/**
 * Design tokens for the light iOS-style UI kit.
 *
 * This is a MINIMAL local kit. The project plans a shared `@/ui` kit on its own
 * branch; that branch is not available to merge yet, so the onboarding flow
 * ships the small set of primitives and tokens it needs here rather than
 * hardcoding colors in screens. If the shared kit lands later, these can be
 * reconciled against it. Screens import only from `@/ui`, never raw colors.
 */

export const colors = {
  /** App background: near-white, slightly cool. */
  background: '#F2F2F7',
  /** Card / grouped surface. */
  surface: '#FFFFFF',
  /** Secondary grouped surface (e.g. a field inside a card). */
  surfaceAlt: '#F7F7FA',
  /** Primary text. */
  text: '#1C1C1E',
  /** Secondary / supporting text. */
  textSecondary: '#6E6E73',
  /** Muted text (captions, placeholders). */
  textMuted: '#9A9AA0',
  /** Single blue accent. */
  accent: '#0A84FF',
  /** Accent text used on top of the accent fill. */
  onAccent: '#FFFFFF',
  /** Hairline separators and borders. */
  border: '#D9D9DE',
  /** Selected chip / subtle accent fill. */
  accentSoft: '#E5F0FF',
  /** Warning / caution surface (disclaimer emphasis). */
  cautionSurface: '#FFF6E5',
  /** Warning / caution text. */
  caution: '#8A6100',
  /** Success / confirmation. */
  success: '#2FA84F',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  caption: 13,
  footnote: 15,
  body: 17,
  title: 22,
  largeTitle: 30,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** A soft, shallow card shadow (iOS-style gentle depth). */
export const shadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;
