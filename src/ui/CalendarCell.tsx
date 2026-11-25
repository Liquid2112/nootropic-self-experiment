import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AdherenceDot, type AdherenceState } from './AdherenceDot';
import { AppText } from './AppText';
import { useTheme } from './theme';

export type CalendarCellProps = {
  /** Day-of-month number shown in the cell. */
  day: number;
  /** Adherence state rendered as a dot under the number. Omit for no dot. */
  state?: AdherenceState;
  /** Mark this cell as today (accent ring). */
  isToday?: boolean;
  /** Mark this cell as selected (filled accent). */
  selected?: boolean;
  /** Render as an empty spacer (e.g. leading blanks in a month grid). */
  blank?: boolean;
  /** Called when the cell is pressed. */
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * One cell of a month calendar: a day number with an optional adherence dot.
 * `isToday` draws an accent ring; `selected` fills the cell with the accent.
 */
export function CalendarCell({
  day,
  state,
  isToday = false,
  selected = false,
  blank = false,
  onPress,
  style,
}: CalendarCellProps) {
  const theme = useTheme();

  if (blank) {
    return <View style={[styles.cell, style]} />;
  }

  const body = (
    <View
      style={[
        styles.cell,
        {
          borderRadius: theme.radius.md,
          backgroundColor: selected ? theme.colors.textPrimary : 'transparent',
          borderColor: isToday && !selected ? theme.colors.accent : 'transparent',
          borderWidth: isToday && !selected ? 1.5 : 0,
        },
        style,
      ]}
    >
      <AppText variant="subhead" color={selected ? 'onAccent' : 'textPrimary'} center>
        {day}
      </AppText>
      {state ? <AdherenceDot state={state} size={6} style={styles.dot} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dot: {
    marginTop: 1,
  },
});
