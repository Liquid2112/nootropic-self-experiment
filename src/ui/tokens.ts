/**
 * Design tokens for the app. The UI kit (and every screen) reads colors,
 * spacing, radii, and type sizes from here — never a hardcoded literal — so the
 * look stays consistent and a later theme pass changes one file.
 *
 * This is a minimal local version of the shared @/ui token set: the parallel
 * ui-kit branch was not available when this feature was built, so the pieces
 * the daily loop needs live here. If the fuller kit lands later, these can be
 * reconciled without touching the screens, which import only from "@/ui".
 */

export const colors = {
  /** App background. */
  background: '#F2F2F7',
  /** Card / elevated surface. */
  surface: '#FFFFFF',
  /** A full-bleed dark surface, used by the distraction-free test. */
  surfaceInverse: '#1C1C1E',
  /** Primary text. */
  text: '#11181C',
  /** Secondary / supporting text. */
  textMuted: '#6B7280',
  /** Text on the inverse surface. */
  textInverse: '#F2F2F7',
  /** One blue accent for primary actions and highlights. */
  accent: '#0A84FF',
  /** Text/icon color that sits on the accent. */
  onAccent: '#FFFFFF',
  /** Hairline borders and track backgrounds. */
  border: '#E3E3E8',
  /** The PVT stimulus dot. */
  stimulus: '#30D158',
  /** Success / valid state. */
  success: '#34C759',
  /** Warning / off-window / invalid state. */
  warning: '#FF9F0A',
  /** Destructive / error state. */
  danger: '#FF3B30',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '600' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
} as const;

export type ColorToken = keyof typeof colors;
