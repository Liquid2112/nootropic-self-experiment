/**
 * PostHog product analytics (project 766766, US cloud).
 *
 * The project API key is a public, write-only client key: it can send events
 * but can't read any data, so it ships in the app like any client SDK key.
 * EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST override it (for example a
 * separate dev project); setting the env key to "off" disables analytics.
 */
export const POSTHOG_PROJECT_KEY = 'phc_sxBKZUfyEspSVe5wo2tmEmAobAoq8ZgtyTyyhHZdSi3X';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

export function posthogConfig(): { apiKey: string; host: string } {
  const env = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  return {
    apiKey: env === 'off' ? '' : env || POSTHOG_PROJECT_KEY,
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || POSTHOG_HOST,
  };
}
