import { SEED_SUPPLEMENTS } from '@/db/seed';
import {
  DICTIONARY_ENTRIES,
  OTC_ENTRIES,
  UNREGULATED_ENTRIES,
  getDictionaryEntry,
  getEntryForSupplement,
  searchDictionary,
} from '@/features/dictionary';

/** Every user-facing string in an entry. */
function allText(e: (typeof DICTIONARY_ENTRIES)[number]): string {
  return [
    e.name,
    e.tagline,
    e.mechanism,
    e.research,
    e.safety,
    e.status ?? '',
    ...e.aliases,
    ...e.claims,
    ...e.studies.flatMap((s) => [s.citation, s.finding]),
  ].join('\n');
}

describe('dictionary content rules', () => {
  it('has unique ids', () => {
    const ids = DICTIONARY_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every seeded experiment supplement exactly once', () => {
    for (const s of SEED_SUPPLEMENTS) {
      expect(OTC_ENTRIES.filter((e) => e.supplementId === s.id)).toHaveLength(1);
    }
    for (const e of OTC_ENTRIES) {
      expect(SEED_SUPPLEMENTS.some((s) => s.id === e.supplementId)).toBe(true);
    }
  });

  it('keeps gray-market entries out of the experiment picker', () => {
    const seedIds = new Set(SEED_SUPPLEMENTS.map((s) => s.id));
    for (const e of UNREGULATED_ENTRIES) {
      expect(e.kind).toBe('unregulated');
      expect(e.supplementId).toBeUndefined();
      expect(seedIds.has(e.id)).toBe(false);
      expect(e.status).toBeTruthy();
    }
  });

  it('cites at least one https source per entry', () => {
    for (const e of DICTIONARY_ENTRIES) {
      expect(e.studies.length).toBeGreaterThan(0);
      for (const s of e.studies) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(s.citation.length).toBeGreaterThan(0);
        expect(s.finding.length).toBeGreaterThan(0);
      }
    }
  });

  it('never states a dose or sourcing info', () => {
    const dose = /\b\d+(\.\d+)?\s*(mg|mcg|µg|g|iu|ml|grams?|milligrams?)\b/i;
    const sourcing = /\b(buy|vendor|order online|where to get|coupon|discount code)\b/i;
    for (const e of DICTIONARY_ENTRIES) {
      const text = allText(e);
      expect({ id: e.id, dose: dose.test(text) }).toEqual({ id: e.id, dose: false });
      expect({ id: e.id, sourcing: sourcing.test(text) }).toEqual({ id: e.id, sourcing: false });
    }
  });
});

describe('searchDictionary', () => {
  it('splits supplements from gray-market entries and sorts by name', () => {
    const { supplements, unregulated } = searchDictionary('');
    expect(supplements.every((e) => e.kind === 'supplement')).toBe(true);
    expect(unregulated.every((e) => e.kind === 'unregulated')).toBe(true);
    expect(supplements.length + unregulated.length).toBe(DICTIONARY_ENTRIES.length);
    const names = supplements.map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('matches aliases case-insensitively', () => {
    expect(searchDictionary('BRAHMI').supplements.map((e) => e.id)).toContain('bacopa-monnieri');
    expect(searchDictionary('osavampator').unregulated.map((e) => e.id)).toEqual(['tak-653']);
  });

  it('filters by goal and by gray market', () => {
    const sleep = searchDictionary('', 'sleep');
    expect(sleep.supplements.length).toBeGreaterThan(0);
    expect(sleep.supplements.every((e) => e.goals.includes('sleep'))).toBe(true);

    const gray = searchDictionary('', 'unregulated');
    expect(gray.supplements).toHaveLength(0);
    expect(gray.unregulated).toHaveLength(UNREGULATED_ENTRIES.length);
  });

  it('looks up entries by id and by seeded supplement', () => {
    expect(getDictionaryEntry('bromantane')?.name).toBe('Bromantane');
    expect(getDictionaryEntry('nope')).toBeUndefined();
    expect(getEntryForSupplement('dark-chocolate-flavanols')?.id).toBe('cocoa-flavanols');
  });
});
