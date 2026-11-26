import { LINK_DOMAIN } from './domain';

/**
 * Public URLs the app links to. The App Store needs the privacy policy URL in
 * App Store Connect and a link to it (plus the terms) on the paywall.
 */

/** Plain-language privacy policy (docs/privacy-policy.md in this repo). */
export const PRIVACY_POLICY_URL = `https://${LINK_DOMAIN}/privacy`;

/** Support page (App Store "Support URL"). */
export const SUPPORT_URL = `https://${LINK_DOMAIN}/support`;

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
 * Kill switch for the gray-market / prescription section of the Library. When
 * false the entries disappear from search, filters and direct links.
 *
 * Off for 1.0 (Shubh's call, 2026-11-25): App Review guideline 1.4.3 risk and a
 * higher age rating, for a section nobody needs to run an experiment. Turn it
 * back on in an update once the app is approved (store/app-review.md #2).
 */
export const SHOW_UNREGULATED_ENTRIES = false;

/**
 * Base for shareable links: referral codes (/r/CODE). The domain comes from src/config/domain.ts,
 * which app.config.ts also uses for universal links; landing/.well-known/
 * holds the files the domain must serve. Until it's live, placebo:// links
 * (the app scheme) still open the app.
 */
export const SHARE_LINK_BASE = `https://${LINK_DOMAIN}`;
