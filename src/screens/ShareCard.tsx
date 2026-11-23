import { type ComponentRef, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, colors, radii, spacing } from '@/ui';
import type { MetricVerdict } from '@/results';
import { COMPLIANCE_DISCLAIMER } from '@/results';

/** The element type a ref to a View resolves to under the new RN architecture. */
export type ViewRef = ComponentRef<typeof View>;

/**
 * Branded verdict card, sized for a TikTok/Instagram export (portrait). The
 * verdict sentence is the hero; the plain-unit effect and supplement sit under
 * it, with the compliance line pinned at the bottom. It is a plain View so
 * react-native-view-shot can capture it to an image; the ref is forwarded to
 * the capture root.
 */
export type ShareCardProps = {
  supplementName: string;
  primary: MetricVerdict;
  /** "$X/month" line, or null when unknown. */
  monthlyCost: string | null;
};

export const ShareCard = forwardRef<ViewRef, ShareCardProps>(function ShareCard(
  { supplementName, primary, monthlyCost },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text variant="caption" tone="secondary" style={styles.kicker}>
        MY NOOTROPIC EXPERIMENT
      </Text>

      <View style={styles.heroWrap}>
        <Text variant="title" tone="accent" style={styles.supplement}>
          {supplementName}
        </Text>
        <Text variant="largeTitle" style={styles.hero}>
          {primary.verdictSentence}
        </Text>
        {primary.effectSentence && (
          <Text variant="headline" tone="secondary" style={styles.effect}>
            {primary.effectSentence}
          </Text>
        )}
        {monthlyCost && (
          <Text variant="body" tone="secondary" style={styles.cost}>
            {monthlyCost}
          </Text>
        )}
      </View>

      <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
        {COMPLIANCE_DISCLAIMER}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 320,
    height: 568, // 9:16 portrait for social export
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  kicker: { letterSpacing: 1.5 },
  heroWrap: { flex: 1, justifyContent: 'center', gap: spacing.md },
  supplement: {},
  hero: { lineHeight: 40 },
  effect: {},
  cost: {},
  disclaimer: {},
});
