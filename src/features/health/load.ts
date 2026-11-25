import { unavailableHealthAdapter, type HealthAdapter } from './adapter';

/** Resolve the platform's Health adapter lazily; a missing module is a no-op. */
export function loadHealthAdapter(): HealthAdapter {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./native') as { nativeHealthAdapter: HealthAdapter }).nativeHealthAdapter;
  } catch {
    return unavailableHealthAdapter;
  }
}
