/**
 * Minimal local UI kit. Screens import primitives and tokens from "@/ui" and
 * never hardcode a color, spacing, or radius. This stands in for the shared
 * ui-kit branch (not yet merged when the daily loop was built); when that lands
 * the exports here can be reconciled without changing a screen.
 */
export { colors, spacing, radius, typography } from './tokens';
export type { ColorToken } from './tokens';

export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Scaffold } from './Scaffold';
export type { ScaffoldProps } from './Scaffold';

export { Slider } from './Slider';
export type { SliderProps } from './Slider';

export { ProgressRing, StreakIndicator } from './ProgressRing';
export type { ProgressRingProps, StreakIndicatorProps } from './ProgressRing';
