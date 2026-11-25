import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Chip, Scaffold, Text, colors, radii, spacing } from '@/ui';
import {
  DICTIONARY_FILTERS,
  EVIDENCE_LABELS,
  UNREGULATED_WARNING,
  searchDictionary,
  type DictionaryEntry,
  type DictionaryFilter,
} from '@/features/dictionary';
import { EvidencePill } from '@/features/dictionary/EvidencePill';

/**
 * Library: a searchable nootropic dictionary. Supplements first, then a
 * separate gray-market section behind a warning. Every row opens the entry's
 * detail page with mechanism, claims, research and citations.
 */
const ALL = searchDictionary('');
const TOTAL = ALL.supplements.length + ALL.unregulated.length;

export default function DictionaryScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DictionaryFilter>('all');
  const { supplements, unregulated } = useMemo(() => searchDictionary(query, filter), [query, filter]);
  const open = (entry: DictionaryEntry) =>
    router.push({ pathname: '/dictionary/[id]', params: { id: entry.id } });
  const empty = supplements.length === 0 && unregulated.length === 0;

  return (
    <Scaffold>
      <View style={styles.header}>
        <Text variant="largeTitle">Library</Text>
        <Text tone="secondary">
          {`${TOTAL} nootropics: what they claim, and what the research actually shows.`}
        </Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, alias or effect"
        placeholderTextColor={colors.textTertiary}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Search the library"
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {DICTIONARY_FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {empty && (
        <Text tone="secondary" style={styles.empty}>
          {'Nothing matches that search.'}
        </Text>
      )}

      {supplements.length > 0 && (
        <Section title="Supplements" count={supplements.length}>
          {supplements.map((e, i) => (
            <EntryRow key={e.id} entry={e} divider={i < supplements.length - 1} onPress={() => open(e)} />
          ))}
        </Section>
      )}

      {unregulated.length > 0 && (
        <Section title="Gray market" count={unregulated.length}>
          <View style={styles.warning}>
            <Text variant="headline">{'⚠️  Unregulated compounds'}</Text>
            <Text variant="footnote" tone="secondary">
              {UNREGULATED_WARNING}
            </Text>
          </View>
          {unregulated.map((e, i) => (
            <EntryRow key={e.id} entry={e} divider={i < unregulated.length - 1} onPress={() => open(e)} />
          ))}
        </Section>
      )}
    </Scaffold>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="footnote" tone="tertiary" style={styles.sectionTitle}>
        {`${title.toUpperCase()} · ${count}`}
      </Text>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

function EntryRow({ entry, divider, onPress }: { entry: DictionaryEntry; divider: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}. ${EVIDENCE_LABELS[entry.evidence]}`}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          <Text variant="headline">{entry.name}</Text>
          <Text variant="caption" tone="tertiary">
            {entry.category}
          </Text>
        </View>
        <Text variant="footnote" tone="secondary" numberOfLines={2}>
          {entry.tagline}
        </Text>
        <EvidencePill grade={entry.evidence} compact />
      </View>
      <Text tone="tertiary">{'›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  search: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 17,
    color: colors.text,
  },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  section: { gap: spacing.xs },
  sectionTitle: { paddingHorizontal: spacing.xs },
  card: { padding: 0, overflow: 'hidden' },
  warning: {
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: '#FFF4E5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.warning,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
  rowText: { flex: 1, gap: spacing.xxs + 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
});
