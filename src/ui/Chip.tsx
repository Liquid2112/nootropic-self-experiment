import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';

export type ChipProps = {
  /** Chip label. */
  label: string;
  /** Whether the chip is currently selected. */
  selected?: boolean;
  /** Disable interaction and dim the chip. */
  disabled?: boolean;
  /** Called when the chip is pressed. */
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Selectable pill, used for single- or multi-select pickers such as the goal
 * chooser. Selected chips fill with the muted accent and show accent text; the
 * press is exposed through `onPress` so the parent owns selection state.
 */
export function Chip({ label, selected = false, disabled = false, onPress, style }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.base,
            {
              borderRadius: theme.radius.pill,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surface,
              borderColor: selected ? theme.colors.accent : theme.colors.border,
            },
            pressed && !selected ? { backgroundColor: theme.colors.fill } : null,
            disabled ? styles.disabled : null,
            style,
          ]}
        >
          <AppText variant="subhead" color={selected ? 'accent' : 'textPrimary'}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  disabled: {
    opacity: 0.4,
  },
});
