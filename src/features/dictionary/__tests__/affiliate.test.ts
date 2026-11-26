import { DICTIONARY_ENTRIES, getDictionaryEntry } from '@/features/dictionary';
import { affiliateLinks, withTracking } from '@/features/dictionary/affiliate';

const placeholders = { nootropicsDepot: 'REPLACE', iherb: 'REPLACE' };

describe('affiliateLinks', () => {
  it('lists stores highest payout first, as plain store searches until tracking is set', () => {
    const links = affiliateLinks(getDictionaryEntry('creatine')!, placeholders);
    expect(links.map((l) => l.store)).toEqual(['nootropicsDepot', 'iherb']);
    expect(links[0]?.url).toBe('https://nootropicsdepot.com/search.php?search_query=Creatine%20Monohydrate');
    expect(links[1]?.url).toBe('https://www.iherb.com/search?kw=Creatine%20Monohydrate');
  });

  it('wraps store URLs in the tracking deep link once configured', () => {
    const url = withTracking('https://www.iherb.com/search?kw=x', 'https://iherb.sjv.io/c/1/2/3');
    expect(url).toBe('https://iherb.sjv.io/c/1/2/3?u=https%3A%2F%2Fwww.iherb.com%2Fsearch%3Fkw%3Dx');
  });

  it('never links gray-market or prescription entries', () => {
    const unregulated = DICTIONARY_ENTRIES.filter((x) => x.kind === 'unregulated');
    expect(unregulated.length).toBeGreaterThan(0);
    for (const e of unregulated) expect(affiliateLinks(e)).toEqual([]);
  });

  it('respects noAffiliate', () => {
    expect(affiliateLinks({ ...getDictionaryEntry('caffeine')!, noAffiliate: true })).toEqual([]);
    for (const id of ['galantamine', 'nicotine', 'lithium-orotate', 'kava', 'sulbutiamine']) {
      expect(affiliateLinks(getDictionaryEntry(id)!)).toEqual([]);
    }
  });
});

/**
 * An entry with a buy button is advertising for that supplement (FTC: an
 * affiliate is responsible for the claims next to its links), and FDA rules
 * let supplements make structure/function claims, never disease claims. So
 * the marketing-shaped lines of any entry with a buy link (tagline and the
 * "what people claim" list) must not name a disease. The research section can
 * still cite disease trials honestly.
 */
const DISEASE_TERMS =
  /depress|alzheimer|dementia|parkinson|cancer|tumou?r|diabet|bipolar|insomnia|adhd|cognitive impairment|disorder|schizo|hypertens|mania|suicid|disease|ptsd|\bocd\b|seizure|epilep|covid|infection|\bcure|\btreat|prevent/i;

describe('affiliate entries make no disease claims', () => {
  it('keeps disease words out of the tagline and claims of every entry with a buy link', () => {
    const offenders = DICTIONARY_ENTRIES.filter((e) => affiliateLinks(e).length > 0)
      .filter((e) => DISEASE_TERMS.test([e.tagline, ...e.claims].join(' | ')))
      .map((e) => e.id);
    expect(offenders).toEqual([]);
  });
});
