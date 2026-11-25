/**
 * Capture a view to an image and open the OS share sheet with it.
 *
 * react-native-view-shot and React Native's Share are native-only. They are
 * loaded lazily and guarded so importing this module never throws in a headless
 * environment (Node unit tests, SSR web): capture() returns null when the
 * native module is unavailable, and the caller degrades gracefully.
 */

import { type RefObject } from 'react';
import type { ViewRef } from './ShareCard';

type ViewShotModule = {
  captureRef: (ref: RefObject<ViewRef | null> | ViewRef, options?: Record<string, unknown>) => Promise<string>;
};

/** Lazily resolve react-native-view-shot, or null when it isn't available. */
function loadViewShot(): ViewShotModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-view-shot') as ViewShotModule;
  } catch {
    return null;
  }
}

/**
 * Capture `ref` to a PNG file URI. Returns null when view-shot is unavailable
 * (so a headless test or unsupported platform doesn't crash).
 */
export async function captureCard(ref: RefObject<ViewRef | null>): Promise<string | null> {
  const viewShot = loadViewShot();
  if (!viewShot || !ref.current) return null;
  try {
    // Export at 1080x1920, the native size for TikTok, Reels and Stories.
    return await viewShot.captureRef(ref.current, { format: 'png', quality: 1, width: 1080, height: 1920 });
  } catch {
    return null;
  }
}

/**
 * Capture the card and open the share sheet. Returns true when the share sheet
 * was invoked, false when capture or the native share was unavailable. Errors
 * (including the user dismissing the sheet) are swallowed so the screen stays
 * responsive.
 */
export async function shareCard(
  ref: RefObject<ViewRef | null>,
  message = 'My Placebo experiment result',
): Promise<boolean> {
  const uri = await captureCard(ref);
  if (!uri) return false;
  try {
    // Lazy import so the native module isn't required at module load.
    const { Share } = await import('react-native');
    await Share.share({ url: uri, message });
    return true;
  } catch {
    return false;
  }
}
