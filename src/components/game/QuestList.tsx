import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Quest } from '@/features/gamification';
import { gameColors, lightTheme } from '@/ui';

export type QuestListProps = {
  quests: Quest[];
  onPressQuest?: (quest: Quest) => void;
};

/** Today's quests as tappable rows with a check bubble and XP reward. */
export function QuestList({ quests, onPressQuest }: QuestListProps) {
  return (
    <View style={styles.list}>
      {quests.map((q) => (
        <Pressable
          key={q.id}
          accessibilityRole="button"
          accessibilityState={{ checked: q.done }}
          accessibilityLabel={`${q.title}, ${q.done ? 'done' : `${q.xp} XP`}`}
          disabled={q.done || !onPressQuest}
          onPress={() => onPressQuest?.(q)}
          style={({ pressed }) => [styles.row, q.done && styles.rowDone, pressed && styles.pressed]}
        >
          <View style={[styles.check, q.done ? styles.checkDone : null]}>
            <Text style={styles.checkText}>{q.done ? '✓' : q.emoji}</Text>
          </View>
          <Text style={[styles.title, q.done && styles.titleDone]} numberOfLines={1}>
            {q.title}
          </Text>
          <View style={[styles.xp, q.done && styles.xpDone]}>
            <Text style={[styles.xpText, q.done && styles.xpTextDone]}>
              {q.done ? 'Done' : `+${q.xp} XP`}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: lightTheme.colors.background,
  },
  rowDone: { backgroundColor: gameColors.mintMuted },
  pressed: { opacity: 0.7 },
  check: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: lightTheme.colors.border,
  },
  checkDone: { backgroundColor: gameColors.mint, borderColor: gameColors.mint },
  checkText: { fontSize: 17, color: '#FFFFFF', fontWeight: '800' },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: lightTheme.colors.textPrimary },
  titleDone: { color: lightTheme.colors.textSecondary, textDecorationLine: 'line-through' },
  xp: { backgroundColor: gameColors.xpMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  xpDone: { backgroundColor: 'transparent' },
  xpText: { fontSize: 12, fontWeight: '800', color: '#B07A00' },
  xpTextDone: { color: gameColors.mint },
});
