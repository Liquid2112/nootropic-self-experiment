/**
 * Device model capture — pure logic.
 *
 * The recorded device model lets the analysis spot a hardware change mid-run
 * (switching phones alters touch latency and therefore PVT RTs). This module is
 * deliberately free of any react-native import so it runs headless under Jest;
 * the screen reads Platform/expo-device and hands the result in as a
 * DeviceInfoReader (see readPlatformInfo in the Daily-test screen).
 */

export type DeviceInfoReader = {
  /** OS name, e.g. "ios" | "android" | "web". */
  os: string;
  /** OS version string when known. */
  osVersion: string | null;
  /** Precise model name when a device module provides it. */
  modelName: string | null;
};

/**
 * Compose a single device-model string for the test_session row from a reader.
 * Prefers a precise model name; otherwise falls back to "os version". Returns
 * null only when nothing at all is known.
 */
export function deviceModelLabel(info: DeviceInfoReader): string | null {
  if (info.modelName && info.modelName.trim().length > 0) {
    const osPart = info.osVersion ? ` (${info.os} ${info.osVersion})` : ` (${info.os})`;
    return `${info.modelName}${osPart}`;
  }
  const parts = [info.os, info.osVersion].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  const label = parts.join(' ').trim();
  return label.length > 0 ? label : null;
}
