/**
 * App-wide analytics (PostHog). `track` and `trackOnce` are safe to call from
 * any screen: they do nothing without a PostHog key (see src/config/analytics.ts),
 * after the user opts out, or when the database can't open. What may be sent
 * is fixed in ./events.ts.
 */
import { Platform } from 'react-native';
import { posthogConfig } from '@/config/analytics';
import { getDatabase } from '@/db';
import { createTracker } from './tracker';

export * from './events';
export {
  analyticsOptedOut,
  anonymousId,
  setAnalyticsOptOut,
  analyticsProgressConsent,
  setAnalyticsProgressConsent,
} from './tracker';

const tracker = createTracker({
  getDb: () => {
    try {
      return getDatabase();
    } catch {
      return null;
    }
  },
  config: posthogConfig,
  platform: Platform.OS,
});

export const track = tracker.track;
export const trackOnce = tracker.trackOnce;
export const flushAnalytics = tracker.flush;
