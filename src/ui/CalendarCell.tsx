import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radii } from './tokens';

/**
 * One day cell in the adherence calendar. It shows the day number, a fill that
 * encodes taken vs missed vs scheduled-future, and a small ring when a test was
 * logged that day. It never shows any metric value, so the calendar cannot leak
 * a trend and unblind the user mid-run.
 */
export type DayStatus = 'taken' | 'missed' | 'upcoming' | 'baseline';

export type CalendarCellProps = {
  /** 1-based day number shown to the user. */
  dayNumber: number;
  status: DayStatus;
  /** Draw the test-done ring. */
  tested: boolean;
};

const FILL: Record<DayStatus, string> = {
  taken: colors.taken,
  missed: colors.missed,
  upcoming: colors.surfaceMuted,
  baseline: colors.surfaceMuted,
};

export function CalendarCell({ dayNumber, status, tested }: CalendarCellProps) {
  const solid = status === 'taken' || status === 'missed';
  return (
    <View
      accessibilityLabel={`Day ${dayNumber}: ${status}${tested ? ', test done' : ''}`}
      style={[
        styles.cell,
        { backgroundColor: FILL[status] },
        tested ? { borderWidth: 2, borderColor: colors.tested } : null,
      ]}
    >
      <Text variant="caption" tone={solid ? 'primary' : 'tertiary'} style={solid ? styles.solidText : undefined}>
        {dayNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidText: {
    color: colors.onAccent,
    fontWeight: '600',
  },
});
