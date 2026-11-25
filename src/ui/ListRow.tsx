import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from './AppText';
import { useTheme } from './theme';
import { lightTheme } from './tokens';

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
  /** Render as selected (accent checkmark on the trailing edge). */
  selected?: boolean;
  /** Small tag shown on the trailing edge (e.g. supplement type). */
  badge?: string;
  /** Draw a hairline divider below the row. */
  divider?: boolean;
  /** Called when the row is pressed. Makes the whole row tappable. */
  onPress?: () => void;
  /** Disable interaction and dim the row. */
  disabled?: boolean;
  /** Test id forwarded to the pressable / container. */
  testID?: string;
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
  selected = false,
  badge,
  divider = false,
  onPress,
  disabled = false,
  testID,
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
        <AppText variant="callout" style={styles.title}>{title}</AppText>
        {subtitle ? (
          <AppText variant="footnote" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.fill, borderRadius: theme.radius.sm },
          ]}
        >
          <AppText variant="caption2" color="textSecondary">
            {badge}
          </AppText>
        </View>
      ) : null}
      {trailing ? <View>{trailing}</View> : null}
      {selected ? (
        <AppText variant="body" color="accent">
          {'\u2713'}
        </AppText>
      ) : null}
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
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} disabled={disabled} onPress={onPress} testID={testID}>
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
  title: {
    fontFamily: lightTheme.typography.headline.fontFamily,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  disabled: {
    opacity: 0.4,
  },
});
