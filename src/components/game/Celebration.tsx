import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Brian } from '@/brand';
import type { GameState, ProgressDelta } from '@/features/gamification';
import { Button, brand, fonts } from '@/ui';
import { Confetti } from './Confetti';
import { XpBar } from './XpBar';
import { celebrate } from './haptics';
import { BADGE_ICON } from './questIcons';

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
 * Full-screen reward moment: Brian pops in, confetti falls, and the XP,
 * streak, level and any new badges are laid out as a receipt. Used after a
 * check-in.
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
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    celebrate();
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, duration: 500, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [pop, rise]);

  const riseStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
  const big = delta.levelUp !== null || delta.newBadges.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Animated.View style={[styles.hero, { transform: [{ scale: pop }] }]}>
          <Brian size={132} mood={big ? 'proud' : 'happy'} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>

        <Animated.View style={[styles.receipt, riseStyle]}>
          <Row icon="sparkle" tint={brand.sunSoft} color={brand.sunDeep} label="XP earned" value={`+${delta.xpGained}`} />
          <Row
            icon="flame"
            tint={brand.tangSoft}
            color={brand.tang}
            label={delta.streakGrew ? 'Streak extended' : 'Streak'}
            value={`${delta.streak} day${delta.streak === 1 ? '' : 's'}`}
          />
          {delta.newBadges.map((b) => (
            <Row key={b.id} icon={BADGE_ICON[b.id] ?? 'medal'} tint={brand.ink} color={brand.sun} label="New badge" value={b.title} />
          ))}
          <View style={styles.levelBlock}>
            <XpBar level={game.level} />
            {delta.levelUp !== null ? (
              <Text style={styles.levelUp}>{`Level up! You reached level ${delta.levelUp}, ${game.level.title}.`}</Text>
            ) : null}
          </View>
        </Animated.View>

        {children}
      </View>

      <View style={styles.footer}>
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
        <Button label={actionLabel} onPress={onContinue} fullWidth />
      </View>
      <Confetti count={big ? 110 : 70} />
    </SafeAreaView>
  );
}

function Row({ icon, tint, color, label, value }: { icon: Parameters<typeof Icon>[0]['name']; tint: string; color: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={color} strokeWidth={2.3} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.paper },
  content: { flex: 1, gap: 20, paddingHorizontal: 20, paddingTop: 24 },
  hero: { alignItems: 'center', gap: 8 },
  title: { fontSize: 32, lineHeight: 38, fontFamily: fonts.display, letterSpacing: -0.8, color: brand.ink, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 22, fontFamily: fonts.regular, color: brand.muted, textAlign: 'center' },
  receipt: {
    backgroundColor: brand.white,
    borderRadius: 24,
    padding: 16,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: brand.muted },
  rowValue: { fontSize: 17, fontFamily: fonts.display, color: brand.ink },
  levelBlock: { marginTop: 8, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.line, gap: 10 },
  levelUp: { fontSize: 14, fontFamily: fonts.semibold, color: brand.tang, textAlign: 'center' },
  footer: { gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  footnote: { fontSize: 14, fontFamily: fonts.regular, color: brand.muted, textAlign: 'center' },
});
