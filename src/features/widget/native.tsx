/**
 * Fallback for platforms without home-screen widgets (web). Metro picks
 * native.ios.tsx / native.android.tsx on device.
 */
import { unavailableWidgetBridge, type NativeWidgetBridge } from './bridge';

export const nativeWidgetBridge: NativeWidgetBridge = unavailableWidgetBridge;
