/**
 * PostHog product analytics. PLACEHOLDER: create a PostHog project, copy its
 * project API key (starts with "phc_") into EXPO_PUBLIC_POSTHOG_KEY in
 * .env.local and in the EAS environment. Until a key is set, analytics is
 * completely off and nothing leaves the device.
 *
 * Use the EU host (https://eu.i.posthog.com) if the project lives in the EU cloud.
 */
export function posthogConfig(): { apiKey: string; host: string } {
  return {
    apiKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  };
}
