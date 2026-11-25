import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getDatabase } from '@/db';
import { loadHealthAdapter } from './load';
import { syncHealth } from './store';

/** Pull new nights from Health on launch and on every return to the app. */
export function useHealthSync(): void {
  useEffect(() => {
    const run = () => {
      try {
        void syncHealth(getDatabase(), loadHealthAdapter()).catch(() => undefined);
      } catch {
        // Not ready yet; the next foreground retries.
      }
    };
    run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
    });
    return () => sub.remove();
  }, []);
}
