/**
 * Minimal local UI kit for the light iOS look: design tokens plus the Text,
 * Card, Button, and CalendarCell primitives the result and evidence screens
 * build on. Screens import from "@/ui" and never hardcode a color.
 *
 * This stands in for the parallel UI-kit branch, which was not yet merged when
 * these screens were built. The shape (named color roles, a spacing/type scale,
 * these primitives) matches a real kit so it can be swapped in later.
 */

export { colors, spacing, radii, typography } from './tokens';
export { Text, type TextProps, type TextVariant, type TextTone } from './Text';
export { Card, type CardProps } from './Card';
export { Button, type ButtonProps } from './Button';
export { CalendarCell, type CalendarCellProps, type DayStatus } from './CalendarCell';
