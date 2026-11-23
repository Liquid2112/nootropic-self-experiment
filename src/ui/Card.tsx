import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from './tokens';

export type CardProps = {
  children: ReactNode;
  /** Use the alt surface (e.g. a nested field) instead of the raised card. */
  variant?: 'raised' | 'flat';
  style?: ViewStyle;
  testID?: string;
};

/** Rounded card with gentle depth, the grouped-content surface of the kit. */
export function Card({ children, variant = 'raised', style, testID }: CardProps) {
  return (
    <View
      testID={testID}
      style={[styles.base, variant === 'raised' ? styles.raised : styles.flat, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  raised: {
    ...shadow,
  },
  flat: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
