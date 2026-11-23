import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from './tokens';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Small trailing text (e.g. a type tag). */
  badge?: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional custom trailing element. */
  trailing?: ReactNode;
  testID?: string;
};

/** Tappable list row with a title, optional subtitle, and trailing badge. */
export function ListRow({
  title,
  subtitle,
  badge,
  selected = false,
  onPress,
  trailing,
  testID,
}: ListRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      disabled={onPress === undefined}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.selected : null,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  selected: {
    backgroundColor: colors.accentSoft,
  },
  pressed: {
    opacity: 0.6,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
});
