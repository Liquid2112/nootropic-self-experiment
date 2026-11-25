import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { experiments, getDatabase } from '@/db';
import { Brian } from '@/brand';
import { addDays } from '@/engines/experiment';
import { canSendKey, decodeUnlockPayload } from '@/features/referral';
import { localDay } from '@/features/gamification';
import { shortDateLabel } from '@/features/widget/model';
import { Button, Scaffold, brand, fonts, spacing } from '@/ui';

/**
 * The key coming back from the keyholder (placebo.app/u/...). On or after
 * reveal day it opens the verdict with the key filled in. Earlier than that it
 * refuses and keeps nothing, so an early key can't unblind a run mid-way.
 */
export default function UnlockScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const result = useMemo(() => {
    const payload = typeof params.token === 'string' ? decodeUnlockPayload(params.token) : null;
    if (!payload) return { kind: 'broken' as const };
    const experiment = experiments.getById(getDatabase(), payload.run);
    if (!experiment) return { kind: 'notMine' as const };
    const reveal = addDays(experiment.startDate, experiment.lengthDays);
    if (!canSendKey(reveal, localDay(new Date()))) return { kind: 'early' as const, reveal };
    return { kind: 'ok' as const, key: payload.key };
  }, [params.token]);

  if (result.kind === 'ok') {
    return <Redirect href={{ pathname: '/verdict', params: { key: result.key } }} />;
  }

  const copy =
    result.kind === 'early'
      ? {
          title: 'Too early to unlock',
          body: `Your verdict unlocks on ${shortDateLabel(result.reveal)}. Opening it now would spoil the blind, so the key wasn’t saved. Ask your keyholder to send it again then.`,
        }
      : result.kind === 'notMine'
        ? { title: 'Not your experiment', body: 'This key belongs to an experiment on another phone.' }
        : { title: 'This key link is broken', body: 'Ask your keyholder to send it again, or type the key on the verdict screen.' };

  return (
    <Scaffold>
      <View style={styles.center}>
        <Brian size={96} mood={result.kind === 'early' ? 'sleepy' : 'wow'} />
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
      </View>
      <Button label="Go home" onPress={() => router.replace('/')} />
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  title: { fontFamily: fonts.display, fontSize: 26, color: brand.ink, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: brand.ink2, textAlign: 'center' },
});
