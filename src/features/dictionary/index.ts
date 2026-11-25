import { SHOW_UNREGULATED_ENTRIES } from '@/config/links';
import { DICTIONARY_ENTRIES } from './entries';
import type { DictionaryEntry, DictionaryGoal, EvidenceGrade } from './types';

export * from './types';
export { DICTIONARY_ENTRIES, OTC_ENTRIES, SUPPLEMENT_ENTRIES, UNREGULATED_ENTRIES } from './entries';
export { affiliateLinks, type AffiliateLink } from './affiliate';

/** Filter chips on the dictionary list. 'all' and 'unregulated' are not goals. */
export type DictionaryFilter = 'all' | DictionaryGoal | 'unregulated';

const ALL_FILTERS: { id: DictionaryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'memory', label: 'Memory' },
  { id: 'mood', label: 'Mood & stress' },
  { id: 'energy', label: 'Energy' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'longevity', label: 'Longevity' },
  { id: 'unregulated', label: 'Gray market' },
];

export const DICTIONARY_FILTERS = SHOW_UNREGULATED_ENTRIES
  ? ALL_FILTERS
  : ALL_FILTERS.filter((f) => f.id !== 'unregulated');

export const EVIDENCE_LABELS: Record<EvidenceGrade, string> = {
  strong: 'Strong evidence',
  moderate: 'Moderate evidence',
  limited: 'Limited evidence',
  preclinical: 'Mostly preclinical',
};

export const EVIDENCE_EXPLAINERS: Record<EvidenceGrade, string> = {
  strong: 'Consistent results across multiple good human trials or meta-analyses.',
  moderate: 'Several human trials, mostly positive, with caveats.',
  limited: 'Few or small human trials, or mixed results.',
  preclinical: 'Mostly animal or lab data, or early safety studies in people.',
};

/** Shown on every entry. */
export const DICTIONARY_DISCLAIMER =
  'Educational summary of published research, not medical advice. Talk to a doctor before taking anything, especially with a health condition or medication.';

/** Shown prominently on every unregulated entry and atop the gray-market filter. */
export const UNREGULATED_WARNING =
  'Not approved as a supplement or drug where most people live. Products are unregulated and may be mislabeled or contaminated, and long-term risks are unknown. Listed for education only. This app gives no dosing or sourcing information and does not support experiments with these compounds.';

const byName = (a: DictionaryEntry, b: DictionaryEntry) => a.name.localeCompare(b.name);

/** Case-insensitive match on name, aliases, category and claims. */
function matchesQuery(entry: DictionaryEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [entry.name, entry.category, entry.tagline, ...entry.aliases, ...entry.claims]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesFilter(entry: DictionaryEntry, filter: DictionaryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unregulated') return entry.kind === 'unregulated';
  return entry.goals.includes(filter);
}

/**
 * Entries for the list screen, sorted by name. Supplements come first; the
 * gray-market section follows so it is never the first thing a user sees.
 */
export function searchDictionary(
  query: string,
  filter: DictionaryFilter = 'all',
  entries: DictionaryEntry[] = DICTIONARY_ENTRIES,
  showUnregulated: boolean = SHOW_UNREGULATED_ENTRIES,
): { supplements: DictionaryEntry[]; unregulated: DictionaryEntry[] } {
  const hits = entries.filter(
    (e) => (showUnregulated || e.kind !== 'unregulated') && matchesQuery(e, query) && matchesFilter(e, filter),
  );
  return {
    supplements: hits.filter((e) => e.kind === 'supplement').sort(byName),
    unregulated: hits.filter((e) => e.kind === 'unregulated').sort(byName),
  };
}

export function getDictionaryEntry(
  id: string,
  showUnregulated: boolean = SHOW_UNREGULATED_ENTRIES,
): DictionaryEntry | undefined {
  return DICTIONARY_ENTRIES.find((e) => e.id === id && (showUnregulated || e.kind !== 'unregulated'));
}

/** Dictionary entry for a seeded experiment supplement, if one exists. */
export function getEntryForSupplement(supplementId: string): DictionaryEntry | undefined {
  return DICTIONARY_ENTRIES.find((e) => e.supplementId === supplementId);
}
