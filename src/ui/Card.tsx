import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from './tokens';

/**
 * Rounded surface with gentle depth, the grouped-content container for the
 * light iOS look. Content is laid out with the standard card padding; pass
 * `style` to override only layout (not color).
 */
export type CardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    // Gentle, precise depth rather than a heavy drop shadow.
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
