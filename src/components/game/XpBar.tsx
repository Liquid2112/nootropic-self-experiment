import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { LevelInfo } from '@/features/gamification';
import { brand, fonts } from '@/ui';

export type XpBarProps = {
  level: LevelInfo;
  /** Render on a dark (ink) surface. */
  onDark?: boolean;
  style?: ViewStyle;
};

/** Level chip, title, and an animated bar filling toward the next level. */
export function XpBar({ level, onDark = false, style }: XpBarProps) {
  const [fill] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fill, { toValue: level.progress, duration: 700, useNativeDriver: false }).start();
  }, [fill, level.progress]);

  const text = onDark ? brand.white : brand.ink;
  const sub = onDark ? 'rgba(255,255,255,0.7)' : brand.muted;
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.chip, { backgroundColor: onDark ? brand.white : brand.ink }]}>
        <Text style={[styles.chipLabel, { color: onDark ? brand.muted : 'rgba(255,255,255,0.6)' }]}>LVL</Text>
        <Text style={[styles.chipText, { color: onDark ? brand.ink : brand.white }]}>{level.level}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.labels}>
          <Text style={[styles.title, { color: text }]}>{level.title}</Text>
          <Text style={[styles.xp, { color: sub }]}>
            {level.xpIntoLevel} / {level.xpForNext} XP
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: onDark ? 'rgba(255,255,255,0.18)' : brand.paperDeep }]}>
          <Animated.View
            style={[styles.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 8, lineHeight: 10, letterSpacing: 0.8, fontFamily: fonts.bold },
  chipText: { fontSize: 18, lineHeight: 21, fontFamily: fonts.display },
  body: { flex: 1, gap: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 16, fontFamily: fonts.displayBold },
  xp: { fontSize: 12, fontFamily: fonts.semibold },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: brand.sun },
});
