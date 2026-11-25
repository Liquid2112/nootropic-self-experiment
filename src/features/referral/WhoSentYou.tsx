import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CREATORS } from '@/config/creators';
import { getDatabase } from '@/db';
import { Button, brand, fonts, radius, spacing } from '@/ui';
import { lookupCode } from './model';
import { syncAttribution } from './rewards';
import { referralState, setCreatorCode, setReferredBy } from './store';

export type WhoSentYouProps = {
  /** Called after a code is saved, or when the user skips. */
  onDone?: (result: { saved: boolean }) => void;
  /** Show a Skip button (onboarding). */
  skippable?: boolean;
};

/**
 * "Who sent you?" A creator code or a friend's code. Built as a standalone step
 * so the quiz onboarding can drop it in as one of its screens; it is also on
 * the Invite screen for anyone who skipped it.
 */
export function WhoSentYou({ onDone, skippable = false }: WhoSentYouProps) {
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSave() {
    const db = getDatabase();
    const me = referralState(db);
    const match = lookupCode(value, CREATORS, me.myCode);
    if (!match) {
      setMessage('We don’t recognize that code. Check the spelling, or skip.');
      return;
    }
    const ok = match.kind === 'creator' ? setCreatorCode(db, match.code) : setReferredBy(db, match.code);
    if (!ok) {
      setMessage('You’ve already used a code on this phone.');
      return;
    }
    const after = referralState(db);
    void syncAttribution({ referralCode: after.myCode, referredBy: after.referredBy, creatorCode: after.creatorCode });
    setSaved(true);
    setMessage(
      match.kind === 'creator'
        ? `Thanks for coming from ${match.name}. Your first month is on us when you start an experiment.`
        : 'Code saved. You and your friend each get a free month when you start an experiment.',
    );
    onDone?.({ saved: true });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Who sent you?</Text>
      <Text style={styles.body}>Got a code from a creator or a friend? Enter it for a free month.</Text>
      <TextInput
        value={value}
        onChangeText={(t) => {
          setValue(t);
          setMessage(null);
        }}
        placeholder="Code, e.g. STACKCITY"
        placeholderTextColor={brand.faint}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!saved}
        style={styles.input}
      />
      {message ? <Text style={saved ? styles.ok : styles.error}>{message}</Text> : null}
      {!saved ? (
        <View style={styles.actions}>
          <Button label="Apply code" onPress={() => void onSave()} disabled={value.trim().length === 0} />
          {skippable ? <Button label="Skip" variant="subtle" onPress={() => onDone?.({ saved: false })} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontFamily: fonts.displayBold, fontSize: 20, color: brand.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: brand.muted },
  input: {
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.semibold,
    fontSize: 17,
    letterSpacing: 1,
    color: brand.ink,
    backgroundColor: brand.white,
  },
  actions: { gap: spacing.sm },
  ok: { fontFamily: fonts.medium, fontSize: 14, color: brand.mint },
  error: { fontFamily: fonts.medium, fontSize: 14, color: brand.rose },
});
