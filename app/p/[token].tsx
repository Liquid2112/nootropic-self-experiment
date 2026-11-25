import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '@/db';
import { Brian, Icon } from '@/brand';
import {
  cheerMessage,
  decodeProgressPayload,
  isOwnRun,
  updateHeldProgress,
  type HeldKey,
} from '@/features/referral';
import { trackOnce } from '@/features/analytics';
import { shortDateLabel } from '@/features/widget/model';
import { Button, Card, Scaffold, brand, fonts, spacing } from '@/ui';

/**
 * A progress update from a friend whose key you hold (placebo.app/p/...).
 * "Day 14 of 28." It saves the progress next to the key, shows how far they
 * are, and offers a one-tap cheer back. Only the day count travels, never a
 * score, so the keyholder can't leak a result they don't have.
 */
export default function ProgressUpdateScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const payload = useMemo(
    () => (typeof params.token === 'string' ? decodeProgressPayload(params.token) : null),
    [params.token],
  );
  // Save the update next to the held key once, when the screen opens.
  const [{ own, held }] = useState<{ own: boolean; held: HeldKey | null }>(() => {
    if (!payload) return { own: false, held: null };
    const db = getDatabase();
    if (isOwnRun(db, payload.run)) return { own: true, held: null };
    return { own: false, held: updateHeldProgress(db, payload.run, payload.day, payload.of) };
  });
  const [cheered, setCheered] = useState(false);

  useEffect(() => {
    if (payload && !own) {
      trackOnce(`progress_opened:${payload.run}:${payload.day}`, 'progress_opened', { run_day: payload.day });
    }
  }, [payload, own]);

  if (!payload) {
    return (
      <Scaffold>
        <View style={styles.center}>
          <Brian size={96} mood="wow" />
          <Text style={styles.title}>This update link is broken</Text>
          <Text style={styles.body}>Ask your friend to send it again.</Text>
        </View>
        <Button label="Go home" onPress={() => router.replace('/')} />
      </Scaffold>
    );
  }

  if (own) {
    return (
      <Scaffold>
        <View style={styles.center}>
          <Brian size={96} mood="wink" />
          <Text style={styles.title}>That’s your own update</Text>
          <Text style={styles.body}>Send it to your keyholder so they know you’re still going.</Text>
        </View>
        <Button label="Back to Today" onPress={() => router.replace('/')} />
      </Scaffold>
    );
  }

  const who = payload.from || 'Your friend';
  const left = payload.of - payload.day;
  const pct = Math.max(4, Math.round((payload.day / payload.of) * 100));

  async function onCheer() {
    if (!payload) return;
    try {
      const res = await Share.share({ message: cheerMessage(payload) });
      if (res.action !== Share.dismissedAction) setCheered(true);
    } catch {
      // Share sheet unavailable.
    }
  }

  return (
    <Scaffold
      footer={
        cheered ? (
          <Button label="Done" onPress={() => router.replace('/invite')} />
        ) : (
          <Button label={`Cheer ${payload.from || 'them'} on`} onPress={() => void onCheer()} />
        )
      }
    >
      <View style={styles.center}>
        <Brian size={88} mood="proud" />
        <Text style={styles.kicker}>UPDATE FROM {who.toUpperCase()}</Text>
        <Text style={styles.title}>{`Day ${payload.day} of ${payload.of}`}</Text>
        <Text style={styles.body}>
          {left > 0
            ? `${left} ${left === 1 ? 'day' : 'days'} until the reveal on ${shortDateLabel(payload.reveal)}. They still don’t know which cup is real. Only you do.`
            : `They’ve finished. On ${shortDateLabel(payload.reveal)} you send the key and the verdict unlocks.`}
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Started</Text>
          <Text style={styles.meta}>{`Reveal ${shortDateLabel(payload.reveal)}`}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Icon name="lock" size={20} color={held ? brand.mint : brand.lilacDeep} />
          <Text style={styles.cardTitle}>
            {held ? 'Their key is safe on this phone' : 'You’re not holding this key here'}
          </Text>
        </View>
        <Text style={styles.muted}>
          {held
            ? 'Four weeks is a long time to stay consistent. Knowing someone is waiting on the result makes it easier. A quick cheer helps.'
            : 'If they sent you a key link, open it on this phone first so you can send the key back on reveal day.'}
        </Text>
      </Card>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2, color: brand.tang },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: brand.ink, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: brand.ink2, textAlign: 'center' },
  card: { gap: spacing.md },
  track: { height: 10, borderRadius: 5, backgroundColor: brand.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: brand.tang },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: brand.muted },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: brand.ink, flexShrink: 1 },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: brand.muted },
});
