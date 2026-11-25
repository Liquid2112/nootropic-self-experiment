import { AMAZON_ASSOCIATE_TAG } from '@/config/links';
import type { DictionaryEntry } from './types';

/**
 * Affiliate "Buy on Amazon" link for a dictionary entry, or null when the entry
 * must not have one.
 *
 * Rules: OTC supplements only. Never for unregulated (gray-market) entries,
 * never for entries flagged `noAffiliate`. The link lives only on dictionary
 * pages; it is never shown with, or chosen by, an experiment verdict, so the
 * app's results stay independent of what earns a commission.
 */
export function amazonAffiliateUrl(entry: DictionaryEntry, tag: string = AMAZON_ASSOCIATE_TAG): string | null {
  if (entry.kind !== 'supplement' || entry.noAffiliate) return null;
  const query = `${entry.name} supplement`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}`;
}
