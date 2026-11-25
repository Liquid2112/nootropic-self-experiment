import { DICTIONARY_ENTRIES, UNREGULATED_ENTRIES, getDictionaryEntry } from '@/features/dictionary';
import { amazonAffiliateUrl } from '@/features/dictionary/affiliate';

describe('amazonAffiliateUrl', () => {
  it('builds a tagged Amazon search link for OTC supplements', () => {
    const url = amazonAffiliateUrl(getDictionaryEntry('creatine')!, 'mytag-20');
    expect(url).toBe('https://www.amazon.com/s?k=Creatine%20Monohydrate%20supplement&tag=mytag-20');
  });

  it('never links gray-market entries', () => {
    for (const e of DICTIONARY_ENTRIES.filter((x) => x.kind === 'unregulated')) {
      expect(amazonAffiliateUrl(e)).toBeNull();
    }
    expect(UNREGULATED_ENTRIES.length).toBeGreaterThan(0);
  });

  it('respects noAffiliate', () => {
    const entry = { ...getDictionaryEntry('caffeine')!, noAffiliate: true };
    expect(amazonAffiliateUrl(entry)).toBeNull();
  });
});
