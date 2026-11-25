import type { RawHealthData } from './model';

/**
 * The slice of Apple Health / Health Connect the app reads, behind an interface
 * so the sync logic is tested with a fake and the app degrades where the native
 * module is missing (Expo Go, web, simulator without Health, tests).
 */
export type HealthAdapter = {
  /** 'healthkit' | 'health_connect' | 'none' */
  source: string;
  /** Human name for the screen: "Apple Health", "Health Connect". */
  label: string;
  available(): Promise<boolean>;
  /** Shows the OS permission sheet. Resolves true when the sheet completed. */
  requestAccess(): Promise<boolean>;
  /** Read raw samples between two instants. */
  read(fromMs: number, toMs: number): Promise<RawHealthData>;
};

export const unavailableHealthAdapter: HealthAdapter = {
  source: 'none',
  label: 'Health',
  async available() {
    return false;
  },
  async requestAccess() {
    return false;
  },
  async read() {
    return { sleep: [], restingHr: [], hrv: [] };
  },
};
