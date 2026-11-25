import { StyleSheet, View } from 'react-native';
import { Text, colors, radii, spacing } from '@/ui';
import type { EvidenceGrade } from './types';
import { EVIDENCE_LABELS } from './index';

/** Filled dots out of four, so the grade reads at a glance. */
const DOTS: Record<EvidenceGrade, number> = { strong: 4, moderate: 3, limited: 2, preclinical: 1 };

const TINT: Record<EvidenceGrade, string> = {
  strong: colors.success,
  moderate: colors.accent,
  limited: colors.warning,
  preclinical: colors.textTertiary,
};

/** Compact evidence-strength badge: four dots plus a label. */
export function EvidencePill({ grade, compact = false }: { grade: EvidenceGrade; compact?: boolean }) {
  const tint = TINT[grade];
  return (
    <View style={[styles.pill, compact && styles.compact]} accessibilityLabel={EVIDENCE_LABELS[grade]}>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < DOTS[grade] ? tint : colors.border }]} />
        ))}
      </View>
      <Text variant="caption" style={{ color: tint, fontWeight: '600' }}>
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
