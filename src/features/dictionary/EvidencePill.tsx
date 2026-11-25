import { StyleSheet, View } from 'react-native';
import { Text, brand, fonts, radii, spacing } from '@/ui';
import type { EvidenceGrade } from './types';
import { EVIDENCE_LABELS } from './index';

/** Filled bars out of four, so the grade reads at a glance. */
const BARS: Record<EvidenceGrade, number> = { strong: 4, moderate: 3, limited: 2, preclinical: 1 };

const TINT: Record<EvidenceGrade, string> = {
  strong: brand.mint,
  moderate: brand.lilacDeep,
  limited: brand.sunDeep,
  preclinical: brand.muted,
};

/** Compact evidence-strength badge: four rising bars plus a label. */
export function EvidencePill({ grade, compact = false }: { grade: EvidenceGrade; compact?: boolean }) {
  const tint = TINT[grade];
  return (
    <View style={[styles.pill, compact && styles.compact]} accessibilityLabel={EVIDENCE_LABELS[grade]}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.bar, { height: 5 + i * 2.5, backgroundColor: i < BARS[grade] ? tint : brand.line }]}
          />
        ))}
      </View>
      <Text variant="caption" style={[styles.label, { color: tint }]}>
        {EVIDENCE_LABELS[grade]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    backgroundColor: brand.paper,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  compact: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xxs + 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 2 },
  label: { fontFamily: fonts.semibold },
});
