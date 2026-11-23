/**
 * Design tokens for the Nootropic Self-Experiment app.
 *
 * Direction: light-and-airy classic iOS. White / near-white surfaces, soft
 * grays, a single blue accent, system (SF-style) font, rounded cards with
 * gentle depth and generous whitespace.
 *
 * Tokens are grouped into two layers:
 *  - raw palettes / scales (private building blocks), and
 *  - a semantic `Theme` (what components consume).
 *
 * Components must read from a `Theme` (see `useTheme`) and never hardcode a
 * color or a magic number. Only the light theme exists today; the shape is
 * built so a dark theme can be added by supplying another `ThemeColors`
 * object with the same keys — no component changes required.
 */

/** Spacing scale (points). A 4pt base with an extra-small 2pt step. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Corner radius scale (points). `pill`/`round` are effectively fully rounded. */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
  round: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * Typography scale. `fontFamily` is left to the platform system font
 * (undefined => San Francisco on iOS, Roboto on Android) so the app reads as
 * native. Weights are React Native's string weights.
 */
export type TypographyStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight:
    | '400'
    | '500'
    | '600'
    | '700';
  letterSpacing: number;
};

export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.06 },
} as const satisfies Record<string, TypographyStyle>;

export type TypographyToken = keyof typeof typography;

/**
 * Semantic color roles. A theme supplies one color per role; components refer
 * to roles, never to raw hex.
 */
export type ThemeColors = {
  /** App background behind all content. */
  background: string;
  /** Default card / grouped-content surface. */
  surface: string;
  /** A surface that sits above `surface` (e.g. a nested or floating card). */
  surfaceRaised: string;
  /** Primary text. */
  textPrimary: string;
  /** Secondary / supporting text. */
  textSecondary: string;
  /** Tertiary text: hints, disabled labels, faint captions. */
  textTertiary: string;
  /** Hairline borders and dividers. */
  border: string;
  /** The single brand accent (interactive blue). */
  accent: string;
  /** Pressed / darker variant of the accent. */
  accentPressed: string;
  /** Text / icon color that reads on top of `accent`. */
  onAccent: string;
  /** A faint accent-tinted fill (selected chips, subtle buttons). */
  accentMuted: string;
  /** Positive state. */
  success: string;
  /** Caution state. */
  warning: string;
  /** Error / destructive state. */
  danger: string;
  /** A neutral filled control background (e.g. slider track). */
  fill: string;
  /** Overlay scrim for modals / dimming. */
  scrim: string;
};

export type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  /** Android elevation; kept in step with the iOS shadow. */
  elevation: number;
};

export type ThemeShadows = {
  /** No depth. */
  none: ShadowStyle;
  /** Resting card. */
  sm: ShadowStyle;
  /** Raised card / key surface. */
  md: ShadowStyle;
  /** Floating element (sheet, popover). */
  lg: ShadowStyle;
};

export type Theme = {
  name: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: ThemeShadows;
};

const lightColors: ThemeColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#6E6E73',
  textTertiary: '#AEAEB2',
  border: '#E3E3E8',
  accent: '#0A84FF',
  accentPressed: '#0060DF',
  onAccent: '#FFFFFF',
  accentMuted: '#E6F0FF',
  success: '#34C759',
  warning: '#FF9F0A',
  danger: '#FF3B30',
  fill: '#E9E9EF',
  scrim: 'rgba(0, 0, 0, 0.4)',
};

const lightShadows: ThemeShadows = {
  none: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
};

export const lightTheme: Theme = {
  name: 'light',
  colors: lightColors,
  spacing,
  radius,
  typography,
  shadows: lightShadows,
};

/**
 * The theme the app renders with today. A dark theme can be introduced later
 * by defining a `darkTheme: Theme` with the same keys and selecting it from
 * the provider; no component needs to change.
 */
export const defaultTheme: Theme = lightTheme;
