import { useCallback, useState } from 'react';
import { Share, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getDatabase } from '@/db';
import { rewardCopy } from '@/config/referralRewards';
import { referralMessage, referralState, type ReferralState } from '@/features/referral';
import { WhoSentYou } from '@/features/referral/WhoSentYou';
import { Button, Card, Scaffold, brand, fonts, radius, spacing } from '@/ui';

type Loaded = { me: ReferralState };

function load(): Loaded {
  return { me: referralState(getDatabase()) };
}

/**
 * Invite hub: your code to share with a friend, and "Who sent you?". Runs are
 * solo, so there is no keyholder role any more; sharing is a plain invite.
 */
export default function InviteScreen() {
  const [state, setState] = useState<Loaded>(load);
  useFocusEffect(
    useCallback(() => {
      setState(load());
    }, []),
  );

  async function shareCode() {
    try {
      await Share.share({ message: referralMessage(state.me.myCode) });
    } catch {
      // ignore
    }
  }

  return (
    <Scaffold>
      <Card style={styles.hero}>
        <Text style={styles.kicker}>{rewardCopy('inviteKicker')}</Text>
        <Text style={styles.heroTitle}>Your code</Text>
        <Text style={styles.code}>{state.me.myCode}</Text>
        <Text style={styles.heroBody}>{rewardCopy('inviteBody')}</Text>
        <Button label="Share my code" onPress={() => void shareCode()} />
      </Card>

      {!state.me.referredBy && !state.me.creatorCode ? (
        <Card style={styles.card}>
          <WhoSentYou onDone={() => setState(load())} />
        </Card>
      ) : null}
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, backgroundColor: brand.tangSoft, borderColor: brand.tangSoft },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2, color: brand.tangInk },
  heroTitle: { fontFamily: fonts.medium, fontSize: 14, color: brand.muted },
  code: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 3, color: brand.ink },
  heroBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: brand.ink2, marginBottom: spacing.sm },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: brand.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: brand.muted },
  keyRow: { gap: spacing.xs, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: brand.line },
  keyTitle: { fontFamily: fonts.semibold, fontSize: 15, color: brand.ink },
  input: {
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: brand.ink,
    backgroundColor: brand.white,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: brand.roseInk },
});
