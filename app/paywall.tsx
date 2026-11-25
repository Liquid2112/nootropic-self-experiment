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
import { Button, Card, Scaffold, Text, colors, gameColors, radius, spacing } from '@/ui';
import { tapLight } from '@/components/game';

const PERIOD_TITLE: Record<Plan['period'], string> = {
  annual: 'Yearly',
  monthly: 'Monthly',
  weekly: 'Weekly',
  other: 'Plan',
};

const BENEFITS: { emoji: string; text: string }[] = [
  { emoji: '🙈', text: 'Blinded on/off experiments on any supplement you own' },
  { emoji: '🧠', text: 'A daily 90-second brain test that tracks real performance' },
  { emoji: '📊', text: 'A verdict with an effect size, not a vibe' },
  { emoji: '🏆', text: 'Unlimited experiments and a shareable result card' },
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
        <View style={styles.proPill}>
          <Text style={styles.proPillText}>⚡ PRO</Text>
        </View>
        <Text style={styles.heroTitle}>Find out if it actually works</Text>
        <Text style={styles.heroSubtitle}>Start your experiment with Pro.</Text>
      </View>

      <Card radius="xl" style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.text} style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Text style={styles.benefitEmoji}>{b.emoji}</Text>
            </View>
            <Text style={styles.benefit}>{b.text}</Text>
          </View>
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
                    {isSelected ? <Text style={styles.radioCheck}>✓</Text> : null}
                  </View>
                  <Text variant="headline" style={styles.planTitle}>{PERIOD_TITLE[plan.period]}</Text>
                  {plan.period === 'annual' && savings !== null && (
                    <View style={styles.saveTag}>
                      <Text style={styles.saveText}>{`SAVE ${savings}%`}</Text>
                    </View>
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
  hero: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  proPill: {
    alignSelf: 'flex-start',
    backgroundColor: gameColors.xp,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  proPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: gameColors.violetDeep,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  benefits: {
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cautionSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitEmoji: {
    fontSize: 20,
  },
  benefit: {
    flex: 1,
    fontWeight: '600',
  },
  saveTag: {
    backgroundColor: gameColors.mint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  saveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  radioCheck: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planTitle: {
    flex: 1,
  },
  plans: {
    gap: spacing.md,
  },
  plan: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  planSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.cautionSurface,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
