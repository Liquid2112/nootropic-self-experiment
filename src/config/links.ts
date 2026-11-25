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
 * Amazon Associates tracking tag. PLACEHOLDER: replace with the real tag from
 * the Associates dashboard (format "yourtag-20") before launch. Links still
 * work with the placeholder; they just earn nothing.
 */
export const AMAZON_ASSOCIATE_TAG = 'REPLACE_WITH_TAG-20';

/** Required Amazon Associates disclosure, shown next to every affiliate link. */
export const AMAZON_DISCLOSURE = 'As an Amazon Associate I earn from qualifying purchases.';

/**
 * Kill switch for the gray-market / prescription section of the Library. Flip
 * to false if App Review objects (guideline 1.4.3); the entries then disappear
 * from search, filters and direct links.
 */
export const SHOW_UNREGULATED_ENTRIES = true;
