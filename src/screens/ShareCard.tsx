import { type ComponentRef, forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, Logo, Brian } from '@/brand';
import { brand, fonts } from '@/ui';
import type { MetricVerdict } from '@/results';
import { COMPLIANCE_DISCLAIMER } from '@/results';

/** The element type a ref to a View resolves to under the new RN architecture. */
export type ViewRef = ComponentRef<typeof View>;

/**
 * Branded verdict card, sized for a TikTok/Instagram export (9:16 portrait).
 * Ink background, the Placebo lockup up top, the verdict sentence as the hero,
 * the plain-unit effect and cost under it, Brian in the corner and the
 * compliance line pinned at the bottom. It is a plain View so
 * react-native-view-shot can capture it to an image; the ref is forwarded to
 * the capture root.
 */
export type ShareCardProps = {
  supplementName: string;
  primary: MetricVerdict;
  /** "$X/month" line, or null when unknown. */
  monthlyCost: string | null;
  /** Show the "Blinded" badge (the run hid which days were real). */
  blinded?: boolean;
};

export const ShareCard = forwardRef<ViewRef, ShareCardProps>(function ShareCard(
  { supplementName, primary, monthlyCost, blinded = false },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.top}>
        <Logo size={22} color={brand.white} />
        {blinded ? (
          <View style={styles.badge}>
            <Icon name="eyeOff" size={13} color={brand.ink} strokeWidth={2.4} />
            <Text style={styles.badgeText}>Blinded</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.heroWrap}>
        <Text style={styles.kicker}>MY EXPERIMENT</Text>
        <Text style={styles.supplement}>{supplementName}</Text>
        <Text style={styles.hero}>{primary.verdictSentence}</Text>
        {primary.effectSentence && <Text style={styles.effect}>{primary.effectSentence}</Text>}
        {monthlyCost && <Text style={styles.cost}>{monthlyCost}</Text>}
      </View>

      <View style={styles.bottom}>
        <Text style={styles.disclaimer}>{COMPLIANCE_DISCLAIMER}</Text>
        <Brian size={76} mood="proud" tilt={-8} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 320,
    height: 568, // 9:16 portrait for social export
    backgroundColor: brand.ink,
    borderRadius: 28,
    padding: 24,
    justifyContent: 'space-between',
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.lilac,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontFamily: fonts.semibold, color: brand.ink },
  heroWrap: { flex: 1, justifyContent: 'center', gap: 10 },
  kicker: { fontSize: 11, fontFamily: fonts.semibold, letterSpacing: 1.4, color: 'rgba(255,255,255,0.5)' },
  supplement: { fontSize: 22, lineHeight: 28, fontFamily: fonts.displayBold, color: brand.tang },
  hero: { fontSize: 32, lineHeight: 37, fontFamily: fonts.display, letterSpacing: -0.8, color: brand.white },
  effect: { fontSize: 16, lineHeight: 22, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.75)' },
  cost: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.55)' },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  disclaimer: { flex: 1, fontSize: 10, lineHeight: 14, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.45)' },
});
