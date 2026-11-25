import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Scaffold, Text, colors, spacing } from '@/ui';
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
        <Text tone="secondary">{'That entry could not be found.'}</Text>
      </Scaffold>
    );
  }

  const unregulated = entry.kind === 'unregulated';
  const buyLinks = affiliateLinks(entry);

  return (
    <Scaffold>
      <Stack.Screen options={{ title: entry.name }} />

      <View style={styles.hero}>
        <Text variant="caption" tone="tertiary">
          {entry.category.toUpperCase()}
        </Text>
        <Text variant="largeTitle">{entry.name}</Text>
        {entry.aliases.length > 0 && (
          <Text variant="footnote" tone="tertiary">
            {`Also known as ${entry.aliases.join(', ')}`}
          </Text>
        )}
        <Text tone="secondary">{entry.tagline}</Text>
        <EvidencePill grade={entry.evidence} />
        <Text variant="caption" tone="tertiary">
          {EVIDENCE_EXPLAINERS[entry.evidence]}
        </Text>
      </View>

      {unregulated && (
        <View style={styles.warning} accessibilityRole="alert">
          <Text variant="headline">{'⚠️  Gray-market compound'}</Text>
          <Text variant="footnote">{UNREGULATED_WARNING}</Text>
          {entry.status && (
            <Text variant="footnote" style={styles.status}>
              {`Status: ${entry.status}`}
            </Text>
          )}
        </View>
      )}

      <Card style={styles.card}>
        <Text variant="headline">{'How it works'}</Text>
        <Text tone="secondary">{entry.mechanism}</Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="headline">{'What people claim'}</Text>
        <View style={styles.claims}>
          {entry.claims.map((c) => (
            <View key={c} style={styles.claim}>
              <Text variant="footnote">{c}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text variant="headline">{'What the research shows'}</Text>
        <Text tone="secondary">{entry.research}</Text>
      </Card>

      <Card style={styles.card}>
        <Text variant="headline">{'Safety'}</Text>
        <Text tone="secondary">{entry.safety}</Text>
        {!unregulated && entry.status && <Text tone="secondary">{entry.status}</Text>}
      </Card>

      <Card style={styles.card}>
        <Text variant="headline">{'Key studies'}</Text>
        {entry.studies.map((s) => (
          <Pressable
            key={s.url}
            onPress={() => void Linking.openURL(s.url)}
            accessibilityRole="link"
            accessibilityHint="Opens the study in your browser"
            style={({ pressed }) => [styles.study, pressed && styles.pressed]}
          >
            <Text variant="footnote" tone="accent" style={styles.cite}>
              {`${s.citation} ↗`}
            </Text>
            <Text variant="footnote" tone="secondary">
              {s.finding}
            </Text>
          </Pressable>
        ))}
      </Card>

      {seeded && (
        <Card style={styles.card}>
          <Text variant="headline">{'Does it work for you?'}</Text>
          <Text tone="secondary">
            {'Studies describe averages. Run a blinded experiment to see whether it moves your own reaction time and memory.'}
          </Text>
          <Button label="Test it on yourself" onPress={testIt} />
        </Card>
      )}

      {buyLinks.length > 0 && (
        <Card style={styles.card}>
          <Text variant="headline">{'Where to find it'}</Text>
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

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  warning: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  status: { fontWeight: '600' },
  card: { gap: spacing.sm },
  claims: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  claim: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  study: { gap: spacing.xxs, paddingVertical: spacing.sm },
  pressed: { opacity: 0.6 },
  cite: { fontWeight: '600' },
  disclaimer: { textAlign: 'center', marginTop: spacing.sm },
});
