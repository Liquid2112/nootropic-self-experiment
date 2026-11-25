import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { experiments, getDatabase, type Experiment } from '@/db';
import { Brian, Icon, type IconName } from '@/brand';
import {
  HEALTH_PRIMARY_BY_GOAL,
  connectHealth,
  healthConnection,
  healthCoverage,
  localClock,
  usesHealthPrimary,
} from '@/features/health';
import { loadHealthAdapter } from '@/features/health/load';
import { Button, Card, Scaffold, brand, fonts, radius, spacing } from '@/ui';

type Loaded = {
  experiment: Experiment | null;
  today: string;
  connected: boolean;
  coverage: { synced: number; expected: number } | null;
};

function load(): Loaded {
  const db = getDatabase();
  const experiment = experiments.listByStatus(db, 'active')[0] ?? null;
  const today = localClock.dayOf(Date.now());
  return {
    experiment,
    today,
    connected: healthConnection(db) !== null,
    coverage: experiment ? healthCoverage(db, experiment, today) : null,
  };
}

/**
 * Connect Apple Health / Health Connect. The pitch is retention: your watch
 * keeps collecting data on the days you'd rather not open the app, and a sleep
 * or calm goal gets judged on real numbers instead of a feeling.
 *
 * Mid-run this shows only how many nights synced, never the values, so nothing
 * here hints at which days were active.
 */
export default function HealthScreen() {
  const adapter = loadHealthAdapter();
  const [state, setState] = useState<Loaded>(load);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setState(load());
    }, []),
  );

  const experiment = state.experiment;
  const healthGoal = experiment ? HEALTH_PRIMARY_BY_GOAL[experiment.goal] : undefined;
  const beforeDay1 = experiment ? state.today < experiment.startDate : false;
  const locked = experiment ? usesHealthPrimary(experiment.primaryMetric) : false;

  async function onConnect() {
    setBusy(true);
    setNote(null);
    const res = await connectHealth(getDatabase(), adapter);
    setBusy(false);
    if (!res.connected) {
      setNote(
        adapter.source === 'none'
          ? 'Health sync needs the Placebo app from the App Store or Play Store. It isn’t available in this preview.'
          : `${adapter.label} isn’t available on this phone, or access was declined. You can turn it on later in Settings.`,
      );
    } else if (res.primaryMetric) {
      setNote(
        res.primaryMetric === 'health_sleep_hours'
          ? 'Locked in: your verdict will be judged on hours asleep from your watch.'
          : 'Locked in: your verdict will be judged on overnight HRV from your watch.',
      );
    }
    setState(load());
  }

  return (
    <Scaffold>
      <View style={styles.hero}>
        <Brian size={96} mood={state.connected ? 'proud' : 'happy'} />
        <Text style={styles.title}>{state.connected ? `${adapter.label} is connected` : 'Let your watch do the boring part'}</Text>
        <Text style={styles.body}>
          Placebo reads three numbers your phone or watch already records. They fill in quietly every night, even on
          days you skip the app.
        </Text>
      </View>

      <Card style={styles.card}>
        <Row icon="moon" title="Sleep" text="Hours actually asleep, not just time in bed." />
        <Row icon="flame" title="Resting heart rate" text="Lower usually means better recovered." />
        <Row icon="chart" title="Heart rate variability" text="Overnight HRV, a marker of calm and recovery." />
      </Card>

      <Card style={{ ...styles.card, ...styles.lag }}>
        <View style={styles.rowHead}>
          <Icon name="clock" size={18} color={brand.lilacDeep} />
          <Text style={styles.rowTitle}>Last night reflects yesterday’s dose</Text>
        </View>
        <Text style={styles.body}>
          Sleep happens after you take a dose, so Placebo matches each day’s dose to the night that follows it. That
          way the verdict compares the right nights.
        </Text>
      </Card>

      {experiment && healthGoal ? (
        <Card style={styles.card}>
          <View style={styles.rowHead}>
            <Icon name="target" size={18} color={brand.tang} />
            <Text style={styles.rowTitle}>
              {locked ? 'Your verdict uses Health data' : beforeDay1 ? 'Connect before day 1' : 'Added as an extra measure'}
            </Text>
          </View>
          <Text style={styles.body}>
            {locked
              ? `This run is judged on ${experiment.goal === 'sleep' ? 'hours asleep' : 'overnight HRV'}, with your check-in ratings as backup.`
              : beforeDay1
                ? `Connect now and this ${experiment.goal} experiment is judged on real ${experiment.goal === 'sleep' ? 'sleep hours' : 'HRV'} instead of how you feel. It has to be decided before day 1, so the result can’t be cherry-picked.`
                : 'Your run already started, so its main measure stays the same. Health data shows up as extra results on your verdict.'}
          </Text>
        </Card>
      ) : null}

      {state.connected && state.coverage && state.coverage.expected > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.big}>{`${state.coverage.synced} of ${state.coverage.expected}`}</Text>
          <Text style={styles.muted}>nights synced so far. The numbers stay sealed with the rest of your verdict.</Text>
        </Card>
      ) : null}

      {!state.connected ? (
        <Button label={`Connect ${adapter.label}`} onPress={() => void onConnect()} loading={busy} />
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <Text style={styles.fine}>Read-only. Placebo never writes to Health, and your data stays on this phone.</Text>
    </Scaffold>
  );
}

function Row({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={18} color={brand.ink} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.muted}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 26, color: brand.ink, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: brand.ink2 },
  card: { gap: spacing.md },
  lag: { backgroundColor: brand.lilacSoft, borderColor: brand.lilacSoft },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rowHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: brand.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: brand.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: brand.muted },
  big: { fontFamily: fonts.display, fontSize: 34, color: brand.ink },
  note: { fontFamily: fonts.medium, fontSize: 14, color: brand.ink, textAlign: 'center' },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: brand.muted, textAlign: 'center' },
});
