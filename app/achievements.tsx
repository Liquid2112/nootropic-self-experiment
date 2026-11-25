import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getDatabase } from '@/db';
import { BADGES, loadGameState, type GameState } from '@/features/gamification';
import { BadgeGrid, StreakFlame, XpBar } from '@/components/game';
import { Card, Scaffold, gameColors, lightTheme } from '@/ui';

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
        <View style={[styles.tile, { backgroundColor: gameColors.flameMuted }]}>
          <StreakFlame count={game.streak.current} atRisk={game.streak.atRisk} size="lg" style={styles.clear} />
          <Text style={styles.tileLabel}>Current streak</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: lightTheme.colors.accentMuted }]}>
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
        <Text style={styles.title}>{`Badges  ·  ${game.badges.length} of ${BADGES.length}`}</Text>
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

const c = lightTheme.colors;
const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', gap: 6 },
  clear: { backgroundColor: 'transparent' },
  big: { fontSize: 40, fontWeight: '800', color: c.accent },
  tileLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
  stat: { flex: 1, backgroundColor: c.surface, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: c.textPrimary },
  statLabel: { fontSize: 11, color: c.textSecondary, textAlign: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  muted: { fontSize: 14, color: c.textSecondary },
});
