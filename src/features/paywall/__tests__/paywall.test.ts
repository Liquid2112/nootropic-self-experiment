import {
  MAX_EXIT_DISCOUNT_PERCENT,
  annualSavingsPercent,
  billingReminder,
  pickExitOffer,
  priceLine,
  trialTimeline,
  createRevenueCatAdapter,
  ctaLabel,
  planFromPackage,
  renewalTerms,
  revenueCatApiKey,
  setupGate,
  sortPlans,
  trialDaysFromIntro,
  type Plan,
} from '..';

const monthly: Plan = { id: '$rc_monthly', period: 'monthly', priceString: '$7.99', price: 7.99, trialDays: 3 };
const annual: Plan = { id: '$rc_annual', period: 'annual', priceString: '$39.99', price: 39.99, trialDays: 7 };

describe('setupGate', () => {
  it('lets Pro users start', () => {
    expect(setupGate({ isPro: true, available: true, isDev: false })).toBe('proceed');
  });

  it('shows the paywall to non-Pro users', () => {
    expect(setupGate({ isPro: false, available: true, isDev: false })).toBe('paywall');
    expect(setupGate({ isPro: false, available: true, isDev: true })).toBe('paywall');
  });

  it('only bypasses missing purchases in development builds', () => {
    expect(setupGate({ isPro: false, available: false, isDev: true })).toBe('proceed');
    expect(setupGate({ isPro: false, available: false, isDev: false })).toBe('paywall');
  });
});

describe('trialDaysFromIntro', () => {
  it('reads free trials in days and weeks', () => {
    expect(trialDaysFromIntro({ price: 0, periodUnit: 'DAY', periodNumberOfUnits: 3, cycles: 1 })).toBe(3);
    expect(trialDaysFromIntro({ price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 1 })).toBe(7);
  });

  it('ignores paid intro offers and missing data', () => {
    expect(trialDaysFromIntro({ price: 0.99, periodUnit: 'WEEK', periodNumberOfUnits: 1 })).toBeNull();
    expect(trialDaysFromIntro(null)).toBeNull();
    expect(trialDaysFromIntro({ price: 0, periodUnit: 'FORTNIGHT', periodNumberOfUnits: 1 })).toBeNull();
  });
});

describe('planFromPackage / sortPlans / savings', () => {
  it('flattens a RevenueCat package', () => {
    const plan = planFromPackage({
      identifier: '$rc_annual',
      packageType: 'ANNUAL',
      product: {
        priceString: '$39.99',
        price: 39.99,
        introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 1 },
      },
    });
    expect(plan).toEqual(annual);
  });

  it('drops a package without a price', () => {
    expect(planFromPackage({ identifier: 'x', packageType: 'MONTHLY' })).toBeNull();
  });

  it('puts annual first and computes the annual saving', () => {
    expect(sortPlans([monthly, annual]).map((p) => p.period)).toEqual(['annual', 'monthly']);
    expect(annualSavingsPercent([monthly, annual])).toBe(58);
    expect(annualSavingsPercent([annual])).toBeNull();
  });
});

describe('copy', () => {
  it('labels the button with the trial length when there is one', () => {
    expect(ctaLabel(annual)).toBe('Start 7-day free trial');
    expect(ctaLabel({ ...monthly, trialDays: null })).toBe('Subscribe');
    expect(ctaLabel(undefined)).toBe('Continue');
  });

  it('states price, period, auto-renewal, and how to cancel', () => {
    const terms = renewalTerms(annual);
    expect(terms).toContain('Free for 7 days, then $39.99/year.');
    expect(terms).toContain('Renews automatically');
    expect(terms).toContain('Cancel anytime');
    expect(renewalTerms({ ...monthly, trialDays: null })).toMatch(/^\$7\.99\/month\./);
  });
});

describe('revenueCatApiKey', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('picks the key for the platform and treats empty as missing', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_123';
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = '';
    expect(revenueCatApiKey('ios')).toBe('appl_123');
    expect(revenueCatApiKey('android')).toBeUndefined();
    expect(revenueCatApiKey('web')).toBeUndefined();
  });
});

