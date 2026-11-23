/**
 * Light iOS-style UI kit. A MINIMAL local kit shipped with the onboarding flow:
 * the shared `@/ui` branch is not available to merge yet, so screens import the
 * primitives and tokens they need from here instead of hardcoding styling. If
 * the shared kit lands later it can replace this module without touching the
 * screens, since they depend only on `@/ui`.
 */

export * from './tokens';
export { Button, type ButtonProps, type ButtonVariant } from './Button';
export { Card, type CardProps } from './Card';
export { Chip, type ChipProps } from './Chip';
export { Slider, type SliderProps, type SliderOption } from './Slider';
export { ListRow, type ListRowProps } from './ListRow';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
export { Scaffold, type ScaffoldProps } from './Scaffold';
