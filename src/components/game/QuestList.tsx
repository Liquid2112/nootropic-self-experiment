import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/brand';
import type { Quest } from '@/features/gamification';
import { brand, fonts } from '@/ui';
import { QUEST_ICON } from './questIcons';

export type QuestListProps = {
  quests: Quest[];
  onPressQuest?: (quest: Quest) => void;
};

/** Today's quests as tappable rows with a status bubble and XP reward. */
export function QuestList({ quests, onPressQuest }: QuestListProps) {
  return (
    <View style={styles.list}>
      {quests.map((q, i) => (
        <Pressable
          key={q.id}
          accessibilityRole="button"
          accessibilityState={{ checked: q.done }}
          accessibilityLabel={`${q.title}, ${q.done ? 'done' : `${q.xp} XP`}`}
          disabled={q.done || !onPressQuest}
          onPress={() => onPressQuest?.(q)}
          style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}
        >
          <View style={[styles.bubble, q.done && styles.bubbleDone]}>
            <Icon name={q.done ? 'check' : QUEST_ICON[q.id]} size={18} color={q.done ? brand.white : brand.ink} strokeWidth={q.done ? 2.6 : 2} />
          </View>
          <Text style={[styles.title, q.done && styles.titleDone]} numberOfLines={1}>
            {q.title}
          </Text>
          {q.done ? (
            <Text style={styles.doneText}>Done</Text>
          ) : (
            <View style={styles.xp}>
              <Text style={styles.xpText}>{`+${q.xp} XP`}</Text>
            </View>
          )}
          {!q.done && onPressQuest ? <Icon name="chevronRight" size={16} color={brand.faint} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.line },
  pressed: { opacity: 0.6 },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleDone: { backgroundColor: brand.mint },
  title: { flex: 1, fontSize: 16, fontFamily: fonts.semibold, color: brand.ink },
  titleDone: { color: brand.muted },
  xp: { backgroundColor: brand.sunSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  xpText: { fontSize: 12, fontFamily: fonts.bold, color: brand.sunDeep },
  doneText: { fontSize: 13, fontFamily: fonts.semibold, color: brand.mint },
});
