import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from './tokens';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
};

/** Pill-shaped single-select chip (goal, length, blinding mode choices). */
export function Chip({ label, selected = false, onPress, testID }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.medium,
  },
  labelUnselected: {
    color: colors.text,
  },
  labelSelected: {
    color: colors.accent,
  },
});
