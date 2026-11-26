/**
 * The one place the app's web domain lives. Share links (keyholder, unlock,
 * referral), universal links / Android app links (app.config.ts) and the
 * support email all derive from it. Change it here, rebuild, and host
 * landing/.well-known/ on the same domain.
 *
 * Plain constants with no imports: app.config.ts loads this file at build time.
 */
export const LINK_DOMAIN = 'placebo.app';

/** Support and privacy contact (Cloudflare Email Routing forwards it). */
export const SUPPORT_EMAIL = `support@${LINK_DOMAIN}`;
