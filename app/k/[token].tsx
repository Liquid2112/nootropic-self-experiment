import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '@/db';
import { Brian, Icon } from '@/brand';
import {
  REFERRAL_REWARD,
  decodeKeyholderPayload,
  holdKey,
  isOwnRun,
  referralState,
  setReferredBy,
  type KeyholderPayload,
} from '@/features/referral';
import { scheduleRevealReminder } from '@/features/referral/reminders';
import { stubRewardsBackend, syncAttribution } from '@/features/referral/rewards';
import { shortDateLabel } from '@/features/widget/model';
import { Button, Card, Scaffold, brand, fonts, radius, spacing } from '@/ui';

/**
 * A keyholder link, opened on the friend's phone (placebo.app/k/... or
 * placebo://k/...). It tells the friend how to fill the two cups and keeps the
 * key until reveal day. Accepting is the referral: the friend installed
 * Placebo to hold it, and both get a free month.
 *
 * `?here=1` is the in-person variant: the user hands their own phone over, the
 * friend reads the cup instruction, and nothing is saved.
 *
 * If the person running the experiment opens their own link, the cup stays
 * hidden: seeing it would unblind the run.
 */
export default function KeyholderScreen() {
  const params = useLocalSearchParams<{ token?: string; here?: string }>();
  const payload = useMemo(
    () => (typeof params.token === 'string' ? decodeKeyholderPayload(params.token) : null),
    [params.token],
  );
  const inPerson = params.here === '1';
  const ownRun = useMemo(() => (payload && !inPerson ? isOwnRun(getDatabase(), payload.run) : false), [payload, inPerson]);
  const [accepted, setAccepted] = useState(false);
  const [revealed, setRevealed] = useState(false);

  if (!payload) {
    return (
      <Scaffold>
        <Brian size={96} mood="wow" />
        <Text style={styles.title}>This key link is broken</Text>
        <Text style={styles.body}>Ask your friend to send it again, or paste it on the Invite screen.</Text>
        <Button label="Go home" onPress={() => router.replace('/')} />
      </Scaffold>
    );
  }

  if (ownRun) {
    return (
      <Scaffold>
        <View style={styles.center}>
          <Brian size={96} mood="wink" />
          <Text style={styles.title}>No peeking</Text>
          <Text style={styles.body}>
            This is the key for your own experiment. Opening it here would show which cup is real and spoil the blind.
            Send it to your keyholder instead.
          </Text>
        </View>
        <Button label="Back to my invite" onPress={() => router.replace('/keyholder-invite')} />
      </Scaffold>
    );
  }

  const who = payload.from || 'Your friend';
  const reveal = shortDateLabel(payload.reveal);

  async function onAccept(p: KeyholderPayload) {
    const db = getDatabase();
    holdKey(db, p);
    setReferredBy(db, p.ref);
    const me = referralState(db);
    void syncAttribution({ referralCode: me.myCode, referredBy: me.referredBy, creatorCode: me.creatorCode });
    void stubRewardsBackend.claim({ referrerCode: p.ref, refereeCode: me.myCode, via: 'keyholder' });
    void scheduleRevealReminder(p);
    setAccepted(true);
  }

  return (
    <Scaffold>
      <View style={styles.center}>
        <Brian size={88} mood="focused" />
        <Text style={styles.kicker}>{inPerson ? 'FOR THE KEYHOLDER’S EYES ONLY' : 'YOU’RE THE KEYHOLDER'}</Text>
        <Text style={styles.title}>{`${who} is testing ${payload.supplement}, blind`}</Text>
        <Text style={styles.body}>
          {`They take a capsule from cup A or cup B each day and never learn which is real until ${reveal}. You’re the only one who knows.`}
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.rowHead}>
          <Icon name="cups" size={20} color={brand.tang} />
          <Text style={styles.cardTitle}>Fill the cups</Text>
        </View>
        {revealed ? (
          <View style={styles.cups}>
            <Cup letter={payload.cup} label={payload.supplement} real />
            <Cup letter={payload.cup === 'A' ? 'B' : 'A'} label="Placebo" real={false} />
          </View>
        ) : (
          <Button label="Show me which cup is real" variant="secondary" onPress={() => setRevealed(true)} />
        )}
        <Text style={styles.muted}>
          Use identical-looking capsules for both, e.g. empty gel caps filled with rice flour for the placebo. Label the
          cups A and B, then don’t tell them which is which.
        </Text>
      </Card>

      {inPerson ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Write down this key</Text>
            <Text style={styles.key}>{payload.key}</Text>
            <Text style={styles.muted}>{`On ${reveal} they’ll need it to unlock the verdict. Keep it off their phone.`}</Text>
          </Card>
          <Button label="Done. Hand the phone back" onPress={() => router.replace('/keyholder-invite?done=1')} />
        </>
      ) : accepted ? (
        <Card style={styles.card}>
          <View style={styles.rowHead}>
            <Icon name="gift" size={20} color={brand.mint} />
            <Text style={styles.cardTitle}>Key saved. You both get a free month.</Text>
          </View>
          <Text style={styles.muted}>
            {`We’ll remind you on ${reveal} to send it back. Until then, sit tight.`}
          </Text>
          <Button label="Run a blind test of your own" onPress={() => router.replace('/welcome')} />
          <Button label="See keys I’m holding" variant="subtle" onPress={() => router.replace('/invite')} />
        </Card>
      ) : (
        <>
          <Button label="Hold the key" onPress={() => void onAccept(payload)} />
          <Text style={styles.fine}>
            {`You and ${who} each get ${REFERRAL_REWARD.months} free month of Placebo.`}
          </Text>
        </>
      )}
    </Scaffold>
  );
}

function Cup({ letter, label, real }: { letter: string; label: string; real: boolean }) {
  return (
    <View style={[styles.cup, real ? styles.cupReal : styles.cupFake]}>
      <Text style={styles.cupLetter}>{letter}</Text>
      <Text style={styles.cupLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2, color: brand.tang },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: brand.ink, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: brand.ink2, textAlign: 'center' },
  card: { gap: spacing.md },
  rowHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: brand.ink, flexShrink: 1 },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: brand.muted },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: brand.muted, textAlign: 'center' },
  cups: { flexDirection: 'row', gap: spacing.md },
  cup: { flex: 1, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  cupReal: { backgroundColor: brand.tangSoft },
  cupFake: { backgroundColor: brand.lilacSoft },
  cupLetter: { fontFamily: fonts.display, fontSize: 40, color: brand.ink },
  cupLabel: { fontFamily: fonts.semibold, fontSize: 14, color: brand.ink, textAlign: 'center' },
  key: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: 2, color: brand.ink, textAlign: 'center' },
});
