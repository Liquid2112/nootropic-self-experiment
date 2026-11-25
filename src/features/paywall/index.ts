/**
 * Paywall: the Pro subscription that unlocks running experiments.
 *
 * Business rule: the standalone reaction test is free; starting an experiment
 * (the Experiment setup "Confirm & start" step) requires Pro. The store
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
  isPro(): Promise<boolean>;
  getPlans(): Promise<Plan[]>;
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

export type SetupGate = 'proceed' | 'paywall';

/**
 * Whether "Confirm & start" may create the experiment or must show the paywall.
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
  getOfferings: () => Promise<{ current?: { availablePackages?: PackageLike[] } | null }>;
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

  let packages: PackageLike[] = [];

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
        packages = offerings.current?.availablePackages ?? [];
        return sortPlans(packages.map(planFromPackage).filter((p): p is Plan => p !== null));
      } catch {
        return [];
      }
    },
    async purchase(planId: string) {
      const pkg = packages.find((p) => p.identifier === planId);
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

let cachedAdapter: Promise<PurchasesAdapter> | null = null;

/**
 * Load and configure RevenueCat once per app session. Resolves to the
 * unavailable adapter when the module can't load or no key is set.
 */
export function loadPurchasesAdapter(os: string): Promise<PurchasesAdapter> {
  if (!cachedAdapter) {
    cachedAdapter = (async () => {
      const key = revenueCatApiKey(os);
      if (!key) return unavailablePurchasesAdapter;
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
