import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { LevelInfo } from '@/features/gamification';
import { gameColors, lightTheme } from '@/ui';

export type XpBarProps = {
  level: LevelInfo;
  /** Render on a dark/colored hero background. */
  onDark?: boolean;
  style?: ViewStyle;
};

/** Level medallion, title, and an animated bar filling toward the next level. */
export function XpBar({ level, onDark = false, style }: XpBarProps) {
  const [fill] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fill, { toValue: level.progress, duration: 700, useNativeDriver: false }).start();
  }, [fill, level.progress]);

  const text = onDark ? '#FFFFFF' : lightTheme.colors.textPrimary;
  const sub = onDark ? 'rgba(255,255,255,0.8)' : lightTheme.colors.textSecondary;
  return (
    <View style={[styles.row, style]}>
      <View style={styles.medal}>
        <Text style={styles.medalText}>{level.level}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.labels}>
          <Text style={[styles.title, { color: text }]}>{level.title}</Text>
          <Text style={[styles.xp, { color: sub }]}>
            {level.xpIntoLevel} / {level.xpForNext} XP
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: onDark ? 'rgba(255,255,255,0.25)' : lightTheme.colors.fill }]}>
          <Animated.View
            style={[
              styles.fill,
              { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: gameColors.xp,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  medalText: { fontSize: 18, fontWeight: '800', color: gameColors.violetDeep },
  body: { flex: 1, gap: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 16, fontWeight: '700' },
  xp: { fontSize: 12, fontWeight: '600' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: gameColors.xp },
});
