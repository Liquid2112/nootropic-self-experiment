import { POSTHOG_PROJECT_KEY, posthogConfig } from '@/config/analytics';
import { migrate } from '@/db/schema';
import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import {
  ALLOWED_PROPS,
  CONSENT_FREE_EVENTS,
  FUNNEL,
  needsProgressConsent,
  buildEvent,
  runPosition,
  sanitizeProps,
  type AnalyticsEvent,
} from '@/features/analytics/events';
import { createClient } from '@/features/analytics/client';
import {
  anonymousId,
  createTracker,
  setAnalyticsOptOut,
  setAnalyticsProgressConsent,
} from '@/features/analytics/tracker';

function db() {
  const d = createMemoryDriver();
  migrate(d);
  return d;
}

describe('privacy filter', () => {
  it('drops any property that is not allowlisted for the event', () => {
    expect(
      sanitizeProps('check_in_completed', {
        run_day: 5,
        phase: 'run',
        pvt_median_ms: 287,
        mood: 4,
        supplement: 'caffeine',
      }),
    ).toEqual({ run_day: 5, phase: 'run' });
  });

  it('drops free text and odd numbers even on allowlisted keys', () => {
    expect(sanitizeProps('trial_started', { plan_period: 'I feel anxious today', trial_days: 7 })).toEqual({
      trial_days: 7,
    });
    expect(sanitizeProps('dose_logged', { run_day: 3.7 })).toEqual({});
    expect(sanitizeProps('dose_logged', { run_day: 99999 })).toEqual({});
  });

  it('never allowlists scores, Health data, supplements, goals or notes', () => {
    const keys = Object.values(ALLOWED_PROPS).flat().join(' ');
    expect(keys).not.toMatch(/score|pvt|nback|mood|focus|energy|sleep|hrv|heart|supplement|goal|note|verdict|reaction/);
  });

  it('builds personless events with GeoIP off', () => {
    const e = buildEvent('run_day_active', { run_day: 2, phase: 'baseline' }, {
      distinctId: 'anon_x',
      platform: 'ios',
      now: new Date('2026-12-02T08:00:00Z'),
    });
    expect(e).toEqual({
      event: 'run_day_active',
      timestamp: '2026-12-02T08:00:00.000Z',
      properties: {
        run_day: 2,
        phase: 'baseline',
        distinct_id: 'anon_x',
        $process_person_profile: false,
        $geoip_disable: true,
        $lib: 'placebo-app',
        $os: 'ios',
      },
    });
  });

  it('covers the whole funnel in order', () => {
    expect(FUNNEL).toEqual([
      'onboarding_started',
      'quiz_completed',
      'paywall_viewed',
      'trial_started',
      'experiment_started',
      'baseline_completed',
      'experiment_completed',
      'verdict_shared',
    ]);
  });
});

describe('runPosition', () => {
  it('counts baseline days 1..3 and run days from 1', () => {
    expect(runPosition(-3, 3)).toEqual({ phase: 'baseline', runDay: 1 });
    expect(runPosition(-1, 3)).toEqual({ phase: 'baseline', runDay: 3 });
    expect(runPosition(0, 3)).toEqual({ phase: 'run', runDay: 1 });
    expect(runPosition(27, 3)).toEqual({ phase: 'run', runDay: 28 });
    expect(runPosition(null, 3)).toBeNull();
  });
});

describe('client', () => {
  it('batches to the PostHog /batch/ endpoint with the project key', async () => {
    const sent: { url: string; body: string }[] = [];
    const c = createClient({
      apiKey: 'phc_test',
      host: 'https://us.i.posthog.com/',
      distinctId: 'anon_1',
      platform: 'ios',
      transport: async (url, body) => void sent.push({ url, body }),
    });
    c.capture('onboarding_started');
    c.capture('quiz_completed');
    expect(c.queued()).toBe(2);
    await c.flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe('https://us.i.posthog.com/batch/');
    const body = JSON.parse(sent[0]!.body);
    expect(body.api_key).toBe('phc_test');
    expect(body.batch.map((e: { event: AnalyticsEvent }) => e.event)).toEqual(['onboarding_started', 'quiz_completed']);
    expect(c.queued()).toBe(0);
  });

  it('swallows network errors', async () => {
    const c = createClient({
      apiKey: 'k',
      host: 'https://h',
      distinctId: 'a',
      platform: 'ios',
      transport: async () => {
        throw new Error('offline');
      },
    });
    c.capture('onboarding_started');
    await expect(c.flush()).resolves.toBeUndefined();
  });
});

