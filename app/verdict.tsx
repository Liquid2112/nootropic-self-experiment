import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Icon, Brian, type IconName, type BrianMood } from "@/brand";
import { Button, Text, brand, fonts, spacing } from "@/ui";
import {
  COMPLIANCE_DISCLAIMER,
  axisPosition,
  computeExperimentVerdict,
  effectHeadline,
  type MetricVerdict,
  type VerdictViewModel,
} from "@/results";
import { experiments, getDatabase, healthNights, type ScheduleDay } from "@/db";
import { addDays, selfBlindPassphrase } from "@/engines/experiment";
import { useExperimentData } from "@/screens/useExperimentData";
import { ShareCard, type ViewRef } from "@/screens/ShareCard";
import { shareCard } from "@/screens/share";
import { referralMessage, referralState } from "@/features/referral";
import { track, trackOnce } from "@/features/analytics";
import { localDay } from "@/features/gamification";

/**
 * Verdict screen: the payoff. It runs the stats engine over the finished run,
 * persists the result rows, and shows the primary metric prominently with the
 * engine's plain-language verdict, secondary metrics below, the belief check
 * (how much of the ON effect could be expectation), a monthly cost line, and
 * the compliance copy.
 * Below the 80% adherence gate it shows the improve-adherence state instead of
 * a verdict. A branded share card can be exported to the OS share sheet.
 */
