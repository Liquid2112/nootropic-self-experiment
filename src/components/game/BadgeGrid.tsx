import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/brand';
import { BADGES } from '@/features/gamification';
import { brand, fonts } from '@/ui';
import { BADGE_ICON } from './questIcons';

export type BadgeGridProps = {
  unlocked: string[];
  /** Show only the first N badges (unlocked first). */
  limit?: number;
};

/** Every badge: unlocked ones as ink medals, locked ones as faint outlines. */
export function BadgeGrid({ unlocked, limit }: BadgeGridProps) {
  const have = new Set(unlocked);
  const ordered = [...BADGES].sort((a, b) => Number(have.has(b.id)) - Number(have.has(a.id)));
  const shown = limit ? ordered.slice(0, limit) : ordered;
  return (
    <View style={styles.grid}>
      {shown.map((b) => {
        const on = have.has(b.id);
        return (
          <View key={b.id} style={styles.item} accessibilityLabel={`${b.title}: ${b.description}${on ? ' Unlocked.' : ' Locked.'}`}>
            <View style={[styles.medal, on ? styles.medalOn : styles.medalOff]}>
              <Icon name={on ? (BADGE_ICON[b.id] ?? 'medal') : 'lock'} size={on ? 26 : 20} color={on ? brand.sun : brand.faint} strokeWidth={on ? 2.2 : 2} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  item: { width: '33.33%', alignItems: 'center', paddingHorizontal: 4, gap: 4 },
  medal: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  medalOn: { backgroundColor: brand.ink },
  medalOff: { backgroundColor: brand.paper, borderWidth: 1.5, borderColor: brand.line, borderStyle: 'dashed' },
  title: { fontSize: 13, fontFamily: fonts.semibold, textAlign: 'center', color: brand.ink },
  off: { color: brand.muted },
  desc: { fontSize: 12, lineHeight: 15, fontFamily: fonts.regular, textAlign: 'center', color: brand.muted },
});
