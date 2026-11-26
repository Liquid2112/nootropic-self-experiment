import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/brand';
import { brand, fonts, radius, spacing } from '@/ui';

/**
 * Shared pieces for the dark ("ink") check-in screens: the white pill button,
 * the outlined secondary button, the step header with progress dashes, the
 * chip, and the intro card that opens each timed task.
 */

export const DIM = 'rgba(255,255,255,0.6)';
export const HAIRLINE = 'rgba(255,255,255,0.12)';

/** White pill button for the ink screens (the ink primary would vanish here). */
export function LightButton({
  label,
  onPress,
  disabled = false,
  accessibilityHint,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ink.lightButton,
        pressed && !disabled ? ink.lightButtonPressed : null,
        disabled ? ink.disabled : null,
      ]}
    >
      <Text style={ink.lightButtonText}>{label}</Text>
    </Pressable>
  );
}

/** Outlined pill for a secondary action on the ink screens. */
export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [ink.ghostButton, pressed ? ink.ghostPressed : null]}
    >
      <Text style={ink.ghostText}>{label}</Text>
    </Pressable>
  );
}

/** "Step N of M" eyebrow with progress dashes, title and optional subtitle. */
export function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={ink.stepHeader}>
      <StepDashes step={step} total={total} />
      <Text style={ink.eyebrow}>{`STEP ${step} OF ${total}`}</Text>
      <Text style={ink.title}>{title}</Text>
      {subtitle ? <Text style={ink.muted}>{subtitle}</Text> : null}
    </View>
  );
}

export function StepDashes({ step, total }: { step: number; total: number }) {
  return (
    <View style={ink.stepDots}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <View key={n} style={[ink.stepDot, n <= step ? ink.stepDotOn : null]} />
      ))}
    </View>
  );
}

export function InkChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[ink.chip, selected ? ink.chipSelected : ink.chipIdle]}
    >
      <Text style={[ink.chipText, selected ? ink.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The card that opens a timed task: what it measures, how to do it, and a
 * Start button, so nobody's first trial is spent working out the rules.
 */
export function TaskIntro({
  step,
  total,
  icon,
  measures,
  name,
  how,
  footnote,
  startLabel = 'Start',
  onStart,
  children,
}: {
  step: number;
  total: number;
  icon: IconName;
  measures: string;
  name: string;
  how: string;
  footnote?: string;
  startLabel?: string;
  onStart: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={ink.introFill}>
      <StepDashes step={step} total={total} />
      <View style={ink.introBody}>
        <View style={ink.introBadge}>
          <Icon name={icon} size={30} color={brand.ink} />
        </View>
        <Text style={ink.eyebrow}>{measures.toUpperCase()}</Text>
        <Text style={[ink.title, ink.center]}>{name}</Text>
        <Text style={[ink.muted, ink.center]}>{how}</Text>
        {children}
      </View>
      <View style={ink.introFooter}>
        {footnote ? <Text style={[ink.footnote, ink.center]}>{footnote}</Text> : null}
        <LightButton label={startLabel} onPress={onStart} />
      </View>
    </View>
  );
}

/** Thin progress bar used by the timed tasks. */
export function TaskTrack({ fraction }: { fraction: number }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View style={ink.track}>
      <View style={[ink.trackFill, { width: `${pct}%` }]} />
    </View>
  );
}

export const ink = StyleSheet.create({
  center: { textAlign: 'center' },
  stepHeader: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xs },
  stepDots: { flexDirection: 'row', gap: 6, marginBottom: spacing.xs, alignSelf: 'stretch' },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: HAIRLINE },
  stepDotOn: { backgroundColor: brand.lilac },
  eyebrow: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 1.2, color: brand.lilac },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.display,
    letterSpacing: -0.6,
    color: brand.white,
  },
  muted: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: DIM },
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.45)' },
  label: { fontSize: 16, fontFamily: fonts.semibold, color: brand.white },
  progress: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  darkCard: {
    backgroundColor: brand.ink2,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipIdle: { borderColor: HAIRLINE, backgroundColor: 'rgba(255,255,255,0.04)' },
  chipSelected: { borderColor: brand.white, backgroundColor: brand.white },
  chipText: { fontSize: 15, fontFamily: fonts.medium, color: brand.white },
  chipTextSelected: { color: brand.ink, fontFamily: fonts.semibold },
  lightButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
  },
  lightButtonPressed: { backgroundColor: brand.paperDeep, transform: [{ translateY: 1 }] },
  lightButtonText: { fontSize: 17, fontFamily: fonts.semibold, color: brand.ink },
  disabled: { opacity: 0.35 },
  ghostButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  ghostPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  ghostText: { fontSize: 17, fontFamily: fonts.semibold, color: brand.white },
  track: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: HAIRLINE, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2, backgroundColor: brand.lilac },
  introFill: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  introBody: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  introBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: brand.lilac,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  introFooter: { gap: spacing.md },
});
