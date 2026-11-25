/**
 * Analytics events — the complete list of what the app may send, and the
 * privacy filter every event passes through. Pure, so tests pin both.
 *
 * Privacy rule (from the privacy policy): analytics counts steps, never
 * contents. No test scores, ratings, notes, Health data, supplement names,
 * quiz answers, goals, or anything the user typed. The filter enforces it
 * structurally: an event may carry only the properties allowlisted for it, and
 * every value must be a small integer or a short lowercase enum token, so free
 * text can't slip through even by mistake.
 */

/** The launch funnel, in order, then the daily retention events. */
export const FUNNEL = [
  'onboarding_started',
  'quiz_completed',
  'paywall_viewed',
  'trial_started',
  'experiment_started',
  'baseline_completed',
  'experiment_completed',
  'verdict_shared',
] as const;

export type FunnelEvent = (typeof FUNNEL)[number];

export type AnalyticsEvent =
  | FunnelEvent
  /** Once per local day the app is opened during a run: the retention curve. */
  | 'run_day_active'
  | 'check_in_completed'
  | 'dose_logged';

export type PropValue = string | number | boolean;
export type EventProps = Record<string, PropValue>;

/** The only properties each event may carry. Anything else is dropped. */
export const ALLOWED_PROPS: Record<AnalyticsEvent, readonly string[]> = {
  onboarding_started: [],
  quiz_completed: [],
  paywall_viewed: ['source'],
  trial_started: ['plan_period', 'trial_days'],
  experiment_started: ['blinding_mode', 'length_days'],
  baseline_completed: [],
  experiment_completed: ['length_days', 'days_checked_in'],
  verdict_shared: [],
  run_day_active: ['run_day', 'phase'],
  check_in_completed: ['run_day', 'phase'],
  dose_logged: ['run_day'],
};

const TOKEN = /^[a-z0-9_]{1,24}$/;

/**
 * Keep only allowlisted props whose values are booleans, integers in 0..400, or
 * short lowercase tokens like "sealed" or "annual".
 */
export function sanitizeProps(event: AnalyticsEvent, props: EventProps = {}): EventProps {
  const allowed = ALLOWED_PROPS[event];
  const out: EventProps = {};
  for (const key of allowed) {
    const v = props[key];
    if (typeof v === 'boolean') out[key] = v;
    else if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 400) out[key] = v;
    else if (typeof v === 'string' && TOKEN.test(v)) out[key] = v;
  }
  return out;
}

/** Where the user is in their run, for the retention events. */
export type RunPosition = { phase: 'baseline' | 'run'; runDay: number };

/**
 * Map a check-in day index to the retention position: baseline days count
 * 1..3, run days 1..N. Null outside both.
 */
export function runPosition(dayIndex: number | null, baselineDays: number): RunPosition | null {
  if (dayIndex === null) return null;
  if (dayIndex < 0) return { phase: 'baseline', runDay: baselineDays + dayIndex + 1 };
  return { phase: 'run', runDay: dayIndex + 1 };
}

/** One event as PostHog's batch API expects it. */
export type CapturedEvent = {
  event: AnalyticsEvent;
  timestamp: string;
  properties: Record<string, PropValue>;
};

/**
 * Build the PostHog event. Personless (no person profile) and with GeoIP
 * lookup off, so PostHog stores no location derived from the IP address.
 */
export function buildEvent(
  event: AnalyticsEvent,
  props: EventProps | undefined,
  ctx: { distinctId: string; platform: string; now: Date },
): CapturedEvent {
  return {
    event,
    timestamp: ctx.now.toISOString(),
    properties: {
      ...sanitizeProps(event, props),
      distinct_id: ctx.distinctId,
      $process_person_profile: false,
      $geoip_disable: true,
      $lib: 'placebo-app',
      $os: ctx.platform,
    },
  };
}
