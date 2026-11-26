import Constants, { ExecutionEnvironment } from 'expo-constants';
/**
 * Resolve the platform's widget bridge lazily, so a missing native module (Expo
 * Go, web) degrades to a no-op instead of crashing the home screen.
 */
import { unavailableWidgetBridge, type NativeWidgetBridge } from './bridge';

export function loadWidgetBridge(): NativeWidgetBridge {
  // Expo Go ships without custom native modules (expo-widgets, HealthKit, Nitro):
  // don't even try to load them there, so no native-module errors surface.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return unavailableWidgetBridge;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./native') as { nativeWidgetBridge: NativeWidgetBridge }).nativeWidgetBridge;
  } catch {
    return unavailableWidgetBridge;
  }
}
