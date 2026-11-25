import type { LiveActivityProps, TimelineEntry } from './model';

/**
 * The slice of expo-widgets the app uses, behind an interface so the sync logic
 * is tested with a fake and the app keeps working where the native module is
 * missing (Expo Go, web, tests).
 */
export type NativeWidgetBridge = {
  available: boolean;
  setTimeline(entries: TimelineEntry[]): void;
  runningActivityCount(): number;
  startActivity(props: LiveActivityProps, staleAtMs: number): Promise<void>;
  updateActivity(props: LiveActivityProps, staleAtMs: number): Promise<void>;
  endActivities(): Promise<void>;
};

export const unavailableWidgetBridge: NativeWidgetBridge = {
  available: false,
  setTimeline() {},
  runningActivityCount() {
    return 0;
  },
  async startActivity() {},
  async updateActivity() {},
  async endActivities() {},
};
