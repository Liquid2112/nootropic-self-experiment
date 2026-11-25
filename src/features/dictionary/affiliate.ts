import { AFFILIATE_TRACKING } from '@/config/links';
import type { DictionaryEntry } from './types';

export type AffiliateStore = 'nootropicsDepot' | 'iherb';

export type AffiliateLink = { store: AffiliateStore; label: string; url: string };

type StoreConfig = { label: string; search: (q: string) => string };

/** Highest payout first; the first one is shown as the primary button. */
const STORES: Record<AffiliateStore, StoreConfig> = {
  nootropicsDepot: {
    label: 'Nootropics Depot',
    search: (q) => `https://nootropicsdepot.com/search.php?search_query=${encodeURIComponent(q)}`,
  },
  iherb: {
    label: 'iHerb',
    search: (q) => `https://www.iherb.com/search?kw=${encodeURIComponent(q)}`,
  },
};

const STORE_ORDER: AffiliateStore[] = ['nootropicsDepot', 'iherb'];

/** True when a tracking value is still the placeholder. */
function isPlaceholder(tracking: string): boolean {
  return !/^https:\/\//.test(tracking);
}

/**
 * Wrap a store URL in its impact.com-style tracking link (`?u=` deep link).
 * With a placeholder tracking value, returns the plain store URL.
 */
export function withTracking(storeUrl: string, tracking: string): string {
  if (isPlaceholder(tracking)) return storeUrl;
  const sep = tracking.includes('?') ? '&' : '?';
  return `${tracking}${sep}u=${encodeURIComponent(storeUrl)}`;
}

/**
 * Affiliate buy links for a dictionary entry, best payout first, or [] when the
 * entry must not have any.
 *
 * Rules: OTC supplements only. Never for unregulated (gray-market or
 * prescription) entries, never for entries flagged `noAffiliate`. Links live
 * only on dictionary pages; they are never shown with, or chosen by, an
 * experiment verdict.
 */
export function affiliateLinks(
  entry: DictionaryEntry,
  tracking: Record<AffiliateStore, string> = AFFILIATE_TRACKING,
): AffiliateLink[] {
  if (entry.kind !== 'supplement' || entry.noAffiliate) return [];
  return STORE_ORDER.map((store) => ({
    store,
    label: STORES[store].label,
    url: withTracking(STORES[store].search(entry.name), tracking[store]),
  }));
}
