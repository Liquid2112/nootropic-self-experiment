import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from './tokens';

export type SliderOption<T extends string | number> = {
  value: T;
  label: string;
};

export type SliderProps<T extends string | number> = {
  /** Discrete, ordered options the thumb can rest on. */
  options: SliderOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

/**
 * Discrete stepped selector rendered as a labelled track of tappable steps.
 *
 * The MVP needs an ordered choice among a handful of options (test-time window),
 * not a continuous analog value, so this is a stepped control rather than a
 * free-drag slider. Keeping it discrete avoids a native-slider dependency and
 * stays fully testable as pure option selection.
 */
export function Slider<T extends string | number>({
  options,
  value,
  onChange,
  testID,
}: SliderProps<T>) {
  return (
    <View style={styles.track} testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${String(option.value)}` : undefined}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.step,
              selected ? styles.stepSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.stepLabel, selected ? styles.stepLabelSelected : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  stepSelected: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  stepLabel: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  stepLabelSelected: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
});
