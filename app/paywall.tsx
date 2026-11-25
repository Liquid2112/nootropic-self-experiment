import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/config/links';
import {
  annualSavingsPercent,
  ctaLabel,
  loadPurchasesAdapter,
  renewalTerms,
  type Plan,
  type PurchasesAdapter,
} from '@/features/paywall';
import { Button, Scaffold, Text, brand, fonts } from '@/ui';
import { Icon, LogoMark, type IconName } from '@/brand';
import { tapLight } from '@/components/game';

const PERIOD_TITLE: Record<Plan['period'], string> = {
  annual: 'Yearly',
  monthly: 'Monthly',
  weekly: 'Weekly',
  other: 'Plan',
};

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: 'eyeOff', text: 'Blinded on/off experiments on any supplement you own' },
  { icon: 'brain', text: 'A daily 90-second brain test that tracks real performance' },
  { icon: 'chart', text: 'A verdict with an effect size, not a vibe' },
  { icon: 'trophy', text: 'Unlimited experiments and a shareable result card' },
];

/**
 * Pro paywall, shown when "Start my experiment" is tapped on Experiment setup by a
 * user without Pro. Plans come from the current RevenueCat offering; the store
 * product carries the free trial. On success it returns to setup, which then
 * creates the experiment.
 */
export default function PaywallScreen() {
  const router = useRouter();
  const [adapter, setAdapter] = useState<PurchasesAdapter | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
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

  const onPurchase = useCallback(async () => {
    if (!adapter || !selected) return;
    setBusy(true);
    setMessage(null);
    const outcome = await adapter.purchase(selected.id);
    setBusy(false);
    if (outcome === 'purchased') {
      router.back();
    } else if (outcome === 'failed') {
      setMessage('The purchase didn’t go through. You haven’t been charged.');
    }
  }, [adapter, selected, router]);

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

  return (
    <Scaffold
      footer={
        <View style={styles.footer}>
          <Button
            label={ctaLabel(selected)}
            onPress={() => void onPurchase()}
            disabled={!selected || busy}
            loading={busy}
          />
          {selected && (
            <Text variant="caption" tone="tertiary" style={styles.center}>
              {renewalTerms(selected)}
            </Text>
          )}
          <View style={styles.links}>
            <Pressable onPress={() => void onRestore()} accessibilityRole="button">
              <Text variant="footnote" tone="secondary">
                Restore purchases
              </Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(TERMS_OF_USE_URL)} accessibilityRole="link">
              <Text variant="footnote" tone="secondary">
                Terms
              </Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link">
              <Text variant="footnote" tone="secondary">
                Privacy
              </Text>
            </Pressable>
          </View>
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <LogoMark size={44} />
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>PRO</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Find out if it actually works</Text>
        <Text style={styles.heroSubtitle}>Start your experiment with Pro.</Text>
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Icon name={b.icon} size={18} color={brand.white} />
              </View>
              <Text style={styles.benefit}>{b.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {adapter === null ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.plans}>
          {plans.map((plan) => {
            const isSelected = plan.id === selectedId;
            return (
              <Pressable
                key={plan.id}
                onPress={() => {
                  tapLight();
                  setSelectedId(plan.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[styles.plan, isSelected ? styles.planSelected : null]}
              >
                <View style={styles.planRow}>
                  <View style={[styles.radio, isSelected ? styles.radioOn : null]}>
                    {isSelected ? <Icon name="check" size={14} color={brand.white} strokeWidth={3} /> : null}
                  </View>
                  <Text style={styles.planTitle}>{PERIOD_TITLE[plan.period]}</Text>
                  {plan.period === 'annual' && savings !== null && (
                    <View style={styles.saveTag}>
                      <Text style={styles.saveText}>{`Best value · save ${savings}%`}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPrice}>
                  {plan.trialDays
                    ? `${plan.trialDays} days free, then ${plan.priceString}`
                    : plan.priceString}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {message && (
        <Text tone="negative" style={styles.center}>
          {message}
        </Text>
      )}
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: brand.ink, borderRadius: 24, padding: 20, gap: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  proPill: { backgroundColor: brand.sun, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  proPillText: { fontSize: 11, letterSpacing: 1, fontFamily: fonts.bold, color: brand.ink },
  heroTitle: { fontSize: 28, lineHeight: 33, letterSpacing: -0.7, fontFamily: fonts.display, color: brand.white },
  heroSubtitle: { fontSize: 15, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)' },
  benefits: { gap: 12, marginTop: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefit: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: fonts.medium, color: brand.white },
  saveTag: { backgroundColor: brand.tang, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  saveText: { fontSize: 11, fontFamily: fonts.bold, color: brand.white },
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
  planTitle: { flex: 1, fontSize: 17, fontFamily: fonts.displayBold, color: brand.ink },
  planPrice: { fontSize: 14, fontFamily: fonts.regular, color: brand.muted, marginLeft: 32 },
  plans: { gap: 12 },
  plan: {
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: 20,
    padding: 16,
    gap: 4,
    backgroundColor: brand.white,
  },
  planSelected: { borderColor: brand.ink, borderWidth: 2 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { gap: 8 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  center: { textAlign: 'center' },
});
