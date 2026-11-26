/**
 * Paywall: the Pro subscription that unlocks running experiments.
 *
 * Business rule: the standalone reaction test is free; starting an experiment
 * (the Experiment setup "Start my experiment" step) requires Pro. The store
 * products carry a free trial (3 or 7 days, configured in App Store Connect /
 * Play Console and RevenueCat), so the first experiment starts on the trial.
 *
 * Purchases go through RevenueCat (`react-native-purchases`). Everything the
 * screens need is behind `PurchasesAdapter`, so the pure logic here is unit
 * tested without the native module, and the app keeps working when the module
 * or the API key is missing (Expo Go without keys, tests): the adapter then
 * reports `available: false`.
 */

/** RevenueCat entitlement identifier that marks a Pro user. */
export const PRO_ENTITLEMENT_ID = 'pro';

export type PlanPeriod = 'monthly' | 'annual' | 'weekly' | 'other';

/** One purchasable plan, flattened from a RevenueCat package. */
export type Plan = {
  /** RevenueCat package identifier, passed back to `purchase`. */
  id: string;
  period: PlanPeriod;
  /** Localized price string from the store, e.g. "$39.99". */
  priceString: string;
  /** Raw price in the store currency, used for savings math. */
  price: number;
  /** Length of the free trial in days, or null when the plan has none. */
  trialDays: number | null;
};

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'failed';

export type PurchasesAdapter = {
  /** False when the native module or API key is missing. */
  available: boolean;
  /**
   * True for the test-build preview (Expo Go / dev, no RevenueCat key): plans
   * show the launch prices and "buying" only unlocks Pro for this session.
   * Nothing is charged, tracked, or scheduled.
   */
  preview?: boolean;
  isPro(): Promise<boolean>;
  getPlans(): Promise<Plan[]>;
  /** Plans in a named RevenueCat offering (e.g. the exit offer); [] when absent. */
  getOffering(offeringId: string): Promise<Plan[]>;
  purchase(planId: string): Promise<PurchaseOutcome>;
  /** Restores prior purchases; resolves true when Pro is active afterwards. */
  restore(): Promise<boolean>;
};

export const unavailablePurchasesAdapter: PurchasesAdapter = {
  available: false,
  async isPro() {
    return false;
  },
  async getPlans() {
    return [];
  },
  async getOffering() {
    return [];
  },
  async purchase() {
    return 'failed';
  },
  async restore() {
    return false;
  },
};

// --- pure helpers ----------------------------------------------------------

/** Days in one unit of a store intro period. */
const PERIOD_UNIT_DAYS: Record<string, number> = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
};

type IntroPriceLike = {
  price?: number;
  periodUnit?: string;
  periodNumberOfUnits?: number;
  cycles?: number;
};

/**
 * Free-trial length in days from a store intro price, or null when the intro
 * offer is not free (a paid intro discount is not a trial).
 */
export function trialDaysFromIntro(intro: IntroPriceLike | null | undefined): number | null {
  if (!intro || intro.price !== 0) return null;
  const unitDays = intro.periodUnit ? PERIOD_UNIT_DAYS[intro.periodUnit] : undefined;
  const units = intro.periodNumberOfUnits ?? 0;
  const cycles = intro.cycles ?? 1;
  if (!unitDays || units <= 0) return null;
  return unitDays * units * Math.max(1, cycles);
}

function periodFromPackageType(packageType: unknown): PlanPeriod {
  switch (packageType) {
    case 'MONTHLY':
      return 'monthly';
    case 'ANNUAL':
      return 'annual';
    case 'WEEKLY':
      return 'weekly';
    default:
      return 'other';
  }
}

type PackageLike = {
  identifier?: string;
  packageType?: unknown;
  product?: {
    priceString?: string;
    price?: number;
    introPrice?: IntroPriceLike | null;
  };
};

/** Flatten a RevenueCat package into a Plan; null when it lacks a price. */
export function planFromPackage(pkg: PackageLike): Plan | null {
  const product = pkg.product;
  if (!pkg.identifier || !product || typeof product.priceString !== 'string') return null;
  return {
    id: pkg.identifier,
    period: periodFromPackageType(pkg.packageType),
    priceString: product.priceString,
    price: typeof product.price === 'number' ? product.price : 0,
    trialDays: trialDaysFromIntro(product.introPrice),
  };
}

