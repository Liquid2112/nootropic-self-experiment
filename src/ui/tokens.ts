/**
 * Design tokens for Placebo.
 *
 * Direction: warm paper and ink with one signature color. A cream "paper"
 * background, white cards with hairline borders instead of heavy shadows, ink
 * (near-black) primary buttons, and Tang orange as the single signature accent.
 * Lilac is Tang's partner: the two halves of the brand capsule, and the two
 * blinded cups A and B. Display type is Bricolage Grotesque, body is Inter.
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

/** Raw brand palette. Prefer the semantic roles; these are for brand art. */
export const brand = {
  ink: '#15131C',
  ink2: '#2B2836',
  paper: '#F7F4EE',
  paperDeep: '#EFEAE1',
  white: '#FFFFFF',
  line: '#E7E1D6',
  tang: '#FF5A36',
  tangDeep: '#E5431F',
  tangSoft: '#FFE7DF',
  lilac: '#B7A6FF',
  lilacDeep: '#7B63F0',
  lilacSoft: '#EEEAFF',
  mint: '#1FAE6B',
  mintSoft: '#DDF4E8',
  sun: '#FFC23D',
  sunDeep: '#B07800',
  sunSoft: '#FFF2CF',
  rose: '#E8384F',
  muted: '#6D6878',
  faint: '#A9A3B3',
} as const;

/** Font family names, as registered by `useFonts` in the root layout. */
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

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
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
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
  /** Brand font family; when set it replaces fontWeight (custom fonts carry their weight). */
  fontFamily?: string;
};

export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8, fontFamily: fonts.display },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6, fontFamily: fonts.display },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4, fontFamily: fonts.displayBold },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.3, fontFamily: fonts.displayBold },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2, fontFamily: fonts.semibold },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: -0.2, fontFamily: fonts.regular },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '400', letterSpacing: -0.2, fontFamily: fonts.regular },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.1, fontFamily: fonts.regular },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0, fontFamily: fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0, fontFamily: fonts.medium },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.4, fontFamily: fonts.semibold },
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
  /** The single signature accent (Tang). */
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
  background: brand.paper,
  surface: brand.white,
  surfaceRaised: brand.white,
  textPrimary: brand.ink,
  textSecondary: brand.muted,
  textTertiary: brand.faint,
  border: brand.line,
  accent: brand.tang,
  accentPressed: brand.tangDeep,
  onAccent: brand.white,
  accentMuted: brand.tangSoft,
  success: brand.mint,
  warning: brand.sun,
  danger: brand.rose,
  fill: brand.paperDeep,
  scrim: 'rgba(21, 19, 28, 0.5)',
};

/**
 * Extra colors for the game layer (streaks, XP, badges). Kept outside the
 * semantic `ThemeColors` roles because only the gamified widgets use them.
 * Names are kept stable; values come from the brand palette.
 */
export const gameColors = {
  flame: brand.tang,
  flameMuted: brand.tangSoft,
  xp: brand.sun,
  xpMuted: brand.sunSoft,
  mint: brand.mint,
  mintMuted: brand.mintSoft,
  violetDeep: brand.ink,
  heroStart: brand.ink,
  heroEnd: brand.lilac,
  locked: '#DAD4C8',
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
    shadowOpacity: 0.04,
    shadowRadius: 2,
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
