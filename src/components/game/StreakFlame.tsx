import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { gameColors, lightTheme } from '@/ui';

export type StreakFlameProps = {
  count: number;
  /** Streak alive but today not done yet: the flame pulses as a nudge. */
  atRisk?: boolean;
  size?: 'sm' | 'lg';
  style?: ViewStyle;
};

/** Flame + day count pill. Grey when there is no streak, pulsing when at risk. */
export function StreakFlame({ count, atRisk = false, size = 'sm', style }: StreakFlameProps) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!atRisk) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [atRisk, pulse]);

  const lit = count > 0;
  const big = size === 'lg';
  return (
    <View
      accessibilityLabel={`${count} day streak${atRisk ? ', check in today to keep it' : ''}`}
      style={[
        styles.pill,
        { backgroundColor: lit ? gameColors.flameMuted : lightTheme.colors.fill },
        big && styles.pillLg,
        style,
      ]}
    >
      <Animated.Text
        style={[{ fontSize: big ? 30 : 18, opacity: lit ? 1 : 0.35 }, { transform: [{ scale: pulse }] }]}
      >
        🔥
      </Animated.Text>
      <Text
        style={[
          styles.count,
          { color: lit ? gameColors.flame : lightTheme.colors.textTertiary },
          big && styles.countLg,
        ]}
      >
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillLg: { paddingHorizontal: 18, paddingVertical: 10, gap: 6 },
  count: { fontSize: 17, fontWeight: '700' },
  countLg: { fontSize: 28 },
});
