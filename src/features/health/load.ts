import Constants, { ExecutionEnvironment } from 'expo-constants';
import { unavailableHealthAdapter, type HealthAdapter } from './adapter';

/** Resolve the platform's Health adapter lazily; a missing module is a no-op. */
export function loadHealthAdapter(): HealthAdapter {
  // Expo Go ships without custom native modules (expo-widgets, HealthKit, Nitro):
  // don't even try to load them there, so no native-module errors surface.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return unavailableHealthAdapter;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./native') as { nativeHealthAdapter: HealthAdapter }).nativeHealthAdapter;
  } catch {
    return unavailableHealthAdapter;
  }
}