describe('createRevenueCatAdapter', () => {
  function fakeSdk(opts: { pro?: boolean; cancel?: boolean } = {}) {
    const info = (pro: boolean) => ({ entitlements: { active: pro ? { pro: {} } : {} } });
    return {
      configure: jest.fn(),
      getCustomerInfo: jest.fn(async () => info(opts.pro ?? false)),
      getOfferings: jest.fn(async () => ({
        current: {
          availablePackages: [
            { identifier: '$rc_monthly', packageType: 'MONTHLY', product: { priceString: '$7.99', price: 7.99 } },
            { identifier: '$rc_annual', packageType: 'ANNUAL', product: { priceString: '$39.99', price: 39.99 } },
          ],
        },
      })),
      purchasePackage: jest.fn(async () => {
        if (opts.cancel) throw Object.assign(new Error('cancelled'), { userCancelled: true });
        return { customerInfo: info(true) };
      }),
      restorePurchases: jest.fn(async () => info(opts.pro ?? false)),
    };
  }

  it('is unavailable without a key or a usable module', () => {
    expect(createRevenueCatAdapter(fakeSdk(), undefined).available).toBe(false);
    expect(createRevenueCatAdapter({}, 'key').available).toBe(false);
  });

  it('configures once, reads the pro entitlement, and lists plans annual-first', async () => {
    const sdk = fakeSdk({ pro: true });
    const adapter = createRevenueCatAdapter(sdk, 'key');
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'key' });
    expect(await adapter.isPro()).toBe(true);
    expect((await adapter.getPlans()).map((p) => p.id)).toEqual(['$rc_annual', '$rc_monthly']);
  });

  it('reports purchased, cancelled, and unknown-plan outcomes', async () => {
    const ok = createRevenueCatAdapter(fakeSdk(), 'key');
    await ok.getPlans();
    expect(await ok.purchase('$rc_annual')).toBe('purchased');
    expect(await ok.purchase('nope')).toBe('failed');

    const cancel = createRevenueCatAdapter(fakeSdk({ cancel: true }), 'key');
    await cancel.getPlans();
    expect(await cancel.purchase('$rc_monthly')).toBe('cancelled');
  });

  it('restore resolves to whether Pro is active', async () => {
    expect(await createRevenueCatAdapter(fakeSdk({ pro: true }), 'key').restore()).toBe(true);
    expect(await createRevenueCatAdapter(fakeSdk({ pro: false }), 'key').restore()).toBe(false);
  });
});

describe('honest trial timeline', () => {
  const today = new Date(2026, 10, 25, 15, 30);

  it('shows today, the reminder and the exact charge for a 7-day trial', () => {
    const steps = trialTimeline(annual, today)!;
    expect(steps.map((s) => [s.id, s.when])).toEqual([
      ['today', 'Today'],
      ['reminder', 'Day 5'],
      ['billing', 'Day 7'],
    ]);
    expect(steps[2]!.title).toBe("You're charged $39.99/year");
    expect(steps[2]!.date).toEqual(new Date(2026, 11, 2));
  });

  it('reminds the day before on a short trial, and has no timeline without one', () => {
    expect(trialTimeline(monthly, today)![1]!.when).toBe('Day 2');
    expect(trialTimeline({ ...annual, trialDays: null }, today)).toBeNull();
  });

  it('schedules the billing reminder at 10 AM on the reminder day', () => {
    const r = billingReminder(annual, today)!;
    expect(r.date).toEqual(new Date(2026, 10, 30, 10, 0, 0));
    expect(r.title).toBe('Your free trial ends in 2 days');
    expect(r.body).toContain('$39.99/year');
    expect(billingReminder(monthly, today)!.title).toBe('Your free trial ends tomorrow');
  });

  it('puts the price in the same line as free', () => {
    expect(priceLine(annual)).toBe('7 days free, then $39.99/year');
    expect(priceLine({ ...monthly, trialDays: null })).toBe('$7.99/month');
  });
});

describe('pickExitOffer', () => {
  const offer = (price: number): Plan => ({ ...annual, id: 'exit_annual', price, priceString: `$${price}` });

  it('accepts a real discount up to the cap', () => {
    expect(pickExitOffer([annual, monthly], [offer(29.99)])).toMatchObject({ percentOff: 25, regular: annual });
    expect(pickExitOffer([annual], [offer(27.99)])?.percentOff).toBe(MAX_EXIT_DISCOUNT_PERCENT);
  });

  it('rejects deeper cuts, fake discounts and unmatched periods', () => {
    expect(pickExitOffer([annual], [offer(19.99)])).toBeNull();
    expect(pickExitOffer([annual], [offer(39.99)])).toBeNull();
    expect(pickExitOffer([monthly], [offer(29.99)])).toBeNull();
    expect(pickExitOffer([annual], [])).toBeNull();
  });
});

describe('RevenueCat adapter offerings', () => {
  it('reads a named offering and can purchase from it', async () => {
    const purchased: string[] = [];
    const adapter = createRevenueCatAdapter(
      {
        configure: () => undefined,
        getCustomerInfo: async () => ({}),
        getOfferings: async () => ({
          current: { availablePackages: [] },
          all: {
            exit_offer: {
              availablePackages: [
                { identifier: 'exit_annual', packageType: 'ANNUAL', product: { priceString: '$29.99', price: 29.99 } },
              ],
            },
          },
        }),
        purchasePackage: async (pkg: { identifier?: string }) => {
          purchased.push(pkg.identifier ?? '');
          return { customerInfo: { entitlements: { active: { pro: {} } } } };
        },
        restorePurchases: async () => ({}),
      },
      'key',
    );
    const plans = await adapter.getOffering('exit_offer');
    expect(plans.map((p) => p.id)).toEqual(['exit_annual']);
    expect(await adapter.getOffering('missing')).toEqual([]);
    expect(await adapter.purchase('exit_annual')).toBe('purchased');
    expect(purchased).toEqual(['exit_annual']);
  });
});
