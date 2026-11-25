import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Chip, Scaffold, Text, brand, fonts, radii, spacing } from '@/ui';
import { Icon, Noodle } from '@/brand';
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
        <Text variant="caption2" tone="tertiary" style={styles.eyebrow}>
          {`THE LIBRARY  ·  ${TOTAL} ENTRIES`}
        </Text>
        <Text variant="largeTitle">What it claims. What it does.</Text>
        <Text tone="secondary">
          {'Plain-English profiles of popular nootropics, graded by how strong the research really is.'}
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={brand.faint} />
        <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, alias or effect"
        placeholderTextColor={brand.faint}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        accessibilityLabel="Search the library"
        style={styles.search}
      />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {DICTIONARY_FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {empty && (
        <View style={styles.empty}>
          <Noodle size={96} mood="wow" />
          <Text variant="headline">{'Nothing matches that search'}</Text>
          <Text tone="secondary" style={styles.center}>
            {'Try a compound name, an alias, or an effect like "sleep".'}
          </Text>
        </View>
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
            <View style={styles.warningTitle}>
              <View style={styles.warningIcon}>
                <Icon name="shield" size={16} color={brand.white} strokeWidth={2.4} />
              </View>
              <Text variant="headline">{'Unregulated compounds'}</Text>
            </View>
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
      <Text variant="caption2" tone="tertiary" style={styles.sectionTitle}>
        {`${title.toUpperCase()}  ·  ${count}`}
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
          <Text variant="title3">{entry.name}</Text>
          <View style={styles.category}>
            <Text variant="caption" tone="secondary">
              {entry.category}
            </Text>
          </View>
        </View>
        <Text variant="footnote" tone="secondary" numberOfLines={2}>
          {entry.tagline}
        </Text>
        <EvidencePill grade={entry.evidence} compact />
      </View>
      <Icon name="chevronRight" size={18} color={brand.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  eyebrow: { letterSpacing: 1.2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: brand.white,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
    paddingHorizontal: spacing.lg,
  },
  search: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: brand.ink,
  },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  center: { textAlign: 'center' },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs, letterSpacing: 1.2 },
  card: { padding: 0, overflow: 'hidden' },
  warning: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: brand.sunSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.line,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
  pressed: { backgroundColor: brand.paper },
  rowText: { flex: 1, gap: spacing.sm },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  category: {
    backgroundColor: brand.paper,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
