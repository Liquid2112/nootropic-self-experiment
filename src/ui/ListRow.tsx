import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from './AppText';
import { useTheme } from './theme';

export type ListRowProps = {
  /** Primary row label. */
  title: string;
  /** Optional secondary line under the title. */
  subtitle?: string;
  /** Optional element on the leading edge (icon, dot, avatar). */
  leading?: ReactNode;
  /** Optional element on the trailing edge (value text, switch, chevron). */
  trailing?: ReactNode;
  /** Show a chevron on the trailing edge to signal navigation. */
  showChevron?: boolean;
  /** Draw a hairline divider below the row. */
  divider?: boolean;
  /** Called when the row is pressed. Makes the whole row tappable. */
  onPress?: () => void;
  /** Disable interaction and dim the row. */
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * Grouped-list row in the iOS settings idiom: leading accessory, a title with
 * an optional subtitle, and a trailing accessory or chevron. Used inside a
 * `Card` to form a grouped list.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  showChevron = false,
  divider = false,
  onPress,
  disabled = false,
  style,
}: ListRowProps) {
  const theme = useTheme();

  const content = ({ pressed }: { pressed: boolean }) => (
    <View
      style={[
        styles.row,
        {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.md,
          backgroundColor: pressed && onPress ? theme.colors.fill : 'transparent',
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: theme.colors.border,
        },
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {leading ? <View>{leading}</View> : null}
      <View style={styles.textCol}>
        <AppText variant="body">{title}</AppText>
        {subtitle ? (
          <AppText variant="footnote" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
      {showChevron ? (
        <AppText variant="body" color="textTertiary">
          {'\u203A'}
        </AppText>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content({ pressed: false });
  }
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  disabled: {
    opacity: 0.4,
  },
});
