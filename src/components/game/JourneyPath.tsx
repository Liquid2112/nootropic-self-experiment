import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/brand';
import type { CalendarDay } from '@/results';
import { brand, fonts } from '@/ui';

export type JourneyPathProps = {
  days: CalendarDay[];
  /** 0-based index of today in the run (-1 during baseline). */
  todayIndex: number;
  /** Baseline days still to go before day 1 (0 once the run started). */
  baselineDaysLeft: number;
  baselineDays: number;
};

const OFFSETS = [0, 44, 66, 44, 0, -44, -66, -44];

type Node =
  | { kind: 'day'; day: CalendarDay; isToday: boolean }
  | { kind: 'baseline'; n: number; done: boolean; isToday: boolean }
  | { kind: 'milestone'; icon: IconName; label: string; reached: boolean };

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
  nodes.push({ kind: 'milestone', icon: 'flag', label: 'Run starts', reached: baselineDaysLeft === 0 });
  days.forEach((day, i) => {
    if (i === half && total > 4) {
      nodes.push({ kind: 'milestone', icon: 'star', label: 'Halfway', reached: todayIndex >= half });
    }
    nodes.push({ kind: 'day', day, isToday: baselineDaysLeft === 0 && day.dayIndex === todayIndex });
  });
  nodes.push({ kind: 'milestone', icon: 'trophy', label: 'Verdict', reached: total > 0 && todayIndex >= total - 1 });

  return (
    <View style={styles.path}>
      {nodes.map((node, i) => (
        <View key={i} style={[styles.slot, { transform: [{ translateX: OFFSETS[i % OFFSETS.length] ?? 0 }] }]}>
          {renderNode(node)}
        </View>
      ))}
    </View>
  );
}

function renderNode(node: Node) {
  if (node.kind === 'milestone') {
    return (
      <View style={styles.milestone}>
        <View style={[styles.milestoneBubble, node.reached ? styles.reached : styles.locked]}>
          <Icon name={node.icon} size={26} color={node.reached ? brand.sun : brand.faint} strokeWidth={2.2} />
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
        color={node.done ? brand.lilac : node.isToday ? brand.ink : brand.paperDeep}
        icon={node.done ? 'check' : undefined}
        dim={!node.done && !node.isToday}
      />
    );
  }
  const { day, isToday } = node;
  const complete = day.status === 'taken' && day.tested;
  const partial = day.status === 'taken' || day.tested;
  if (day.status === 'upcoming' && !isToday) {
    return <Stop label={String(day.dayNumber)} isToday={false} color={brand.paperDeep} dim />;
  }
  if (complete) return <Stop label="" isToday={isToday} color={brand.mint} icon="check" />;
  if (partial) return <Stop label={String(day.dayNumber)} isToday={isToday} color={brand.sun} />;
  if (isToday) return <Stop label={String(day.dayNumber)} isToday color={brand.ink} />;
  return <Stop label="" isToday={false} color="#D8D2C6" icon="close" />;
}

function Stop({
  label,
  isToday,
  color,
  icon,
  dim = false,
}: {
  label: string;
  isToday: boolean;
  color: string;
  icon?: IconName;
  dim?: boolean;
}) {
  const fg = dim ? brand.faint : color === brand.sun || color === brand.lilac ? brand.ink : brand.white;
  return (
    <View style={[styles.ring, isToday && styles.todayRing]}>
      <View style={[styles.stop, { backgroundColor: color }]}>
        {icon ? <Icon name={icon} size={22} color={fg} strokeWidth={2.8} /> : <Text style={[styles.stopText, { color: fg }]}>{label}</Text>}
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
  path: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  slot: { alignItems: 'center' },
  ring: { padding: 4, borderRadius: 40, borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center' },
  todayRing: { borderColor: brand.tang },
  stop: {
    width: 56,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(21,19,28,0.12)',
  },
  stopText: { fontSize: 17, fontFamily: fonts.display },
  todayTag: {
    position: 'absolute',
    top: -12,
    backgroundColor: brand.tang,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  todayTagText: { color: brand.white, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.5 },
  milestone: { alignItems: 'center', gap: 4 },
  milestoneBubble: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reached: { backgroundColor: brand.ink },
  locked: { backgroundColor: brand.paper, borderWidth: 1.5, borderColor: brand.line, borderStyle: 'dashed' },
  milestoneLabel: { fontSize: 12, fontFamily: fonts.semibold, color: brand.muted },
});