const PERIOD_ORDER: Record<PlanPeriod, number> = { annual: 0, monthly: 1, weekly: 2, other: 3 };

/** Annual first (the default pick), then monthly, weekly, anything else. */
export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period]);
}

/** Whole-percent saving of the annual plan over 12 months of the monthly one. */
export function annualSavingsPercent(plans: Plan[]): number | null {
  const annual = plans.find((p) => p.period === 'annual');
  const monthly = plans.find((p) => p.period === 'monthly');
  if (!annual || !monthly || monthly.price <= 0 || annual.price <= 0) return null;
  const saving = 1 - annual.price / (monthly.price * 12);
  return saving > 0 ? Math.round(saving * 100) : null;
}

const PERIOD_NOUN: Record<PlanPeriod, string> = {
  annual: 'year',
  monthly: 'month',
  weekly: 'week',
  other: 'period',
};

/** The main button label for the selected plan. */
export function ctaLabel(plan: Plan | undefined): string {
  if (!plan) return 'Continue';
  return plan.trialDays ? `Start ${plan.trialDays}-day free trial` : 'Subscribe';
}

/**
 * The auto-renewal disclosure the App Store requires next to the button: what
 * is charged, how often, and when.
 */
export function renewalTerms(plan: Plan | undefined): string {
  if (!plan) return '';
  const per = PERIOD_NOUN[plan.period];
  const charge = `${plan.priceString}/${per}`;
  const lead = plan.trialDays
    ? `Free for ${plan.trialDays} days, then ${charge}.`
    : `${charge}.`;
  return `${lead} Renews automatically until you cancel. Cancel anytime in your App Store or Google Play settings, at least 24 hours before the ${plan.trialDays ? 'trial' : 'period'} ends, to avoid being charged.`;
}

// --- honest trial timeline ---------------------------------------------------

/** The exit offer is a separate RevenueCat offering with this identifier. */
export const EXIT_OFFERING_ID = 'exit_offer';

/** Never discount more than this on the exit offer, whatever the store says. */
export const MAX_EXIT_DISCOUNT_PERCENT = 30;

/** Billing-reminder notification id, so it can be replaced, never doubled. */
export const BILLING_REMINDER_ID = 'trial-billing-reminder';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Days before the trial ends that the reminder fires: 2 on longer trials, else 1. */
export function reminderLeadDays(trialDays: number): number {
  return trialDays >= 5 ? 2 : 1;
}

export type TrialStep = {
  id: 'today' | 'reminder' | 'billing';
  /** "Today", "Day 5", "Day 7". */
  when: string;
  title: string;
  body: string;
  date: Date;
};

/**
 * The three honest steps of a free trial: what you get today, when we remind
 * you, and exactly when and how much you're charged. Null without a trial.
 */
export function trialTimeline(plan: Plan | undefined, today: Date): TrialStep[] | null {
  if (!plan?.trialDays) return null;
  const days = plan.trialDays;
  const lead = reminderLeadDays(days);
  const per = PERIOD_NOUN[plan.period];
  return [
    {
      id: 'today',
      when: 'Today',
      title: 'Your experiment starts',
      body: 'Full access starts. You pay nothing today.',
      date: startOfDay(today),
    },
    {
      id: 'reminder',
      when: `Day ${days - lead}`,
      title: 'We remind you',
      body: `We send you a reminder ${lead === 1 ? 'the day' : `${lead} days`} before billing, if notifications are on.`,
      date: addDays(today, days - lead),
    },
    {
      id: 'billing',
      when: `Day ${days}`,
      title: `You're charged ${plan.priceString}/${per}`,
      body: `${plan.priceString} for the ${per}. Cancel at least 24 hours before this and you pay nothing.`,
      date: addDays(today, days),
    },
  ];
}

/**
 * The local notification sent before the trial converts, at 10 AM on the
 * reminder day. Null without a trial.
 */
