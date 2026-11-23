import { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from './tokens';

export type ScaffoldProps = {
  children: ReactNode;
  /** Scroll the content (default) or pin it full-screen (the test flow). */
  scroll?: boolean;
  /** Use the dark, distraction-free surface (the test flow). */
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Page container that applies safe-area insets and the app background. The
 * daily hub scrolls; the test flow pins content on the inverse surface.
 */
export function Scaffold({
  children,
  scroll = true,
  inverse = false,
  style,
  contentContainerStyle,
}: ScaffoldProps) {
  const insets = useSafeAreaInsets();
  const background = inverse ? colors.surfaceInverse : colors.background;
  const padding = {
    paddingTop: insets.top + spacing.md,
    paddingBottom: insets.bottom + spacing.lg,
    paddingHorizontal: spacing.md,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex, { backgroundColor: background }, style]}
        contentContainerStyle={[styles.scrollContent, padding, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[styles.flex, styles.pinned, { backgroundColor: background }, padding, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
  },
  pinned: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
});
