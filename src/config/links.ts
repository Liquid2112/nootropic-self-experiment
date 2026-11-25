/**
 * Public URLs the app links to. The App Store needs the privacy policy URL in
 * App Store Connect and a link to it (plus the terms) on the paywall.
 */

/** Plain-language privacy policy (docs/privacy-policy.md in this repo). */
export const PRIVACY_POLICY_URL =
  'https://github.com/Liquid2112/nootropic-self-experiment/blob/main/docs/privacy-policy.md';

/** Apple's standard end-user license agreement, used as the terms of use. */
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * Affiliate stores, highest payout first (rates checked 2026-11-25):
 * - Nootropics Depot: 15% on new customers, 5% returning (via impact.com).
 * - iHerb: 5% default, up to 25% for qualified content partners; 7-day cookie.
 *
 * PLACEHOLDERS: paste each store's deep-link tracking base from its affiliate
 * dashboard (an impact.com link like "https://xxxx.sjv.io/c/123/456/789").
 * Until then the buttons go straight to the store search and earn nothing.
 */
export const AFFILIATE_TRACKING = {
  nootropicsDepot: 'REPLACE_WITH_ND_TRACKING_LINK',
  iherb: 'REPLACE_WITH_IHERB_TRACKING_LINK',
} as const;

/** Disclosure shown next to every affiliate button (FTC; above the buttons). */
export const AFFILIATE_DISCLOSURE =
  'Affiliate links: we may earn a commission if you buy, at no extra cost to you. It never affects what this app says about a supplement or your results.';

/**
 * Kill switch for the gray-market / prescription section of the Library. Flip
 * to false if App Review objects (guideline 1.4.3); the entries then disappear
 * from search, filters and direct links.
 */
export const SHOW_UNREGULATED_ENTRIES = true;
