import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/config/links';
import { appState, getDatabase } from '@/db';
import { loadNotificationsAdapter, scheduleOneOff } from '@/features/notifications';
import {
  EXIT_OFFERING_ID,
  annualSavingsPercent,
  billingReminder,
  ctaLabel,
  loadPurchasesAdapter,
  pickExitOffer,
  priceLine,
  pricePerPeriod,
  renewalTerms,
  trialTimeline,
  weeklyEquivalent,
  type Plan,
  type PurchasesAdapter,
  type TrialStep,
} from '@/features/paywall';
import { Button, Scaffold, brand, fonts } from '@/ui';
import { Brian, Icon, type IconName } from '@/brand';
import { tapLight } from '@/components/game';
import { track } from '@/features/analytics';

const PERIOD_TITLE: Record<Plan['period'], string> = {
  annual: 'Yearly',
  monthly: 'Monthly',
  weekly: 'Weekly',
  other: 'Plan',
};

/** Timeline dots: tang today, lilac reminder, ink billing day. */
const STEP_DOT: Record<TrialStep['id'], string> = {
  today: brand.tang,
  reminder: brand.lilac,
  billing: brand.ink,
};

const BENEFITS: { icon: IconName; tint: string; text: string }[] = [
  {
    icon: 'calendar',
    tint: brand.tangSoft,
    text: 'Random ON and OFF days, so a good week can’t fake the result',
  },
  { icon: 'bolt', tint: brand.lilacSoft, text: 'Six science-backed brain tests, about 2 minutes a day' },
  { icon: 'chart', tint: brand.mintSoft, text: 'A verdict from your own data, with the math shown' },
];

/** Set once the exit offer has been shown, so it never nags twice. */
const EXIT_OFFER_SEEN_KEY = 'exit_offer_seen_v1';

type ExitOffer = NonNullable<ReturnType<typeof pickExitOffer>>;

function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "Start my free week" for a 7-day trial; the shared label otherwise. */
function mainCta(plan: Plan | undefined): string {
  return plan?.trialDays === 7 ? 'Start my free week' : ctaLabel(plan);
}

/**
 * Pro paywall, shown when "Start my experiment" is tapped on Experiment setup by
 * a user without Pro. Built to be honest, which is also what converts:
 *  - the price sits in the same line, at the same size, as "free";
 *  - a timeline says exactly when we remind you and when you're charged;
 *  - no trial toggle, no countdowns, no fake scarcity;
 *  - on a successful trial start we schedule the billing reminder we promised;
 *  - closing it may show one exit offer (at most 30% off, once ever), only when
 *    an `exit_offer` offering exists in RevenueCat.
 */
