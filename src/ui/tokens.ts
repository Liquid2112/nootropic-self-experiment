/**
 * Design tokens for the Nootropic Self-Experiment app.
 *
 * Direction: bright and playful. Lavender-tinted background, white cards, a
 * single electric-violet accent, mint for success and a warm flame/gold pair
 * for the game layer (streaks, XP), with rounded cards and chunky buttons.
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
  /** The single brand accent (interactive violet). */
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
  background: '#F5F3FF',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  textPrimary: '#1A1530',
  textSecondary: '#625C7A',
  textTertiary: '#A7A2BC',
  border: '#E6E1F5',
  accent: '#6B4EFF',
  accentPressed: '#5236E0',
  onAccent: '#FFFFFF',
  accentMuted: '#ECE7FF',
  success: '#12B886',
  warning: '#FF9F1C',
  danger: '#F0435A',
  fill: '#ECE9F6',
  scrim: 'rgba(20, 12, 48, 0.45)',
};

/**
 * Extra colors for the game layer (streak flame, XP, badges). Kept outside the
 * semantic `ThemeColors` roles because only the gamified widgets use them.
 */
export const gameColors = {
  flame: '#FF6B2C',
  flameMuted: '#FFE9DD',
  xp: '#FFB800',
  xpMuted: '#FFF4D1',
  mint: '#12B886',
  mintMuted: '#DDF7EE',
  violetDeep: '#2A1A6E',
  heroStart: '#6B4EFF',
  heroEnd: '#9B5CFF',
  locked: '#D9D5E6',
} as const;

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
