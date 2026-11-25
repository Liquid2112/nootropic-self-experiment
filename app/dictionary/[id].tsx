import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Scaffold, Text, brand, fonts, radii, spacing } from '@/ui';
import { Icon, Brian, type IconName } from '@/brand';
import {
  DICTIONARY_DISCLAIMER,
  EVIDENCE_EXPLAINERS,
  UNREGULATED_WARNING,
  getDictionaryEntry,
} from '@/features/dictionary';
import { EvidencePill } from '@/features/dictionary/EvidencePill';
import { affiliateLinks } from '@/features/dictionary/affiliate';
import { AFFILIATE_DISCLOSURE } from '@/config/links';
import { SEED_SUPPLEMENTS } from '@/db/seed';
import { useOnboarding } from '@/screens/onboarding/OnboardingContext';

/**
 * One dictionary entry: what it is, how it is thought to work, what people
 * claim, what research shows, safety and citations. OTC supplements that are
 * in the experiment list get a "Test it on yourself" action; unregulated
 * entries get a prominent warning and no action. No dosing anywhere.
 */
export default function DictionaryEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { update } = useOnboarding();
  const entry = id ? getDictionaryEntry(id) : undefined;
  const seeded = entry?.kind === 'supplement' ? SEED_SUPPLEMENTS.find((s) => s.id === entry.supplementId) : undefined;

  const testIt = useCallback(() => {
    if (!seeded) return;
    update({ supplement: { kind: 'curated', supplementId: seeded.id, type: seeded.type, name: seeded.name } });
    router.push('/goal-picker');
  }, [seeded, update, router]);

  if (!entry) {
    return (
      <Scaffold>
        <View style={styles.missing}>
          <Brian size={96} mood="sleepy" />
          <Text tone="secondary">{'That entry could not be found.'}</Text>
        </View>
      </Scaffold>
    );
  }

  const unregulated = entry.kind === 'unregulated';
  const buyLinks = affiliateLinks(entry);

  return (
    <Scaffold>
      <Stack.Screen options={{ title: entry.name }} />

      <View style={styles.hero}>
        <Text variant="caption2" tone="tertiary" style={styles.eyebrow}>
          {entry.category.toUpperCase()}
        </Text>
        <Text variant="largeTitle">{entry.name}</Text>
        {entry.aliases.length > 0 && (
          <Text variant="footnote" tone="tertiary">
            {`Also known as ${entry.aliases.join(', ')}`}
          </Text>
        )}
        <Text variant="title3" style={styles.tagline}>
          {entry.tagline}
        </Text>
        <EvidencePill grade={entry.evidence} />
        <Text variant="caption" tone="tertiary">
          {EVIDENCE_EXPLAINERS[entry.evidence]}
        </Text>
      </View>

      {unregulated && (
        <View style={styles.warning} accessibilityRole="alert">
          <View style={styles.warningTitle}>
            <View style={styles.warningIcon}>
              <Icon name="shield" size={16} color={brand.white} strokeWidth={2.4} />
            </View>
            <Text variant="headline">{'Gray-market compound'}</Text>
          </View>
          <Text variant="footnote">{UNREGULATED_WARNING}</Text>
          {entry.status && (
            <Text variant="footnote" style={styles.status}>
              {`Status: ${entry.status}`}
            </Text>
          )}
        </View>
      )}

      <Card style={styles.card}>
        <SectionTitle icon="brain" title={'How it works'} />
        <Text tone="secondary">{entry.mechanism}</Text>
      </Card>

      <Card style={styles.card}>
        <SectionTitle icon="sparkle" title={'What people claim'} />
        <View style={styles.claims}>
          {entry.claims.map((c) => (
            <View key={c} style={styles.claim}>
              <Text variant="footnote">{c}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionTitle icon="chart" title={'What the research shows'} />
        <Text tone="secondary">{entry.research}</Text>
      </Card>

      <Card style={styles.card}>
        <SectionTitle icon="shield" title={'Safety'} />
        <Text tone="secondary">{entry.safety}</Text>
        {!unregulated && entry.status && <Text tone="secondary">{entry.status}</Text>}
      </Card>

      <Card style={styles.card}>
        <SectionTitle icon="book" title={'Key studies'} />
        {entry.studies.map((s) => (
          <Pressable
            key={s.url}
            onPress={() => void Linking.openURL(s.url)}
            accessibilityRole="link"
            accessibilityHint="Opens the study in your browser"
            style={({ pressed }) => [styles.study, pressed && styles.pressed]}
          >
            <View style={styles.citeRow}>
              <Text variant="footnote" style={styles.cite}>
                {s.citation}
              </Text>
              <Icon name="arrowRight" size={14} color={brand.tang} strokeWidth={2.4} />
            </View>
            <Text variant="footnote" tone="secondary">
              {s.finding}
            </Text>
          </Pressable>
        ))}
      </Card>

      {seeded && (
        <Card style={styles.card}>
          <SectionTitle icon="flask" title={'Does it work for you?'} />
          <Text tone="secondary">
            {'Studies describe averages. Run a blinded experiment to see whether it moves your own reaction time and memory.'}
          </Text>
          <Button label="Test it on yourself" onPress={testIt} />
        </Card>
      )}

      {buyLinks.length > 0 && (
        <Card style={styles.card}>
          <SectionTitle icon="gift" title={'Where to find it'} />
          <Text variant="caption" tone="tertiary">
            {AFFILIATE_DISCLOSURE}
          </Text>
          <Text variant="footnote" tone="secondary">
            {'Quality varies between brands. Look for third-party lab testing.'}
          </Text>
          {buyLinks.map((link, i) => (
            <Button
              key={link.store}
              label={`Shop on ${link.label}`}
              variant={i === 0 ? 'primary' : 'secondary'}
              onPress={() => void Linking.openURL(link.url)}
            />
          ))}
        </Card>
      )}

      <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
        {DICTIONARY_DISCLAIMER}
      </Text>
    </Scaffold>
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionIcon}>
        <Icon name={icon} size={16} color={brand.ink} />
      </View>
      <Text variant="headline">{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, paddingTop: spacing.sm },
  eyebrow: { letterSpacing: 1.2 },
  tagline: { color: brand.muted },
  missing: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  warning: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brand.sunSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.sun,
  },
  warningTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warningIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { fontFamily: fonts.semibold },
  card: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: brand.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claims: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  claim: {
    backgroundColor: brand.lilacSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  study: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  pressed: { opacity: 0.6 },
  citeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cite: { fontFamily: fonts.semibold, color: brand.ink, flexShrink: 1 },
  disclaimer: { textAlign: 'center', marginTop: spacing.sm },
});
