/**
 * A tiny PostHog client over the public batch endpoint. No SDK: the app sends
 * a handful of events a day, and plain fetch keeps the native build and the
 * privacy surface small (no autocapture, no session replay, no device info
 * beyond the OS name).
 */
import { buildEvent, type AnalyticsEvent, type CapturedEvent, type EventProps } from './events';

export type Transport = (url: string, body: string) => Promise<void>;

export const fetchTransport: Transport = async (url, body) => {
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
};

export type ClientOptions = {
  apiKey: string;
  host: string;
  distinctId: string;
  platform: string;
  transport?: Transport;
  /** Flush once this many events are queued. */
  batchSize?: number;
  now?: () => Date;
};

export type AnalyticsClient = {
  capture(event: AnalyticsEvent, props?: EventProps): void;
  /** Send everything queued. Never throws; a failed send is dropped. */
  flush(): Promise<void>;
  queued(): number;
};

export function createClient(opts: ClientOptions): AnalyticsClient {
  const transport = opts.transport ?? fetchTransport;
  const batchSize = opts.batchSize ?? 10;
  const now = opts.now ?? (() => new Date());
  const url = `${opts.host.replace(/\/+$/, '')}/batch/`;
  let queue: CapturedEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    try {
      await transport(url, JSON.stringify({ api_key: opts.apiKey, batch }));
    } catch {
      // Offline or blocked: analytics is best-effort and never retries forever.
    }
  }

  return {
    capture(event, props) {
      queue.push(buildEvent(event, props, { distinctId: opts.distinctId, platform: opts.platform, now: now() }));
      if (queue.length >= batchSize) {
        void flush();
      } else if (!timer) {
        timer = setTimeout(() => void flush(), 3000);
      }
    },
    flush,
    queued: () => queue.length,
  };
}
