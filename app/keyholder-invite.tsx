import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getDatabase } from '@/db';
import { Brian, Icon } from '@/brand';
import {
  clearPendingInvite,
  encodePayload,
  keyholderInviteMessage,
  pendingInvite,
} from '@/features/referral';
import { shortDateLabel } from '@/features/widget/model';
import { Button, Card, Scaffold, brand, fonts, spacing } from '@/ui';
import { REFERRAL_REWARDS_LIVE } from '@/config/referralRewards';

/**
 * Right after starting a friend-blinded run: get the key to a keyholder. Send a
 * link (they install Placebo to hold it, and you both get a free month) or hand
 * them this phone. The link is kept only until one of those happens, because
 * without it the run could never be unblinded.
 */
export default function KeyholderInviteScreen() {
  const params = useLocalSearchParams<{ done?: string }>();
  const [payload] = useState(() => pendingInvite(getDatabase()));
  const [sent, setSent] = useState(params.done === '1');

  function finish() {
    clearPendingInvite(getDatabase());
    router.replace('/');
  }

  if (!payload) {
    return (
      <Scaffold>
        <View style={styles.center}>
          <Brian size={96} mood="happy" />
          <Text style={styles.title}>Your key is with your keyholder</Text>
          <Text style={styles.body}>Nothing left to send. See you at the reveal.</Text>
        </View>
        <Button label="Go to Today" onPress={() => router.replace('/')} />
      </Scaffold>
    );
  }

  async function onSend() {
    if (!payload) return;
    try {
      const res = await Share.share({ message: keyholderInviteMessage(payload) });
      if (res.action !== Share.dismissedAction) setSent(true);
    } catch {
      // Share sheet unavailable; the user can still hand the phone over.
    }
  }

  return (
    <Scaffold
      footer={
        sent ? (
          <Button label="They have it. Start my run" onPress={finish} />
        ) : (
          <Button label="Send the key to a friend" onPress={() => void onSend()} />
        )
      }
    >
      <View style={styles.center}>
        <Brian size={96} mood="focused" />
        <Text style={styles.title}>Pick your keyholder</Text>
        <Text style={styles.body}>
          {`Someone you trust fills your cups and holds the key until ${shortDateLabel(payload.reveal)}. You never see it, so your expectations can’t sway the result.`}
        </Text>
      </View>

      <Card style={styles.card}>
        <Step n={1} text="Send them the key link. It opens in Placebo on their phone." />
        <Step n={2} text="They fill cup A and cup B. Only they know which is real." />
        <Step n={3} text={`On ${shortDateLabel(payload.reveal)} they send the key back and your verdict unlocks.`} />
      </Card>

      {REFERRAL_REWARDS_LIVE ? (
        <Card style={{ ...styles.card, ...styles.reward }}>
          <View style={styles.row}>
            <Icon name="gift" size={20} color={brand.tang} />
            <Text style={styles.rewardText}>You both get a free month when they hold your key.</Text>
          </View>
        </Card>
      ) : null}

      {sent ? (
        <Text style={styles.note}>Sent. Make sure they open it on their phone, not yours.</Text>
      ) : null}
      <Button
        label="They’re here. Show it on this phone"
        variant="subtle"
        onPress={() => router.push({ pathname: '/k/[token]', params: { token: encodePayload(payload), here: '1' } })}
      />
    </Scaffold>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.dot}>
        <Text style={styles.dotText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 28, color: brand.ink, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: brand.ink2, textAlign: 'center' },
  card: { gap: spacing.md },
  reward: { backgroundColor: brand.tangSoft, borderColor: brand.tangSoft },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontFamily: fonts.bold, fontSize: 13, color: brand.white },
  stepText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: brand.ink },
  rewardText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: brand.ink },
  note: { fontFamily: fonts.medium, fontSize: 14, color: brand.muted, textAlign: 'center' },
});
