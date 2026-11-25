/**
 * Fire-and-forget haptic taps for rewarding moments. Every call is wrapped so a
 * device without haptics (or web) silently does nothing.
 */
import * as Haptics from 'expo-haptics';

export function tapLight(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  } catch {
    /* no haptics available */
  }
}

export function celebrate(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  } catch {
    /* no haptics available */
  }
}
