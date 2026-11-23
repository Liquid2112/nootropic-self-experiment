import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from './theme';

export type ScaffoldProps = {
  children: ReactNode;
  /** Scroll the content vertically. Defaults to true. */
  scroll?: boolean;
  /** Which safe-area edges to inset. Defaults to top + bottom. */
  edges?: readonly Edge[];
  /** Override the default screen horizontal/vertical padding. */
  contentStyle?: ViewStyle;
  /** Fixed element pinned to the bottom (e.g. a primary action button). */
  footer?: ReactNode;
  /** Use the dark, full-bleed inverse background (distraction-free screens). */
  inverse?: boolean;
  /** Test id forwarded to the safe-area container. */
  testID?: string;
  style?: ViewStyle;
};

const DEFAULT_EDGES: readonly Edge[] = ['top', 'bottom'];

/**
 * Screen container: fills the screen with the app background, applies the
 * safe-area insets and a consistent content padding, and optionally scrolls.
 * A `footer` stays pinned below the (scrolling) content. Every screen wraps its
 * body in a Scaffold so padding and safe areas are uniform app-wide.
 */
export function Scaffold({
  children,
  scroll = true,
  edges = DEFAULT_EDGES,
  contentStyle,
  footer,
  inverse = false,
  testID,
  style,
}: ScaffoldProps) {
  const theme = useTheme();
  const backgroundColor = inverse ? theme.colors.textPrimary : theme.colors.background;
  const padding: ViewStyle = {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      testID={testID}
      style={[styles.flex, { backgroundColor }, style]}
    >
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              paddingBottom: theme.spacing.lg,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
