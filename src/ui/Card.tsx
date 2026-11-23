import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from './tokens';

export type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A rounded surface with gentle depth. The daily hub groups each concern
 * (instruction, dose, test entry) into its own card.
 */
export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    // Gentle elevation. Shadow props are no-ops on platforms that ignore them.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
