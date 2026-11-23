/**
 * Shared visual design system for the Nootropic Self-Experiment app.
 *
 * Import everything from `@/ui`:
 *   import { Button, Card, Slider, useTheme } from '@/ui';
 *
 * Tokens (`spacing`, `radius`, `typography`, `lightTheme`, `Theme`, ...) and
 * primitives (`Button`, `Card`, `Chip`, `Slider`, `CalendarCell`,
 * `AdherenceDot`, `ListRow`, `SectionHeader`, `ProgressRing`, `Scaffold`, ...)
 * are all re-exported here. Screens consume this barrel and never reach for a
 * raw color or spacing number.
 */

// Tokens + theme.
export * from './tokens';
export { ThemeProvider, useTheme, type ThemeProviderProps } from './theme';

// Primitives.
export { AppText, type AppTextProps, type TextColorToken } from './AppText';
export { Button, type ButtonProps, type ButtonVariant } from './Button';
export { Card, type CardProps, type CardElevation } from './Card';
export { Chip, type ChipProps } from './Chip';
export { Slider, type SliderProps } from './Slider';
export { AdherenceDot, type AdherenceDotProps, type AdherenceState } from './AdherenceDot';
export { CalendarCell, type CalendarCellProps } from './CalendarCell';
export { ListRow, type ListRowProps } from './ListRow';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
export {
  ProgressRing,
  type ProgressRingProps,
  type ProgressRingColor,
  StreakIndicator,
  type StreakIndicatorProps,
} from './ProgressRing';
export { Scaffold, type ScaffoldProps } from './Scaffold';

// Flat-token + `Text` compatibility shims (see compat.tsx). These re-export the
// one canonical palette under the flat `colors` / `fontSize` / `fontWeight` /
// `radii` shape and a tone-keyed `Text`, so every screen imports from this
// single barrel instead of carrying a private kit.
export {
  colors,
  type ColorToken,
  fontSize,
  fontWeight,
  radii,
  Text,
  type TextProps,
  type TextTone,
  type TextVariant,
} from './compat';
