import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Brian } from '@/brand';
import { Text, brand, fonts, spacing } from '@/ui';
import { buildEvidenceCard, COMPLIANCE_DISCLAIMER } from '@/results';
import { useExperimentData } from '@/screens/useExperimentData';

/** Show a reference link as its host + path, without the scheme. */
function prettyLink(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '');
}

/**
 * Evidence card: a short, educational summary of what studies say about the
 * chosen supplement, with reference links and an honest note where evidence is
 * weak. It carries NO dose and NO recommendation. A user-typed "Other"
 * supplement has no DAO row, so no evidence card is shown for it.
 */
export default function EvidenceCardScreen() {
  const { supplement } = useExperimentData();
  const card = useMemo(() => buildEvidenceCard(supplement), [supplement]);

  if (!card) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Brian size={110} mood="focused" />
          <Text variant="title" style={styles.center}>
            No evidence card yet
          </Text>
          <Text tone="secondary" style={styles.center}>
            There&apos;s no evidence card for this supplement. Educational summaries are available
            only for the listed options, not custom entries.
          </Text>
          <Text variant="caption" tone="tertiary" style={styles.center}>
            {COMPLIANCE_DISCLAIMER}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>WHAT STUDIES SAY</Text>
          <Text variant="largeTitle">{card.supplementName}</Text>
          <Text variant="footnote" tone="tertiary">
            Educational only. No dose, no recommendation.
          </Text>
        </View>

        <View style={styles.card}>
          <Text variant="body">{card.summary}</Text>
        </View>

        {card.weakEvidenceNote && (
          <View style={styles.weakCard}>
            <View style={styles.weakTitle}>
              <Icon name="search" size={18} color={brand.sunDeep} />
              <Text variant="headline">Where the evidence is weak</Text>
            </View>
            <Text tone="secondary">{card.weakEvidenceNote}</Text>
          </View>
        )}

        {card.links.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>References</Text>
            <View style={styles.listCard}>
              {card.links.map((link, i) => (
                <Pressable
                  key={link}
                  onPress={() => void Linking.openURL(link)}
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.linkRow, i > 0 && styles.divider, pressed && styles.pressed]}
                >
                  <View style={styles.linkIcon}>
                    <Icon name="book" size={16} color={brand.ink} />
                  </View>
                  <Text variant="subhead" style={styles.link} numberOfLines={2}>
                    {prettyLink(link)}
                  </Text>
                  <Icon name="arrowRight" size={16} color={brand.faint} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
          {card.disclaimer}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.paper },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  center: { textAlign: 'center' },
  header: { gap: spacing.xs },
  eyebrow: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 1.2, color: brand.tang },
  card: {
    backgroundColor: brand.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  weakCard: { backgroundColor: brand.sunSoft, borderRadius: 20, padding: spacing.lg, gap: spacing.sm },
  weakTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontFamily: fonts.displayBold, color: brand.ink },
  listCard: {
    backgroundColor: brand.white,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.line },
  pressed: { opacity: 0.6 },
  linkIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: brand.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { flex: 1, color: brand.ink },
  disclaimer: { marginTop: spacing.sm, textAlign: 'center' },
});
