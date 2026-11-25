import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { experiments, getDatabase, scheduleDays, supplements, type ReactionSeverity } from '@/db';
import { checkInDayIndex } from '@/features/daily-loop';
import { localDay } from '@/features/gamification';
import { cancelDailyReminders, loadNotificationsAdapter } from '@/features/notifications';
import {
  NOT_MEDICAL_ADVICE,
  POISON_CONTROL_US,
  REACTION_OPTIONS,
  activePause,
  logBadReaction,
  safetyMessage,
} from '@/features/safety';
import { refreshWidgets } from '@/features/widget/useWidgetSync';
import { Icon } from '@/brand';
import { Button, Scaffold, brand, fonts } from '@/ui';

type Ctx = { experimentId: string; supplementName: string; dayIndex: number | null; logged: ReactionSeverity | null };

function loadCtx(): Ctx | null {
  try {
    const db = getDatabase();
    const experiment = experiments.listByStatus(db, 'active')[0];
    if (!experiment) return null;
    const schedule = scheduleDays.listForExperiment(db, experiment.id);
    return {
      experimentId: experiment.id,
      supplementName: supplements.getById(db, experiment.supplementId)?.name ?? 'a supplement',
      dayIndex: checkInDayIndex(experiment, schedule, localDay(new Date())),
      logged: activePause(db, experiment.id)?.severity ?? null,
    };
  } catch {
    return null;
  }
}

function call(number: string) {
  void Linking.openURL(`tel:${number.replace(/[^0-9+]/g, '')}`).catch(() => undefined);
}

/**
 * Safety guardrail: "Log a bad reaction". The user says how bad it feels; the
 * app tells them to stop and get help, and pauses the run (no dose instruction,
 * no dose reminders) until they resume or end it from Today. No medical advice:
 * the copy is fixed in src/features/safety/model.ts.
 */
export default function BadReactionScreen() {
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx | null>(() => loadCtx());


  const pick = useCallback(
    (severity: ReactionSeverity) => {
      if (!ctx) return;
      try {
        logBadReaction(getDatabase(), { experimentId: ctx.experimentId, severity, dayIndex: ctx.dayIndex });
      } catch {
        // Still show the message even if saving failed.
      }
      setCtx({ ...ctx, logged: severity });
      void loadNotificationsAdapter().then(cancelDailyReminders).catch(() => undefined);
      refreshWidgets();
    },
    [ctx],
  );

  // Once a reaction is logged (now or earlier in this pause), show what to do.
  if (ctx?.logged) {
    const msg = safetyMessage(ctx.logged, ctx.supplementName);
    return (
      <Scaffold
        footer={<Button label="Back to Today" variant="secondary" onPress={() => router.replace('/')} />}
      >
        <View style={[styles.alertCard, msg.emergency ? styles.emergency : styles.warning]}>
          <Icon name="alert" size={30} color={msg.emergency ? brand.white : brand.rose} strokeWidth={2.4} />
          <Text style={[styles.alertTitle, msg.emergency && styles.onDark]}>{msg.title}</Text>
          {msg.lines.map((line) => (
            <Text key={line} style={[styles.alertLine, msg.emergency && styles.onDark]}>
              {line}
            </Text>
          ))}
        </View>
        <Button label="Call 911" onPress={() => call('911')} accessibilityHint="Opens your phone app" />
        {!msg.emergency && (
          <Button
            label="Call Poison Control (US)"
            variant="secondary"
            onPress={() => call(POISON_CONTROL_US)}
            accessibilityHint="Opens your phone app"
          />
        )}
        <View style={styles.pausedNote}>
          <Icon name="clock" size={18} color={brand.lilacDeep} />
          <Text style={styles.pausedText}>
            Your experiment is paused and your dose reminders are off. You can resume or end it from Today.
          </Text>
        </View>
        <Text style={styles.disclaimer}>{NOT_MEDICAL_ADVICE}</Text>
      </Scaffold>
    );
  }

  return (
    <Scaffold>
      <Text style={styles.title}>Log a bad reaction</Text>
      <Text style={styles.body}>
        If you feel unwell after a dose, tell us here. We’ll pause your experiment and show you where to get help.
      </Text>
      {!ctx && <Text style={styles.body}>There’s no experiment running right now.</Text>}
      {ctx &&
        REACTION_OPTIONS.map((o) => (
          <Pressable
            key={o.severity}
            accessibilityRole="button"
            onPress={() => pick(o.severity)}
            style={({ pressed }) => [styles.option, o.severity === 'severe' && styles.optionSevere, pressed && styles.pressed]}
          >
            <View style={styles.optionHead}>
              <Icon name="alert" size={20} color={o.severity === 'severe' ? brand.rose : brand.tangDeep} strokeWidth={2.4} />
              <Text style={styles.optionTitle}>{o.title}</Text>
              <Icon name="chevronRight" size={18} color={brand.faint} />
            </View>
            <Text style={styles.optionBody}>{o.examples}</Text>
          </Pressable>
        ))}
      <Text style={styles.disclaimer}>{NOT_MEDICAL_ADVICE}</Text>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, fontFamily: fonts.display, letterSpacing: -0.8, color: brand.ink },
  body: { fontSize: 16, lineHeight: 23, fontFamily: fonts.regular, color: brand.ink },
  option: {
    backgroundColor: brand.white,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: brand.line,
  },
  optionSevere: { borderColor: brand.rose },
  pressed: { opacity: 0.85 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionTitle: { flex: 1, fontSize: 18, fontFamily: fonts.displayBold, color: brand.ink },
  optionBody: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: brand.muted },
  alertCard: { borderRadius: 24, padding: 20, gap: 10 },
  emergency: { backgroundColor: brand.rose },
  warning: { backgroundColor: brand.tangSoft },
  alertTitle: { fontSize: 26, lineHeight: 31, fontFamily: fonts.display, letterSpacing: -0.6, color: brand.ink },
  alertLine: { fontSize: 16, lineHeight: 23, fontFamily: fonts.medium, color: brand.ink },
  onDark: { color: brand.white },
  pausedNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: brand.lilacSoft,
    borderRadius: 16,
    padding: 14,
  },
  pausedText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, color: brand.ink },
  disclaimer: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.muted },
});
