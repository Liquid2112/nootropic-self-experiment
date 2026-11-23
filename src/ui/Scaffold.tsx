import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from './tokens';

export type ScaffoldProps = {
  children: ReactNode;
  /** Content pinned to the bottom (e.g. a primary action), outside the scroll. */
  footer?: ReactNode;
  scrollable?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
};

/**
 * Screen frame: safe-area aware background with a scrollable content region and
 * an optional pinned footer. Mobile-first; every screen in the flow uses it so
 * padding and background stay consistent.
 */
export function Scaffold({
  children,
  footer,
  scrollable = true,
  contentStyle,
  testID,
}: ScaffoldProps) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );
  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]} testID={testID}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
