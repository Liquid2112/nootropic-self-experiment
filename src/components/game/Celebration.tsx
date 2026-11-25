import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { GameState, ProgressDelta } from '@/features/gamification';
import { Button, gameColors, lightTheme } from '@/ui';
import { Confetti } from './Confetti';
import { StreakFlame } from './StreakFlame';
import { XpBar } from './XpBar';
import { celebrate } from './haptics';

export type CelebrationProps = {
  title: string;
  subtitle?: string;
  delta: ProgressDelta;
  game: GameState;
  /** Shown above the button, e.g. "See you tomorrow". */
  footnote?: string;
  /** Main button label. */
  actionLabel?: string;
  onContinue: () => void;
  /** Extra content between the rewards and the button. */
  children?: React.ReactNode;
};

/**
 * Full-screen reward moment: confetti, the XP earned counting up, the streak,
 * the level bar, any level-up and newly unlocked badges. Used after a check-in
 * and after a reaction test.
 */
export function Celebration({
  title,
  subtitle,
  delta,
  game,
  footnote,
  actionLabel = 'Continue',
  onContinue,
  children,
}: CelebrationProps) {
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    celebrate();
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [pop]);

  const [levelPop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (delta.levelUp !== null) {
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(levelPop, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      ]).start();
    }
  }, [delta.levelUp, levelPop]);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Animated.View style={[styles.hero, { transform: [{ scale: pop }] }]}>
          <Text style={styles.trophy}>{delta.levelUp !== null ? '🚀' : delta.newBadges.length ? '🏅' : '🎉'}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>

        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: gameColors.xpMuted }]}>
            <Text style={styles.statLabel}>XP EARNED</Text>
            <Text style={[styles.statValue, { color: '#B07A00' }]}>+{delta.xpGained}</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: gameColors.flameMuted }]}>
            <Text style={styles.statLabel}>{delta.streakGrew ? 'STREAK UP' : 'STREAK'}</Text>
            <StreakFlame count={delta.streak} style={styles.flame} />
          </View>
        </View>

        <View style={styles.card}>
          <XpBar level={game.level} />
          {delta.levelUp !== null ? (
            <Animated.View style={[styles.levelUp, { transform: [{ scale: levelPop }] }]}>
              <Text style={styles.levelUpText}>
                Level up! You&apos;re now level {delta.levelUp}: {game.level.title}
              </Text>
            </Animated.View>
          ) : null}
        </View>

        {delta.newBadges.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {delta.newBadges.length === 1 ? 'New badge unlocked' : `${delta.newBadges.length} new badges`}
            </Text>
            {delta.newBadges.map((b) => (
              <View key={b.id} style={styles.badgeRow}>
                <View style={styles.badgeMedal}>
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                </View>
                <View style={styles.badgeText}>
                  <Text style={styles.badgeTitle}>{b.title}</Text>
                  <Text style={styles.badgeDesc}>{b.description}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {children}
      </View>

      <View style={styles.footer}>
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
        <Button label={actionLabel} onPress={onContinue} fullWidth />
      </View>
      <Confetti count={delta.levelUp !== null || delta.newBadges.length ? 110 : 70} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTheme.colors.background, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 32 },
  content: { flex: 1, gap: 16 },
  hero: { alignItems: 'center', gap: 6 },
  trophy: { fontSize: 64 },
  title: { fontSize: 30, fontWeight: '800', color: lightTheme.colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 16, color: lightTheme.colors.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderRadius: 20, padding: 14, alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: lightTheme.colors.textSecondary },
  statValue: { fontSize: 30, fontWeight: '800' },
  flame: { backgroundColor: 'transparent' },
  card: { backgroundColor: lightTheme.colors.surface, borderRadius: 20, padding: 16, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: lightTheme.colors.textPrimary },
  levelUp: { backgroundColor: lightTheme.colors.accentMuted, borderRadius: 12, padding: 10 },
  levelUpText: { fontSize: 15, fontWeight: '700', color: lightTheme.colors.accent, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeMedal: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: gameColors.xpMuted,
    borderWidth: 3,
    borderColor: gameColors.xp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 22 },
  badgeText: { flex: 1 },
  badgeTitle: { fontSize: 16, fontWeight: '700', color: lightTheme.colors.textPrimary },
  badgeDesc: { fontSize: 13, color: lightTheme.colors.textSecondary },
  footer: { gap: 10 },
  footnote: { fontSize: 14, color: lightTheme.colors.textSecondary, textAlign: 'center' },
});
