/** Web and other platforms have no Health store. */
import { unavailableHealthAdapter, type HealthAdapter } from './adapter';

export const nativeHealthAdapter: HealthAdapter = unavailableHealthAdapter;
