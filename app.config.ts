import type { ConfigContext, ExpoConfig } from 'expo/config';

// Expo's config loader needs the explicit .ts extension, which a TS import
// statement can't carry without allowImportingTsExtensions; require keeps both happy.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { LINK_DOMAIN } = require('./src/config/domain.ts') as typeof import('./src/config/domain');

/**
 * Adds the domain-dependent parts of the native config on top of app.json, so
 * the link domain lives in one place (src/config/domain.ts).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const linkPaths = ['/r/'];
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      associatedDomains: [`applinks:${LINK_DOMAIN}`],
    },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: linkPaths.map((pathPrefix) => ({ scheme: 'https', host: LINK_DOMAIN, pathPrefix })),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };
};
