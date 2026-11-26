import { useCallback, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getDatabase } from '@/db';
import { Icon } from '@/brand';
import {
  canSendKey,
  heldKeys,
  markKeySent,
  parseLink,
  referralMessage,
  referralState,
  unlockMessage,
  type HeldKey,
  type ReferralState,
} from '@/features/referral';
import { WhoSentYou } from '@/features/referral/WhoSentYou';
import { localDay } from '@/features/gamification';
import { shortDateLabel } from '@/features/widget/model';
import { Button, Card, Scaffold, brand, fonts, radius, spacing } from '@/ui';

type Loaded = { me: ReferralState; keys: HeldKey[]; today: string };

function load(): Loaded {
  const db = getDatabase();
  return { me: referralState(db), keys: heldKeys(db), today: localDay(new Date()) };
}

/**
 * Invite hub: your referral code, "Who sent you?", and the keys you hold for
 * friends (with a Send button that unlocks on their reveal day).
 */
export default function InviteScreen() {
  const [state, setState] = useState<Loaded>(load);
  const [paste, setPaste] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
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

  async function sendKey(k: HeldKey) {
    try {
      const res = await Share.share({ message: unlockMessage({ v: 1, run: k.run, key: k.key }, k.supplement) });
      if (res.action !== Share.dismissedAction) {
        markKeySent(getDatabase(), k.run);
        setState(load());
      }
    } catch {
      // ignore
    }
  }

  function openPasted() {
    const link = parseLink(paste);
    if (!link || link.kind === 'r') {
      setPasteError('That doesn’t look like a Placebo key link.');
      return;
    }
    setPasteError(null);
    router.push(link.kind === 'k' ? { pathname: '/k/[token]', params: { token: link.token } } : { pathname: '/u/[token]', params: { token: link.token } });
  }

  return (
    <Scaffold>
      <Card style={styles.hero}>
        <Text style={styles.kicker}>GIVE A MONTH, GET A MONTH</Text>
        <Text style={styles.heroTitle}>Your code</Text>
        <Text style={styles.code}>{state.me.myCode}</Text>
        <Text style={styles.heroBody}>
          A friend who starts with your code gets a free month, and so do you. Your code is also on every verdict card
          you share.
        </Text>
        <Button label="Share my code" onPress={() => void shareCode()} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Icon name="lock" size={20} color={brand.lilacDeep} />
          <Text style={styles.cardTitle}>Keys you’re holding</Text>
        </View>
        {state.keys.length === 0 ? (
          <Text style={styles.muted}>
            When a friend makes you the keyholder for their blind test, their key shows up here.
          </Text>
        ) : (
          state.keys.map((k) => {
            const ready = canSendKey(k.reveal, state.today);
            return (
              <View key={k.run} style={styles.keyRow}>
                <Text style={styles.keyTitle}>{`${k.from || 'A friend'}’s ${k.supplement} test`}</Text>
                <Text style={styles.muted}>
                  {`Cup ${k.cup} is the real one. Key ${k.key}. `}
                  {k.sentAt ? 'Sent.' : ready ? 'Reveal day is here.' : `Unlocks ${shortDateLabel(k.reveal)}.`}
                </Text>
                {ready ? (
                  <Button
                    label={k.sentAt ? 'Send the key again' : 'Send the key'}
                    variant={k.sentAt ? 'subtle' : 'primary'}
                    onPress={() => void sendKey(k)}
                  />
                ) : null}
              </View>
            );
          })
        )}
        <TextInput
          value={paste}
          onChangeText={(t) => {
            setPaste(t);
            setPasteError(null);
          }}
          placeholder="Paste a key link from a friend"
          placeholderTextColor={brand.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {pasteError ? <Text style={styles.error}>{pasteError}</Text> : null}
        {paste.trim().length > 0 ? <Button label="Open link" variant="secondary" onPress={openPasted} /> : null}
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