export function billingReminder(
  plan: Plan | undefined,
  start: Date,
): { id: string; title: string; body: string; date: Date } | null {
  if (!plan?.trialDays) return null;
  const lead = reminderLeadDays(plan.trialDays);
  const date = addDays(start, plan.trialDays - lead);
  date.setHours(10, 0, 0, 0);
  const when = lead === 1 ? 'tomorrow' : `in ${lead} days`;
  return {
    id: BILLING_REMINDER_ID,
    title: `Your free trial ends ${when}`,
    body: `After that it's ${plan.priceString}/${PERIOD_NOUN[plan.period]}. Want to keep going? Do nothing. Want to stop? Cancel in your store settings.`,
    date,
  };
}

/** "$39.99/year": a plan's price and billing period. */
export function pricePerPeriod(plan: Plan): string {
  return `${plan.priceString}/${PERIOD_NOUN[plan.period]}`;
}

/** "Works out to $0.77 a week" for a yearly plan; null otherwise. */
export function weeklyEquivalent(plan: Plan): string | null {
  if (plan.period !== 'annual' || plan.price <= 0) return null;
  const symbol = plan.priceString.replace(/[\d.,\s]/g, '') || '$';
  return `Works out to ${symbol}${(plan.price / 52).toFixed(2)} a week`;
}

/** The headline price line: price as prominent as "free", never hidden. */
export function priceLine(plan: Plan): string {
  const per = PERIOD_NOUN[plan.period];
  return plan.trialDays
    ? `${plan.trialDays} days free, then ${plan.priceString}/${per}`
    : `${plan.priceString}/${per}`;
}

/**
 * The exit offer, if it's honest: the same billing period as a regular plan
 * and a real discount of at most MAX_EXIT_DISCOUNT_PERCENT. Anything else
 * (no matching plan, no saving, a bigger cut) is not shown.
 */
export function pickExitOffer(
  regular: Plan[],
  offer: Plan[],
): { plan: Plan; regular: Plan; percentOff: number } | null {
  for (const candidate of sortPlans(offer)) {
    const base = regular.find((p) => p.period === candidate.period);
    if (!base || base.price <= 0 || candidate.price <= 0) continue;
    const percentOff = Math.round((1 - candidate.price / base.price) * 100);
    if (percentOff > 0 && percentOff <= MAX_EXIT_DISCOUNT_PERCENT) {
      return { plan: candidate, regular: base, percentOff };
    }
  }
  return null;
}

export type SetupGate = 'proceed' | 'paywall';

/**
 * Whether "Start my experiment" may create the experiment or must show the paywall.
 * Pro users proceed. When purchases are unavailable (no native module or key),
 * development builds proceed so the app stays testable; release builds show the
 * paywall, which explains that purchases could not load.
 */
export function setupGate(input: { isPro: boolean; available: boolean; isDev: boolean }): SetupGate {
  if (input.isPro) return 'proceed';
  if (!input.available && input.isDev) return 'proceed';
  return 'paywall';
}

// --- RevenueCat adapter ----------------------------------------------------

type CustomerInfoLike = {
  entitlements?: { active?: Record<string, unknown> };
};

type PurchasesModuleLike = {
  configure: (config: { apiKey: string }) => void;
  getCustomerInfo: () => Promise<CustomerInfoLike>;
  getOfferings: () => Promise<{
    current?: { availablePackages?: PackageLike[] } | null;
    all?: Record<string, { availablePackages?: PackageLike[] } | undefined>;
  }>;
  purchasePackage: (pkg: PackageLike) => Promise<{ customerInfo: CustomerInfoLike }>;
  restorePurchases: () => Promise<CustomerInfoLike>;
};

function hasPro(info: CustomerInfoLike | undefined): boolean {
  return Boolean(info?.entitlements?.active?.[PRO_ENTITLEMENT_ID]);
}

