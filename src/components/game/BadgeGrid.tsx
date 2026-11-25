import { StyleSheet, Text, View } from 'react-native';
import { BADGES } from '@/features/gamification';
import { gameColors, lightTheme } from '@/ui';

export type BadgeGridProps = {
  unlocked: string[];
  /** Show only the first N badges (unlocked first). */
  limit?: number;
};

/** Every badge, unlocked ones in color and locked ones greyed with their goal. */
export function BadgeGrid({ unlocked, limit }: BadgeGridProps) {
  const have = new Set(unlocked);
  const ordered = [...BADGES].sort((a, b) => Number(have.has(b.id)) - Number(have.has(a.id)));
  const shown = limit ? ordered.slice(0, limit) : ordered;
  return (
    <View style={styles.grid}>
      {shown.map((b) => {
        const on = have.has(b.id);
        return (
          <View
            key={b.id}
            style={styles.item}
            accessibilityLabel={`${b.title}: ${b.description}${on ? ' Unlocked.' : ' Locked.'}`}
          >
            <View style={[styles.medal, on ? styles.medalOn : styles.medalOff]}>
              <Text style={[styles.emoji, !on && styles.emojiOff]}>{on ? b.emoji : '🔒'}</Text>
            </View>
            <Text style={[styles.title, !on && styles.off]} numberOfLines={2}>
              {b.title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {b.description}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  item: { width: '33.33%', alignItems: 'center', paddingHorizontal: 4, gap: 4 },
  medal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  medalOn: { backgroundColor: gameColors.xpMuted, borderColor: gameColors.xp },
  medalOff: { backgroundColor: lightTheme.colors.fill, borderColor: gameColors.locked },
  emoji: { fontSize: 28 },
  emojiOff: { fontSize: 20, opacity: 0.6 },
  title: { fontSize: 13, fontWeight: '700', textAlign: 'center', color: lightTheme.colors.textPrimary },
  off: { color: lightTheme.colors.textSecondary },
  desc: { fontSize: 11, textAlign: 'center', color: lightTheme.colors.textTertiary },
});
