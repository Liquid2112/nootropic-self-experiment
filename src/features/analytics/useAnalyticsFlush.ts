import { useEffect } from 'react';
import { AppState } from 'react-native';
import { flushAnalytics } from './index';

/** Send queued analytics when the app goes to the background. */
export function useAnalyticsFlush(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flushAnalytics();
    });
    return () => sub.remove();
  }, []);
}
