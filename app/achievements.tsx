import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getDatabase } from '@/db';
import { BADGES, loadGameState, type GameState } from '@/features/gamification';
import { BadgeGrid, StreakFlame, XpBar } from '@/components/game';
import { Card, Scaffold, brand, fonts } from '@/ui';

/**
 * Achievements: level and XP, streak records, lifetime counts and the full
 * badge cabinet. Every number is a count of actions taken, never a score from
 * a check-in, so it is safe to look at mid-run.
 */
export default function AchievementsScreen() {
  const [game, setGame] = useState<GameState>(() => loadGameState(getDatabase()));
  useFocusEffect(
    useCallback(() => {
      setGame(loadGameState(getDatabase()));
    }, []),
  );

  return (
    <Scaffold>
      <Card style={styles.card}>
        <XpBar level={game.level} />
        <Text style={styles.muted}>{`${game.stats.totalXp} XP earned in total`}</Text>
      </Card>

      <View style={styles.row}>
        <View style={styles.tile}>
          <StreakFlame count={game.streak.current} atRisk={game.streak.atRisk} size="lg" style={styles.clear} />
          <Text style={styles.tileLabel}>Current streak</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.big}>{game.streak.longest}</Text>
          <Text style={styles.tileLabel}>Longest streak</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Stat value={game.stats.checkIns} label="Check-ins" />
        <Stat value={game.stats.doses} label="Doses logged" />
        <Stat value={game.stats.perfectDays} label="Perfect days" />
        <Stat value={game.stats.quickTests} label="Reaction tests" />
      </View>

      <Card style={styles.card}>
        <View style={styles.badgeHeader}>
          <Text style={styles.title}>Badges</Text>
          <Text style={styles.count}>{`${game.badges.length} of ${BADGES.length}`}</Text>
        </View>
        <BadgeGrid unlocked={game.badges} />
      </Card>
    </Scaffold>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  clear: { backgroundColor: 'transparent' },
  big: { fontSize: 36, lineHeight: 42, fontFamily: fonts.display, letterSpacing: -0.8, color: brand.ink },
  tileLabel: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  stat: {
    flex: 1,
    backgroundColor: brand.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  statValue: { fontSize: 22, lineHeight: 27, fontFamily: fonts.display, color: brand.ink },
  statLabel: { fontSize: 11, lineHeight: 14, fontFamily: fonts.medium, color: brand.muted, textAlign: 'center' },
  badgeHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 20, lineHeight: 25, fontFamily: fonts.displayBold, color: brand.ink },
  count: { fontSize: 13, fontFamily: fonts.semibold, color: brand.muted },
  muted: { fontSize: 14, fontFamily: fonts.regular, color: brand.muted },
});
