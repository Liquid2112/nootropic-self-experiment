/**
 * Resolve the platform's widget bridge lazily, so a missing native module (Expo
 * Go, web) degrades to a no-op instead of crashing the home screen.
 */
import { unavailableWidgetBridge, type NativeWidgetBridge } from './bridge';

export function loadWidgetBridge(): NativeWidgetBridge {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./native') as { nativeWidgetBridge: NativeWidgetBridge }).nativeWidgetBridge;
  } catch {
    return unavailableWidgetBridge;
  }
}
