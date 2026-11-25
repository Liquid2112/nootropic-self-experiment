import { StyleSheet, Text, View } from 'react-native';
import type { CalendarDay } from '@/results';
import { gameColors, lightTheme } from '@/ui';

export type JourneyPathProps = {
  days: CalendarDay[];
  /** 0-based index of today in the run (-1 during baseline). */
  todayIndex: number;
  /** Baseline days still to go before day 1 (0 once the run started). */
  baselineDaysLeft: number;
  baselineDays: number;
};

const OFFSETS = [0, 46, 70, 46, 0, -46, -70, -46];

type Node =
  | { kind: 'day'; day: CalendarDay; isToday: boolean }
  | { kind: 'baseline'; n: number; done: boolean; isToday: boolean }
  | { kind: 'milestone'; emoji: string; label: string; reached: boolean };

/**
 * The run drawn as a winding trail of day stops, with a start flag, a halfway
 * star and the verdict trophy at the end. It shows only whether each day's
 * dose and check-in were done, never a score, so it can't unblind anyone.
 */
export function JourneyPath({ days, todayIndex, baselineDaysLeft, baselineDays }: JourneyPathProps) {
  const total = days.length;
  const half = Math.floor(total / 2);
  const nodes: Node[] = [];
  const baselineToday = baselineDaysLeft > 0 ? baselineDays - baselineDaysLeft : -1;
  for (let i = 0; i < baselineDays; i += 1) {
    nodes.push({ kind: 'baseline', n: i + 1, done: baselineDaysLeft === 0 || i < baselineToday, isToday: i === baselineToday });
  }
  nodes.push({ kind: 'milestone', emoji: '🏁', label: 'Run starts', reached: baselineDaysLeft === 0 });
  days.forEach((day, i) => {
    if (i === half && total > 4) {
      nodes.push({ kind: 'milestone', emoji: '⭐', label: 'Halfway', reached: todayIndex >= half });
    }
    nodes.push({ kind: 'day', day, isToday: baselineDaysLeft === 0 && day.dayIndex === todayIndex });
  });
  nodes.push({ kind: 'milestone', emoji: '🏆', label: 'Verdict', reached: total > 0 && todayIndex >= total - 1 });

  return (
    <View style={styles.path}>
      {nodes.map((node, i) => {
        const offset = OFFSETS[i % OFFSETS.length] ?? 0;
        return (
          <View key={i} style={[styles.slot, { transform: [{ translateX: offset }] }]}>
            {renderNode(node)}
          </View>
        );
      })}
    </View>
  );
}

function renderNode(node: Node) {
  if (node.kind === 'milestone') {
    return (
      <View style={styles.milestone}>
        <View style={[styles.milestoneBubble, node.reached ? styles.reached : styles.locked]}>
          <Text style={styles.milestoneEmoji}>{node.emoji}</Text>
        </View>
        <Text style={styles.milestoneLabel}>{node.label}</Text>
      </View>
    );
  }
  if (node.kind === 'baseline') {
    return (
      <Stop
        label={`B${node.n}`}
        isToday={node.isToday}
        color={node.done ? gameColors.heroEnd : node.isToday ? lightTheme.colors.accent : gameColors.locked}
        mark={node.done ? '✓' : undefined}
      />
    );
  }
  const { day, isToday } = node;
  const complete = day.status === 'taken' && day.tested;
  const partial = day.status === 'taken' || day.tested;
  let color: string = gameColors.locked;
  let mark: string | undefined;
  if (day.status === 'upcoming' && !isToday) {
    color = gameColors.locked;
  } else if (complete) {
    color = gameColors.mint;
    mark = '✓';
  } else if (partial) {
    color = lightTheme.colors.accent;
    mark = '½';
  } else if (isToday) {
    color = lightTheme.colors.accent;
  } else {
    color = '#C9C4D9';
    mark = '✕';
  }
  return <Stop label={String(day.dayNumber)} isToday={isToday} color={color} mark={mark} />;
}

function Stop({ label, isToday, color, mark }: { label: string; isToday: boolean; color: string; mark?: string }) {
  return (
    <View style={[styles.ring, isToday && styles.todayRing]}>
      <View style={[styles.stop, { backgroundColor: color }]}>
        <Text style={styles.stopText}>{mark ?? label}</Text>
      </View>
      {isToday ? (
        <View style={styles.todayTag}>
          <Text style={styles.todayTagText}>TODAY</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  path: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  slot: { alignItems: 'center' },
  ring: { padding: 4, borderRadius: 40, borderWidth: 3, borderColor: 'transparent', alignItems: 'center' },
  todayRing: { borderColor: lightTheme.colors.accent },
  stop: {
    width: 58,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },
  stopText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  todayTag: {
    position: 'absolute',
    top: -14,
    backgroundColor: lightTheme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  todayTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  milestone: { alignItems: 'center', gap: 2 },
  milestoneBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  reached: { backgroundColor: gameColors.xpMuted, borderColor: gameColors.xp },
  locked: { backgroundColor: lightTheme.colors.fill, borderColor: gameColors.locked },
  milestoneEmoji: { fontSize: 30 },
  milestoneLabel: { fontSize: 12, fontWeight: '700', color: lightTheme.colors.textSecondary },
});