export default function VerdictScreen() {
  const { experiment, schedule, sessions, supplement } = useExperimentData();
  const shareRef = useRef<ViewRef>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [referralCode] = useState(() => {
    try {
      return referralState(getDatabase()).myCode;
    } catch {
      return null;
    }
  });

  const vm: VerdictViewModel | null = useMemo(() => {
    if (!experiment) return null;
    // Runs are open-label now. A legacy self-blinded run unseals with the
    // passphrase derived from its persisted seed.
    const passphrase =
      experiment.blindingMode === "self_blind" && experiment.seed
        ? selfBlindPassphrase(experiment.seed)
        : undefined;
    const nights = healthNights.listBetween(
      getDatabase(),
      addDays(experiment.startDate, 1),
      addDays(experiment.startDate, experiment.lengthDays),
    );
    try {
      return computeExperimentVerdict(getDatabase(), {
        experiment,
        schedule,
        sessions,
        unsealPassphrase: passphrase,
        // Nights from Apple Health / Health Connect, matched to the dose the
        // day before. Empty when Health isn't connected.
        healthNights: nights,
      });
    } catch {
      // A legacy friend-sealed run can't be unsealed any more.
      return null;
    }
  }, [experiment, schedule, sessions]);

  // Funnel: the run reached its verdict. Counts only, never the result.
  const unlocked = vm !== null;
  useEffect(() => {
    if (!experiment || !unlocked) return;
    const today = localDay(new Date());
    if (schedule.length === 0 || !schedule.every((d) => d.date < today)) return;
    const daysCheckedIn = new Set(
      sessions.filter((s) => s.dayIndex >= 0).map((s) => s.dayIndex),
    ).size;
    trackOnce(`completed:${experiment.id}`, "experiment_completed", {
      length_days: experiment.lengthDays,
      days_checked_in: daysCheckedIn,
    });
  }, [experiment, unlocked, schedule, sessions]);

  if (!experiment || !vm) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Brian size={120} mood="sleepy" />
          <Text variant="title" style={styles.center}>
            Your verdict is sealed
          </Text>
          <Text tone="secondary" style={styles.center}>
            Your verdict appears here once the experiment ends.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const supplementName = supplement?.name ?? "Your supplement";

  async function onShare() {
    const ok = await shareCard(
      shareRef,
      referralCode ? referralMessage(referralCode) : undefined,
    );
    setShareNote(ok ? null : "Sharing isn\u2019t available on this device.");
    if (ok) track("verdict_shared");
  }

  const sessionDays = new Set(sessions.map((t) => t.dayIndex));
  const startAnother = () => {
    // Close out this run so Today and onboarding treat the next one as new.
    if (experiment && experiment.status === "active") {
      experiments.setStatus(getDatabase(), experiment.id, "completed");
    }
    router.replace("/goal-picker");
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safe, styles.dark]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text
              style={styles.kicker}
            >{`Day ${experiment.lengthDays}. Your verdict is in.`}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {supplementName}
            </Text>
          </View>
          <Brian
            size={60}
            mood={
              vm.adherenceMet
                ? (VERDICT_STYLE[vm.primary.dbVerdict]?.mood ?? "focused")
                : "sleepy"
            }
            tilt={0}
          />
        </View>

        {!vm.adherenceMet ? (
          <View style={[styles.hero, { backgroundColor: brand.paperDeep }]}>
            <View style={styles.heroTop}>
              <Text style={styles.heroMetric}>Not enough data</Text>
            </View>
            <Text style={styles.heroLine}>{vm.primary.verdictSentence}</Text>
            <Text style={styles.heroSmall}>
              {`Adherence was ${Math.round(vm.adherence.rate * 100)}%. A verdict needs at least 80% of days both taken and tested, so there isn\u2019t enough clean data yet.`}
            </Text>
          </View>
        ) : (
          <PrimaryVerdict primary={vm.primary} />
        )}

        {vm.adherenceMet && (
          <HowSure primary={vm.primary} monthlyCost={vm.monthlyCost} />
        )}

        {vm.primaryNote && <Note icon="moon" text={vm.primaryNote} />}

        {vm.belief && (
          <View style={styles.darkCard}>
            <View style={styles.rowCenter}>
              <Icon name="sparkle" size={20} color={brand.paper} />
              <Text style={styles.cardTitle}>Belief check</Text>
            </View>
            <Text style={styles.cardBody}>{vm.belief.sentence}</Text>
          </View>
        )}

        {vm.unblindedCaveat && <Note icon="eyeOff" text={vm.unblindedCaveat} />}

        <DaysGrid
          schedule={schedule}
          sessionDays={sessionDays}
          supplementName={supplementName}
        />

        {vm.adherenceMet && vm.secondary.some((m) => m.analyzed) && (
          <View>
            <Text style={styles.sectionTitle}>Your other tests</Text>
            {vm.secondary
              .filter((m) => m.analyzed)
              .map((m) => (
                <SecondaryRow key={m.metric} metric={m} />
              ))}
          </View>
        )}

        <View style={styles.actions}>
          {vm.adherenceMet && (
            <Button variant="tang" label="Share my result" onPress={onShare} />
          )}
          {shareNote && (
            <Text style={[styles.cardBody, styles.center]}>{shareNote}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={startAnother}
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          >
            <Text style={styles.ghostText}>Test something else</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/evidence-card")}
            style={({ pressed }) => [
              styles.evidence,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="book" size={16} color={brand.paper} />
            <Text style={styles.evidenceText}>
              See the evidence for this supplement
            </Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>{COMPLIANCE_DISCLAIMER}</Text>
      </ScrollView>

      {/* Off-screen capture target for the share image. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard
          ref={shareRef}
          supplementName={supplementName}
          primary={vm.primary}
          monthlyCost={vm.monthlyCost}
          blinded={experiment.blindingMode !== "none"}
          referralCode={referralCode}
        />
      </View>
    </SafeAreaView>
  );
}

const VERDICT_STYLE: Record<
  MetricVerdict["dbVerdict"],
  { label: string; color: string; icon: IconName; mood: BrianMood }
> = {
  works: {
    label: "Clear effect",
    color: brand.tang,
    icon: "check",
    mood: "proud",
  },
  no_effect: {
    label: "No clear effect",
    color: brand.lilac,
    icon: "eyeOff",
    mood: "focused",
  },
  inconclusive: {
    label: "Not sure yet",
    color: brand.sun,
    icon: "clock",
    mood: "focused",
  },
  harmful: {
    label: "Worse on ON days",
    color: brand.rose,
    icon: "alert",
    mood: "wow",
  },
};

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The giant number: the primary metric's effect on ON days vs OFF days. */
function PrimaryVerdict({ primary }: { primary: MetricVerdict }) {
  const v = VERDICT_STYLE[primary.dbVerdict] ?? VERDICT_STYLE.inconclusive;
  const h = effectHeadline(primary.metric, primary.effectSentence);
  return (
    <View style={[styles.hero, { backgroundColor: v.color }]}>
      <View style={styles.heroTop}>
        <Text style={styles.heroMetric}>{cap(primary.label)}</Text>
        <View style={styles.chip}>
          <Icon name={v.icon} size={14} color={brand.paper} strokeWidth={2.6} />
          <Text style={styles.chipText}>{v.label}</Text>
        </View>
      </View>
      {h ? (
        <>
          <View style={styles.bigRow}>
            <Text style={styles.big} adjustsFontSizeToFit numberOfLines={1}>
              {h.value}
            </Text>
            {h.unit ? <Text style={styles.bigUnit}>{h.unit}</Text> : null}
          </View>
          <Text style={styles.heroLine}>{`${h.word} on your ON days`}</Text>
        </>
      ) : (
        <Text style={styles.heroLine}>{primary.verdictSentence}</Text>
      )}
      {h ? (
        <Text style={styles.heroSmall}>{primary.verdictSentence}</Text>
      ) : null}
    </View>
  );
}

/** "How sure is this?": the 90% range on a better / no change / worse axis. */
function HowSure({
  primary,
  monthlyCost,
}: {
  primary: MetricVerdict;
  monthlyCost: string | null;
}) {
  const h = effectHeadline(primary.metric, primary.effectSentence);
  const { estimate, ciLow, ciHigh } = primary;
  const hasRange = estimate !== null && ciLow !== null && ciHigh !== null;
  const scale = hasRange
    ? Math.max(Math.abs(ciLow), Math.abs(ciHigh), 1e-9) * 1.4
    : 1;
  const lo = hasRange ? axisPosition(primary.metric, ciLow, scale) : 0.5;
  const hi = hasRange ? axisPosition(primary.metric, ciHigh, scale) : 0.5;
  const mid = hasRange ? axisPosition(primary.metric, estimate, scale) : 0.5;
  const left = Math.min(lo, hi);
  const width = Math.max(0.02, Math.abs(hi - lo));
  return (
    <View style={styles.darkCard}>
      <Text style={styles.cardTitle}>How sure is this?</Text>
      {hasRange && (
        <>
          <View
            style={styles.plot}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View style={styles.axis} />
            <View style={styles.zero} />
            <View
              style={[
                styles.band,
                { left: `${left * 100}%`, width: `${width * 100}%` },
              ]}
            />
            <View style={[styles.point, { left: `${mid * 100}%` }]} />
          </View>
          <View style={styles.axisLabels}>
            <Text style={styles.axisText}>Better</Text>
            <Text style={styles.axisText}>No change</Text>
            <Text style={styles.axisText}>Worse</Text>
          </View>
        </>
      )}
      <Text style={styles.cardBody}>
        {h
          ? `The real effect is likely between ${h.range.replace(" to ", " and ")} (90% range).`
          : (primary.effectSentence ??
            "There isn\u2019t enough data to put a range on it.")}
      </Text>
      {monthlyCost && (
        <View style={styles.costRow}>
          <Text style={styles.cardBody}>What it costs you</Text>
          <Text style={styles.costValue}>{monthlyCost}</Text>
        </View>
      )}
    </View>
  );
}

/** Every run day, now shown as ON (tang) or OFF (lilac); missed days stay dark. */
function DaysGrid({
  schedule,
  sessionDays,
  supplementName,
}: {
  schedule: ScheduleDay[];
  sessionDays: Set<number>;
  supplementName: string;
}) {
  if (schedule.length === 0) return null;
  return (
    <View style={styles.gridWrap}>
      <Text style={styles.sectionTitle}>Your ON and OFF days</Text>
      <View style={styles.grid}>
        {schedule.map((d) => {
          const on = d.arm === "ON" || d.arm === "A";
          const missed = !sessionDays.has(d.dayIndex);
          return (
            <View
              key={d.dayIndex}
              style={[
                styles.cell,
                {
                  backgroundColor: missed
                    ? brand.ink2
                    : on
                      ? brand.tang
                      : brand.lilac,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.rowCenter}>
          <View style={[styles.swatch, { backgroundColor: brand.tang }]} />
          <Text
            style={styles.legendText}
          >{`ON: you took ${supplementName}`}</Text>
        </View>
        <View style={styles.rowCenter}>
          <View style={[styles.swatch, { backgroundColor: brand.lilac }]} />
          <Text style={styles.legendText}>OFF: you skipped it</Text>
        </View>
        <View style={styles.rowCenter}>
          <View style={[styles.swatch, { backgroundColor: brand.ink2 }]} />
          <Text style={styles.legendText}>No check-in</Text>
        </View>
      </View>
    </View>
  );
}

function SecondaryRow({ metric }: { metric: MetricVerdict }) {
  const h = effectHeadline(metric.metric, metric.effectSentence);
  const clear = metric.dbVerdict === "works";
  const worse = metric.dbVerdict === "harmful";
  return (
    <View style={styles.secRow}>
      <View style={styles.flex}>
        <Text style={styles.secLabel}>{cap(metric.label)}</Text>
        <Text style={styles.secSub}>
          {clear || worse
            ? h
              ? `${h.value}${h.unit ? ` ${h.unit}` : ""} ${h.word}`
              : metric.verdictSentence
            : "No clear change"}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          clear ? styles.badgeGood : worse ? styles.badgeBad : null,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            clear ? styles.badgeTextGood : worse ? styles.badgeTextBad : null,
          ]}
        >
          {clear ? "Clear effect" : worse ? "Worse" : "Unclear"}
        </Text>
      </View>
    </View>
  );
}

function Note({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.note}>
      <Icon name={icon} size={18} color={DIM} />
      <Text style={[styles.cardBody, styles.flex]}>{text}</Text>
    </View>
  );
}

const DIM = "rgba(247,244,238,0.72)";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.paper },
  dark: { backgroundColor: brand.ink },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48, gap: 20 },
  flex: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  center: { textAlign: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  kicker: { fontSize: 15, fontFamily: fonts.medium, color: DIM },
  name: {
    fontSize: 28,
    letterSpacing: -0.6,
    fontFamily: fonts.display,
    color: brand.paper,
    marginTop: 4,
  },
  hero: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 26,
    gap: 2,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroMetric: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: brand.ink,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: brand.ink,
  },
  chipText: { fontSize: 13, fontFamily: fonts.semibold, color: brand.paper },
  bigRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  big: {
    fontSize: 112,
    lineHeight: 118,
    letterSpacing: -6,
    fontFamily: fonts.display,
    color: brand.ink,
    flexShrink: 1,
  },
  bigUnit: {
    fontSize: 40,
    letterSpacing: -1,
    fontFamily: fonts.display,
    color: brand.ink,
  },
  heroLine: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    fontFamily: fonts.displayBold,
    color: brand.ink,
  },
  heroSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.medium,
    color: brand.ink,
    opacity: 0.8,
    marginTop: 10,
  },
  darkCard: {
    backgroundColor: brand.ink2,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: brand.paper },
  cardBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fonts.regular,
    color: "rgba(247,244,238,0.78)",
  },
  plot: { height: 44, justifyContent: "center" },
  axis: {
    height: 2,
    backgroundColor: "rgba(247,244,238,0.25)",
    borderRadius: 1,
  },
  zero: {
    position: "absolute",
    left: "50%",
    top: 4,
    bottom: 4,
    width: 2,
    marginLeft: -1,
    backgroundColor: "rgba(247,244,238,0.35)",
  },
  band: {
    position: "absolute",
    height: 16,
    top: 14,
    borderRadius: 8,
    backgroundColor: brand.tang,
  },
  point: {
    position: "absolute",
    top: 13,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    backgroundColor: brand.paper,
    borderWidth: 3,
    borderColor: brand.ink,
  },
  axisLabels: { flexDirection: "row", justifyContent: "space-between" },
  axisText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "rgba(247,244,238,0.6)",
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(247,244,238,0.15)",
  },
  costValue: { fontSize: 15, fontFamily: fonts.semibold, color: brand.paper },
  note: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: brand.ink2,
    borderRadius: 16,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
    fontFamily: fonts.displayBold,
    color: brand.paper,
    marginBottom: 6,
  },
  gridWrap: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: "12.6%", aspectRatio: 1, borderRadius: 10 },
  legend: { gap: 8, marginTop: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 15, fontFamily: fonts.medium, color: brand.paper },
  secRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247,244,238,0.12)",
  },
  secLabel: { fontSize: 16, fontFamily: fonts.semibold, color: brand.paper },
  secSub: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "rgba(247,244,238,0.7)",
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: brand.ink2,
  },
  badgeGood: { backgroundColor: brand.mintSoft },
  badgeBad: { backgroundColor: brand.tangSoft },
  badgeText: { fontSize: 13, fontFamily: fonts.semibold, color: brand.paper },
  badgeTextGood: { color: brand.mintInk },
  badgeTextBad: { color: brand.roseInk },
  actions: { gap: 12, paddingTop: 8 },
  ghost: {
    height: 58,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(247,244,238,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { fontSize: 17, fontFamily: fonts.semibold, color: brand.paper },
  evidence: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  evidenceText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: brand.paper,
    textDecorationLine: "underline",
  },
  pressed: { opacity: 0.6 },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: "rgba(247,244,238,0.6)",
    textAlign: "center",
  },
  offscreen: { position: "absolute", left: -9999, top: 0 },
});
