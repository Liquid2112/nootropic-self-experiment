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

const STEP_ICON: Record<TrialStep['id'], IconName> = {
  today: 'sparkle',
  reminder: 'clock',
  billing: 'calendar',
};

/** Set once the exit offer has been shown, so it never nags twice. */
const EXIT_OFFER_SEEN_KEY = 'exit_offer_seen_v1';

type ExitOffer = NonNullable<ReturnType<typeof pickExitOffer>>;

function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
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

  useEffect(() => {
    track('paywall_viewed');
    let cancelled = false;
    void (async () => {
      const a = await loadPurchasesAdapter(Platform.OS);
      const list = await a.getPlans();
      if (cancelled) return;
      setAdapter(a);
      setPlans(list);
      setSelectedId(list[0]?.id ?? null);
      if (!a.available || list.length === 0) {
        setMessage('Subscriptions couldn’t load. Check your connection and try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
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
      if (outcome === 'purchased') {
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
        headerLeft: () => (
          <Pressable
            onPress={() => void onClose()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            testID="paywall-close"
          >
            <Icon name="close" size={22} color={brand.ink} />
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
      footer={
        <View style={styles.footer}>
          <Button
            label={ctaLabel(selected)}
            onPress={() => void buy(selected)}
            disabled={!selected || busy}
            loading={busy}
          />
          {selected && <Text style={styles.terms}>{renewalTerms(selected)}</Text>}
          <View style={styles.links}>
            <Pressable onPress={() => void onRestore()} accessibilityRole="button">
              <Text style={styles.link}>Restore</Text>
            </Pressable>
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
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Find out if it actually works</Text>
        <Text style={styles.subtitle}>
          A blinded experiment, six science-backed brain tests to choose from, and a real verdict in 4 weeks.
        </Text>
      </View>

      {adapter === null ? (
        <ActivityIndicator color={brand.ink} />
      ) : (
        <View style={styles.plans}>
          {plans.map((plan) => {
            const on = plan.id === selectedId;
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
                <View style={styles.planRow}>
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on ? <Icon name="check" size={14} color={brand.white} strokeWidth={3} /> : null}
                  </View>
                  <Text style={styles.planTitle}>{PERIOD_TITLE[plan.period]}</Text>
                  {plan.period === 'annual' && savings !== null && (
                    <View style={styles.saveTag}>
                      <Text style={styles.saveText}>{`Save ${savings}%`}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPrice}>{priceLine(plan)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {timeline && (
        <View style={styles.timeline} testID="trial-timeline">
          <Text style={styles.timelineTitle}>How your free trial works</Text>
          {timeline.map((step, i) => {
            const last = i === timeline.length - 1;
            return (
              <View key={step.id} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepIcon, last && styles.stepIconLast]}>
                    <Icon name={STEP_ICON[step.id]} size={18} color={last ? brand.white : brand.ink} />
                  </View>
                  {!last && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepWhen}>
                    {step.id === 'today' ? step.when : `${step.when} · ${shortDate(step.date)}`}
                  </Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
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
  titleBlock: { gap: 8 },
  title: { fontSize: 30, lineHeight: 35, letterSpacing: -0.7, fontFamily: fonts.display, color: brand.ink },
  subtitle: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted },
  plans: { gap: 12 },
  plan: {
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: 20,
    padding: 16,
    gap: 6,
    backgroundColor: brand.white,
  },
  planOn: { borderColor: brand.ink, borderWidth: 2 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: brand.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: brand.ink, borderColor: brand.ink },
  planTitle: { flex: 1, fontSize: 15, fontFamily: fonts.semibold, color: brand.muted },
  // Same size and weight for "free" and the price: one line, nothing hidden.
  planPrice: { fontSize: 19, lineHeight: 24, fontFamily: fonts.displayBold, color: brand.ink, marginLeft: 32 },
  saveTag: { backgroundColor: brand.tangSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  saveText: { fontSize: 12, fontFamily: fonts.bold, color: brand.tangDeep },
  timeline: {
    backgroundColor: brand.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: brand.line,
    padding: 18,
    gap: 0,
  },
  timelineTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: brand.ink, marginBottom: 14 },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center', width: 36 },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconLast: { backgroundColor: brand.ink },
  stepLine: { width: 2, flex: 1, minHeight: 14, backgroundColor: brand.line, marginVertical: 4 },
  stepText: { flex: 1, paddingBottom: 16, gap: 2 },
  stepWhen: { fontSize: 12, letterSpacing: 0.4, fontFamily: fonts.semibold, color: brand.tang },
  stepTitle: { fontSize: 16, fontFamily: fonts.semibold, color: brand.ink },
  stepBody: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.muted },
  footer: { gap: 10 },
  terms: { fontSize: 11, lineHeight: 15, fontFamily: fonts.regular, color: brand.faint, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  link: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  noThanks: { alignSelf: 'center', paddingVertical: 6 },
  error: { fontSize: 14, fontFamily: fonts.medium, color: brand.rose, textAlign: 'center' },
  offerHero: { alignItems: 'center', gap: 8, paddingTop: 12 },
  offerEyebrow: { fontSize: 12, letterSpacing: 1, fontFamily: fonts.bold, color: brand.tang, marginTop: 8 },
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
