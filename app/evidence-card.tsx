import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, colors, spacing } from '@/ui';
import { buildEvidenceCard, COMPLIANCE_DISCLAIMER } from '@/results';
import { useExperimentData } from '@/screens/useExperimentData';

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
          <Text variant="title">Evidence</Text>
          <Text tone="secondary" style={styles.center}>
            There\u2019s no evidence card for this supplement. Educational summaries are available
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="largeTitle">{card.supplementName}</Text>
        <Text variant="caption" tone="tertiary">
          What studies say \u2014 educational only
        </Text>

        <Card style={styles.card}>
          <Text variant="body">{card.summary}</Text>
        </Card>

        {card.weakEvidenceNote && (
          <Card style={styles.weakCard}>
            <Text variant="headline">Where the evidence is weak</Text>
            <Text tone="secondary">{card.weakEvidenceNote}</Text>
          </Card>
        )}

        {card.links.length > 0 && (
          <Card style={styles.card}>
            <Text variant="headline" style={styles.linksTitle}>
              References
            </Text>
            {card.links.map((link) => (
              <Pressable key={link} onPress={() => void Linking.openURL(link)} accessibilityRole="link">
                <Text tone="accent" style={styles.link}>
                  {link}
                </Text>
              </Pressable>
            ))}
          </Card>
        )}

        <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
          {card.disclaimer}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  center: { textAlign: 'center' },
  card: { gap: spacing.sm },
  weakCard: { gap: spacing.xs },
  linksTitle: { marginBottom: spacing.xs },
  link: { paddingVertical: spacing.xs },
  disclaimer: { marginTop: spacing.sm, textAlign: 'center' },
});
