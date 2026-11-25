import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon } from '@/brand';
import { brand, fonts } from '@/ui';

export type StreakFlameProps = {
  count: number;
  /** Streak alive but today not done yet: the flame pulses as a nudge. */
  atRisk?: boolean;
  size?: 'sm' | 'lg';
  style?: ViewStyle;
};

/** Flame + day count pill. Quiet grey with no streak, pulsing when at risk. */
export function StreakFlame({ count, atRisk = false, size = 'sm', style }: StreakFlameProps) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!atRisk) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [atRisk, pulse]);

  const lit = count > 0;
  const big = size === 'lg';
  const color = lit ? brand.tang : brand.faint;
  return (
    <View
      accessibilityLabel={`${count} day streak${atRisk ? ', check in today to keep it' : ''}`}
      style={[styles.pill, { backgroundColor: lit ? brand.tangSoft : brand.paperDeep }, big && styles.pillLg, style]}
    >
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Icon name="flame" size={big ? 28 : 18} color={color} strokeWidth={2.4} />
      </Animated.View>
      <Text style={[styles.count, { color }, big && styles.countLg]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillLg: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  count: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display },
  countLg: { fontSize: 28, lineHeight: 32 },
});
