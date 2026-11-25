import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';
import type { Theme } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  /** Visual weight. `primary` is filled accent, `secondary` is outlined, `subtle` is a tinted fill. */
  variant?: ButtonVariant;
  /** Button label. */
  label: string;
  /** Disable interaction and dim the control. */
  disabled?: boolean;
  /** Show a spinner and block interaction while an action runs. */
  loading?: boolean;
  /** Stretch to the width of the parent. */
  fullWidth?: boolean;
  style?: ViewStyle;
};

type VariantColors = {
  background: string;
  backgroundPressed: string;
  border: string;
  text: 'onAccent' | 'accent' | 'textPrimary';
  spinner: string;
};

function variantColors(theme: Theme, variant: ButtonVariant): VariantColors {
  switch (variant) {
    case 'primary':
      // Ink buttons: the brand's primary action is near-black, which keeps Tang
      // free to mean "signature / reward" instead of "every button".
      return {
        background: theme.colors.textPrimary,
        backgroundPressed: '#2B2836',
        border: theme.colors.textPrimary,
        text: 'onAccent',
        spinner: theme.colors.onAccent,
      };
    case 'secondary':
      return {
        background: theme.colors.surface,
        backgroundPressed: theme.colors.fill,
        border: theme.colors.border,
        text: 'textPrimary',
        spinner: theme.colors.accent,
      };
    case 'subtle':
      return {
        background: theme.colors.fill,
        backgroundPressed: theme.colors.border,
        border: theme.colors.fill,
        text: 'textPrimary',
        spinner: theme.colors.textPrimary,
      };
  }
}

/**
 * Tactile action button. Pressing it darkens the fill; `disabled` dims it and
 * blocks touches; `loading` swaps the label for a spinner and also blocks
 * touches so the action cannot be fired twice.
 */
export function Button({
  variant = 'primary',
  label,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const colors = variantColors(theme, variant);
  const isInactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      {...rest}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.base,
            {
              backgroundColor: pressed ? colors.backgroundPressed : colors.background,
              borderColor: colors.border,
              borderRadius: theme.radius.pill,
              paddingVertical: theme.spacing.md,
              transform: [{ translateY: pressed && !isInactive ? 2 : 0 }],
              paddingHorizontal: theme.spacing.xl,
            },
            fullWidth ? styles.fullWidth : null,
            disabled ? styles.disabled : null,
            style,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.spinner} />
          ) : (
            <AppText variant="headline" color={colors.text} center>
              {label}
            </AppText>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 54,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
});
