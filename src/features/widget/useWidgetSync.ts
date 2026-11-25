import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getDatabase } from '@/db';
import { onProgressClaimed } from '@/features/gamification';
import { loadWidgetBridge } from './load';
import { syncWidgets } from './sync';

/** Fire-and-forget refresh of the widget and Live Activity. Never throws. */
export function refreshWidgets(): void {
  try {
    void syncWidgets(getDatabase(), loadWidgetBridge()).catch(() => undefined);
  } catch {
    // The database or native module isn't ready; the next foreground retries.
  }
}

/**
 * Keep the home-screen widget and the check-in Live Activity in step with the
 * app: refresh on launch and every time the app returns to the foreground.
 * Every recorded dose, check-in or reaction test refreshes it too.
 */
export function useWidgetSync(): void {
  useEffect(() => {
    refreshWidgets();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshWidgets();
    });
    const unsubscribe = onProgressClaimed(refreshWidgets);
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, []);
}