export default function PaywallScreen() {
  const router = useRouter();
  const [adapter, setAdapter] = useState<PurchasesAdapter | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [exitOffer, setExitOffer] = useState<ExitOffer | null>(null);
  const [today] = useState(() => new Date());
  // Bumped by "Try again" to re-run the plan load after a failure.
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    track('paywall_viewed');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const a = await loadPurchasesAdapter(Platform.OS);
      const list = await a.getPlans();
      if (cancelled) return;
      setAdapter(a);
      setPlans(list);
      setSelectedId(list[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  // Store unreachable or no offering: show a recoverable state, not a dead button.
  const loadFailed = adapter !== null && (!adapter.available || plans.length === 0);
  const retryLoad = useCallback(() => {
    tapLight();
    setAdapter(null);
    setMessage(null);
    setLoadAttempt((n) => n + 1);
  }, []);

  const selected = useMemo(() => plans.find((p) => p.id === selectedId), [plans, selectedId]);
  const savings = useMemo(() => annualSavingsPercent(plans), [plans]);
  const timeline = useMemo(() => trialTimeline(selected, today), [selected, today]);

  const buy = useCallback(
    async (plan: Plan | undefined) => {
      if (!adapter || !plan) return;
      setBusy(true);
      setMessage(null);
      const outcome = await adapter.purchase(plan.id);
      setBusy(false);
      if (outcome === 'purchased' && adapter.preview) {
        router.back();
      } else if (outcome === 'purchased') {
        track('trial_started', { plan_period: plan.period, trial_days: plan.trialDays ?? 0 });
        // Keep the promise on the timeline: remind before the trial converts.
        const reminder = billingReminder(plan, new Date());
        if (reminder) {
          void loadNotificationsAdapter().then((n) => scheduleOneOff(reminder, n));
        }
        router.back();
      } else if (outcome === 'failed') {
        setMessage('The purchase didn’t go through. You haven’t been charged.');
      }
    },
    [adapter, router],
  );

  const onRestore = useCallback(async () => {
    if (!adapter) return;
    setBusy(true);
    setMessage(null);
    const restored = await adapter.restore();
    setBusy(false);
    if (restored) {
      router.back();
    } else {
      setMessage('No active subscription found for this account.');
    }
  }, [adapter, router]);

  const onClose = useCallback(async () => {
    if (exitOffer || !adapter?.available) {
      router.back();
      return;
    }
    let seen = false;
    try {
      seen = appState.get(getDatabase(), EXIT_OFFER_SEEN_KEY) !== undefined;
    } catch {
      seen = true;
    }
    const offer = seen ? null : pickExitOffer(plans, await adapter.getOffering(EXIT_OFFERING_ID));
    if (!offer) {
      router.back();
      return;
    }
    try {
      appState.set(getDatabase(), EXIT_OFFER_SEEN_KEY, new Date().toISOString());
    } catch {
      // Showing it twice is better than crashing.
    }
    setExitOffer(offer);
  }, [adapter, exitOffer, plans, router]);

  const header = (
    <Stack.Screen
      options={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: brand.paper },
        headerLeft: () => (
          <Pressable
            onPress={() => void onClose()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            testID="paywall-close"
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Icon name="close" size={24} color={brand.ink} />
          </Pressable>
        ),
        headerRight: () =>
          exitOffer ? null : (
            <Pressable onPress={() => void onRestore()} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.restore}>Restore</Text>
            </Pressable>
          ),
      }}
    />
  );

  if (exitOffer) {
    return (
      <Scaffold
        testID="paywall-exit-offer"
        footer={
          <View style={styles.footer}>
            <Button
              label={ctaLabel(exitOffer.plan)}
              onPress={() => void buy(exitOffer.plan)}
              disabled={busy}
              loading={busy}
            />
            <Text style={styles.terms}>{renewalTerms(exitOffer.plan)}</Text>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.noThanks}>
              <Text style={styles.link}>No thanks</Text>
            </Pressable>
          </View>
        }
      >
        {header}
        <View style={styles.offerHero}>
          <Brian size={112} mood="wink" />
          <Text style={styles.offerEyebrow}>A ONE-TIME OFFER</Text>
          <Text style={styles.offerTitle}>{`${exitOffer.percentOff}% off, because finishing matters`}</Text>
          <Text style={styles.offerBody}>
            Most supplements never get a real answer. If price is the blocker, here’s a smaller one.
          </Text>
        </View>
        <View style={styles.offerCard}>
          <Text style={styles.offerPrice}>{priceLine(exitOffer.plan)}</Text>
          <Text style={styles.offerWas}>
            Usually <Text style={styles.strike}>{pricePerPeriod(exitOffer.regular)}</Text>
          </Text>
        </View>
        {message && <Text style={styles.error}>{message}</Text>}
      </Scaffold>
    );
  }

  return (
    <Scaffold
      testID="paywall-screen"
      edges={['bottom']}
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          {loadFailed ? (
            <Button label="Try again" onPress={retryLoad} testID="paywall-retry" />
          ) : (
            <Button
              label={mainCta(selected)}
              onPress={() => void buy(selected)}
              disabled={!selected || busy}
              loading={busy}
            />
          )}
          {selected && !loadFailed && <Text style={styles.terms}>{renewalTerms(selected)}</Text>}
          {adapter?.preview ? (
            <Text style={styles.terms}>Test build: nothing is charged.</Text>
          ) : null}
          <View style={styles.links}>
            <Pressable onPress={() => void Linking.openURL(TERMS_OF_USE_URL)} accessibilityRole="link">
              <Text style={styles.link}>Terms</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link">
              <Text style={styles.link}>Privacy</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      {header}
      <View style={styles.hero}>
        <Text style={styles.title}>Your answer in 28 days.</Text>
        <Brian size={78} mood="wink" />
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.icon} style={styles.benefit}>
            <View style={[styles.benefitIcon, { backgroundColor: b.tint }]}>
              <Icon name={b.icon} size={22} color={brand.ink} />
            </View>
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>

      {adapter === null ? (
        <ActivityIndicator color={brand.ink} />
      ) : loadFailed ? (
        <View style={styles.loadFailed} testID="paywall-load-failed">
          <Brian size={96} mood="sleepy" />
          <Text style={styles.loadFailedTitle}>Plans didn’t load</Text>
          <Text style={styles.loadFailedBody}>
            We couldn’t reach the App Store. Check your connection, then try again. You won’t be
            charged for anything until you pick a plan.
          </Text>
        </View>
      ) : (
        <View style={styles.plans}>
          {plans.map((plan) => {
            const on = plan.id === selectedId;
            const weekly = weeklyEquivalent(plan);
            return (
              <Pressable
                key={plan.id}
                testID={`plan-${plan.period}`}
                onPress={() => {
                  tapLight();
                  setSelectedId(plan.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.plan, on && styles.planOn]}
              >
                <View style={[styles.radio, on && styles.radioOn]}>
                  {on ? <Icon name="check" size={14} color={brand.white} strokeWidth={3} /> : null}
                </View>
                <View style={styles.planText}>
                  <View style={styles.planRow}>
                    <Text style={styles.planTitle}>{PERIOD_TITLE[plan.period]}</Text>
                    {plan.period === 'annual' && savings !== null && (
                      <View style={styles.saveTag}>
                        <Text style={styles.saveText}>{`Save ${savings}%`}</Text>
                      </View>
                    )}
                  </View>
                  {/* Same size and weight for "free" and the price: one line, nothing hidden. */}
                  <Text style={styles.planPrice}>{priceLine(plan)}</Text>
                  {weekly ? <Text style={styles.planWeekly}>{weekly}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {timeline && (
        <View style={styles.timeline} testID="trial-timeline">
          <Text style={styles.timelineTitle}>
            {selected?.trialDays === 7 ? 'How your free week works' : 'How your free trial works'}
          </Text>
          {timeline.map((step, i) => {
            const last = i === timeline.length - 1;
            return (
              <View key={step.id} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepDot, { backgroundColor: STEP_DOT[step.id] }]} />
                  {!last && <View style={styles.stepLine} />}
                </View>
                <View style={[styles.stepText, last && styles.stepTextLast]}>
                  <Text style={styles.stepTitle}>
                    {step.id === 'today' ? `Today, ${shortDate(step.date)}` : shortDate(step.date)}
                  </Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {message && <Text style={styles.error}>{message}</Text>}
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closePressed: { opacity: 0.6 },
  loadFailed: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: brand.white,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  loadFailedTitle: { fontSize: 20, lineHeight: 25, fontFamily: fonts.displayBold, color: brand.ink, marginTop: 4 },
  loadFailedBody: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted, textAlign: 'center' },
  content: { paddingTop: 4, gap: 20 },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  title: {
    flex: 1,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.3,
    fontFamily: fonts.display,
    color: brand.ink,
  },
  benefits: { gap: 14 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontSize: 16, lineHeight: 22, fontFamily: fonts.medium, color: brand.ink },
  plans: { gap: 10 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: brand.white,
  },
  planOn: { borderColor: brand.ink, borderWidth: 2.5 },
  planText: { flex: 1, gap: 3 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brand.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: brand.ink, borderColor: brand.ink },
  planTitle: { fontSize: 17, fontFamily: fonts.semibold, color: brand.ink },
  planPrice: { fontSize: 15, lineHeight: 20, fontFamily: fonts.regular, color: brand.ink },
  planWeekly: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  saveTag: { backgroundColor: brand.tangSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  saveText: { fontSize: 12, fontFamily: fonts.bold, color: brand.tangInk },
  timeline: { backgroundColor: brand.paperDeep, borderRadius: 24, padding: 20 },
  timelineTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
    fontFamily: fonts.displayBold,
    color: brand.ink,
    marginBottom: 14,
  },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center', width: 16 },
  stepDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: brand.ink },
  stepLine: { width: 2, flex: 1, backgroundColor: 'rgba(21,19,28,0.25)' },
  stepText: { flex: 1, paddingBottom: 16, gap: 2, marginTop: -2 },
  stepTextLast: { paddingBottom: 0 },
  stepTitle: { fontSize: 16, fontFamily: fonts.semibold, color: brand.ink },
  stepBody: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted },
  restore: { fontSize: 15, fontFamily: fonts.semibold, color: brand.muted, marginRight: 8 },
  footer: { gap: 10 },
  // Auto-renewal terms must be clear and conspicuous next to the button
  // (ROSCA, California's auto-renewal law, App Store 3.1.2): readable size,
  // full-contrast muted ink, never the faint fine-print color.
  terms: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.muted, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  link: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  noThanks: { alignSelf: 'center', paddingVertical: 6 },
  error: { fontSize: 14, fontFamily: fonts.medium, color: brand.roseInk, textAlign: 'center' },
  offerHero: { alignItems: 'center', gap: 8, paddingTop: 12 },
  offerEyebrow: { fontSize: 12, letterSpacing: 1, fontFamily: fonts.bold, color: brand.tangInk, marginTop: 8 },
  offerTitle: {
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.6,
    fontFamily: fonts.display,
    color: brand.ink,
    textAlign: 'center',
  },
  offerBody: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted, textAlign: 'center' },
  offerCard: {
    backgroundColor: brand.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: brand.ink,
    padding: 18,
    gap: 4,
    alignItems: 'center',
  },
  offerPrice: { fontSize: 20, fontFamily: fonts.displayBold, color: brand.ink, textAlign: 'center' },
  offerWas: { fontSize: 14, fontFamily: fonts.regular, color: brand.muted },
  strike: { textDecorationLine: 'line-through' },
});
