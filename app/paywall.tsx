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
import { Button, Card, Scaffold, Text, colors, radius, spacing } from '@/ui';

const PERIOD_TITLE: Record<Plan['period'], string> = {
  annual: 'Yearly',
  monthly: 'Monthly',
  weekly: 'Weekly',
  other: 'Plan',
};

const BENEFITS = [
  'Blinded on/off experiments on any supplement you own',
  'A daily 90-second brain test that tracks real performance',
  'A verdict with an effect size, not a vibe',
  'Unlimited experiments and a shareable result card',
];

/**
 * Pro paywall, shown when "Confirm & start" is tapped on Experiment setup by a
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
      <View style={styles.header}>
        <Text variant="largeTitle">Find out if it actually works</Text>
        <Text tone="secondary">Start your experiment with Pro.</Text>
      </View>

      <Card>
        {BENEFITS.map((b) => (
          <Text key={b} style={styles.benefit}>{`✓  ${b}`}</Text>
        ))}
      </Card>

      {adapter === null ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.plans}>
          {plans.map((plan) => {
            const isSelected = plan.id === selectedId;
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelectedId(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={[styles.plan, isSelected ? styles.planSelected : null]}
              >
                <View style={styles.planRow}>
                  <Text variant="headline">{PERIOD_TITLE[plan.period]}</Text>
                  {plan.period === 'annual' && savings !== null && (
                    <Text variant="caption" tone="accent">{`SAVE ${savings}%`}</Text>
                  )}
                </View>
                <Text tone="secondary">
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
  header: {
    gap: spacing.sm,
  },
  benefit: {
    paddingVertical: spacing.xs,
  },
  plans: {
    gap: spacing.md,
  },
  plan: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  planSelected: {
    borderColor: colors.accent,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  center: {
    textAlign: 'center',
  },
});