/** Wrap the react-native-purchases default export. Isolated for testability. */
export function createRevenueCatAdapter(mod: unknown, apiKey: string | undefined): PurchasesAdapter {
  const api = mod as Partial<PurchasesModuleLike> | undefined;
  if (
    !apiKey ||
    !api ||
    typeof api.configure !== 'function' ||
    typeof api.getCustomerInfo !== 'function' ||
    typeof api.getOfferings !== 'function' ||
    typeof api.purchasePackage !== 'function' ||
    typeof api.restorePurchases !== 'function'
  ) {
    return unavailablePurchasesAdapter;
  }
  const sdk = api as PurchasesModuleLike;
  sdk.configure({ apiKey });

  // Every package seen so far, from the current offering and any named one,
  // so `purchase` can find a plan whichever list it came from.
  const packages = new Map<string, PackageLike>();
  const remember = (list: PackageLike[]): Plan[] => {
    for (const pkg of list) {
      if (pkg.identifier) packages.set(pkg.identifier, pkg);
    }
    return sortPlans(list.map(planFromPackage).filter((p): p is Plan => p !== null));
  };

  return {
    available: true,
    async isPro() {
      try {
        return hasPro(await sdk.getCustomerInfo());
      } catch {
        return false;
      }
    },
    async getPlans() {
      try {
        const offerings = await sdk.getOfferings();
        return remember(offerings.current?.availablePackages ?? []);
      } catch {
        return [];
      }
    },
    async getOffering(offeringId: string) {
      try {
        const offerings = await sdk.getOfferings();
        return remember(offerings.all?.[offeringId]?.availablePackages ?? []);
      } catch {
        return [];
      }
    },
    async purchase(planId: string) {
      const pkg = packages.get(planId);
      if (!pkg) return 'failed';
      try {
        const { customerInfo } = await sdk.purchasePackage(pkg);
        return hasPro(customerInfo) ? 'purchased' : 'failed';
      } catch (err) {
        const cancelled =
          typeof err === 'object' && err !== null && (err as { userCancelled?: boolean }).userCancelled === true;
        return cancelled ? 'cancelled' : 'failed';
      }
    },
    async restore() {
      try {
        return hasPro(await sdk.restorePurchases());
      } catch {
        return false;
      }
    },
  };
}

/** The platform's public RevenueCat API key from the environment, if set. */
export function revenueCatApiKey(os: string): string | undefined {
  const key =
    os === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : os === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
        : undefined;
  return key && key.length > 0 ? key : undefined;
}

/** Launch prices from the business plan, shown only in test builds. */
export const PREVIEW_PLANS: Plan[] = [
  { id: 'preview_annual', period: 'annual', priceString: '$39.99', price: 39.99, trialDays: 7 },
  { id: 'preview_monthly', period: 'monthly', priceString: '$9.99', price: 9.99, trialDays: 7 },
];

/**
 * A stand-in store for development builds without a RevenueCat key, so the
 * paywall can be seen and walked through in Expo Go. Never used in release.
 */
export function createPreviewPurchasesAdapter(): PurchasesAdapter {
  let pro = false;
  return {
    available: true,
    preview: true,
    async isPro() {
      return pro;
    },
    async getPlans() {
      return PREVIEW_PLANS;
    },
    async getOffering() {
      return [];
    },
    async purchase() {
      pro = true;
      return 'purchased';
    },
    async restore() {
      return pro;
    },
  };
}

let cachedAdapter: Promise<PurchasesAdapter> | null = null;

/**
 * Load and configure RevenueCat once per app session. Resolves to the
 * unavailable adapter when the module can't load or no key is set.
 */
export function loadPurchasesAdapter(os: string): Promise<PurchasesAdapter> {
  if (!cachedAdapter) {
    cachedAdapter = (async () => {
      const key = revenueCatApiKey(os);
      if (!key) {
        const preview =
          (globalThis as { __DEV__?: boolean }).__DEV__ === true ||
          process.env.EXPO_PUBLIC_PAYWALL_PREVIEW === '1';
        return preview
          ? createPreviewPurchasesAdapter()
          : unavailablePurchasesAdapter;
      }
      try {
        const mod: { default?: unknown } = await import('react-native-purchases');
        return createRevenueCatAdapter(mod.default ?? mod, key);
      } catch {
        return unavailablePurchasesAdapter;
      }
    })();
  }
  return cachedAdapter;
}