describe('tracker', () => {
  function tracker(d: ReturnType<typeof db>, apiKey = 'phc_test') {
    const sent: string[] = [];
    const t = createTracker({
      getDb: () => d,
      config: () => ({ apiKey, host: 'https://h' }),
      platform: 'ios',
      transport: async (_url, body) => {
        for (const e of JSON.parse(body).batch) sent.push(e.event);
      },
    });
    return { t, sent };
  }

  it('sends nothing without a PostHog key', async () => {
    const d = db();
    const { t, sent } = tracker(d, '');
    t.track('onboarding_started');
    t.trackOnce('x', 'baseline_completed');
    await t.flush();
    expect(sent).toEqual([]);
  });

  it('sends nothing after the user opts out', async () => {
    const d = db();
    setAnalyticsOptOut(d, true);
    const { t, sent } = tracker(d);
    t.track('onboarding_started');
    await t.flush();
    expect(sent).toEqual([]);
  });

  it('sends only the onboarding and purchase funnel without the progress opt-in', async () => {
    const d = db();
    const { t, sent } = tracker(d);
    t.track('onboarding_started');
    t.track('paywall_viewed');
    t.track('experiment_started', { blinding_mode: 'sealed', length_days: 28 });
    t.track('check_in_completed', { run_day: 3, phase: 'run' });
    t.trackOnce('active:e1:2026-12-02', 'run_day_active', { run_day: 1, phase: 'run' });
    await t.flush();
    expect(sent).toEqual(['onboarding_started', 'paywall_viewed']);
  });

  it('sends progress events once the user opts in, and a skipped trackOnce can still fire later', async () => {
    const d = db();
    const { t, sent } = tracker(d);
    t.trackOnce('active:e1:2026-12-02', 'run_day_active', { run_day: 1, phase: 'run' });
    setAnalyticsProgressConsent(d, true);
    t.trackOnce('active:e1:2026-12-02', 'run_day_active', { run_day: 1, phase: 'run' });
    t.track('check_in_completed', { run_day: 1, phase: 'run' });
    await t.flush();
    expect(sent).toEqual(['run_day_active', 'check_in_completed']);
  });

  it('opting out wins over the progress opt-in', async () => {
    const d = db();
    setAnalyticsProgressConsent(d, true);
    setAnalyticsOptOut(d, true);
    const { t, sent } = tracker(d);
    t.track('check_in_completed', { run_day: 1, phase: 'run' });
    await t.flush();
    expect(sent).toEqual([]);
  });

  it('needs opt-in for every event outside the short consent-free list', () => {
    const all = Object.keys(ALLOWED_PROPS) as AnalyticsEvent[];
    for (const e of all) expect(needsProgressConsent(e)).toBe(!CONSENT_FREE_EVENTS.includes(e));
    expect(CONSENT_FREE_EVENTS).toEqual(['onboarding_started', 'quiz_completed', 'paywall_viewed', 'trial_started']);
  });

  it('trackOnce sends an event once per key', async () => {
    const d = db();
    setAnalyticsProgressConsent(d, true);
    const { t, sent } = tracker(d);
    t.trackOnce('active:e1:2026-12-02', 'run_day_active', { run_day: 1, phase: 'run' });
    t.trackOnce('active:e1:2026-12-02', 'run_day_active', { run_day: 1, phase: 'run' });
    t.trackOnce('active:e1:2026-12-03', 'run_day_active', { run_day: 2, phase: 'run' });
    await t.flush();
    expect(sent).toEqual(['run_day_active', 'run_day_active']);
  });

  it('keeps one random anonymous id per install', () => {
    const d = db();
    const id = anonymousId(d);
    expect(id).toMatch(/^anon_[a-z0-9]{20}$/);
    expect(anonymousId(d)).toBe(id);
  });

  it('never throws when the database is unavailable', () => {
    const t = createTracker({ getDb: () => null, config: () => ({ apiKey: 'k', host: 'h' }), platform: 'ios' });
    expect(() => t.track('onboarding_started')).not.toThrow();
  });
});

describe('config', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('uses the built-in project key on the US host by default', () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
    expect(posthogConfig()).toEqual({ apiKey: POSTHOG_PROJECT_KEY, host: 'https://us.i.posthog.com' });
    expect(POSTHOG_PROJECT_KEY).toMatch(/^phc_/);
  });

  it('can be switched off or pointed elsewhere from the env', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'off';
    expect(posthogConfig().apiKey).toBe('');
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_dev';
    expect(posthogConfig().apiKey).toBe('phc_dev');
  });
});
