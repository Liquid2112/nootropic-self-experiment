import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { getDatabase } from '@/db';
import {
  analyticsOptedOut,
  anonymousId,
  analyticsProgressConsent,
  setAnalyticsOptOut,
  setAnalyticsProgressConsent,
} from '@/features/analytics';
import { PRIVACY_POLICY_URL } from '@/config/links';
import { Card, Scaffold, brand, fonts } from '@/ui';

function read<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Privacy choices: the two analytics switches the privacy policy promises.
 * Everything else the app stores never leaves the phone, so there's nothing
 * else to switch off. Deleting the app deletes all of it.
 */
export default function PrivacySettings() {
  const [usage, setUsage] = useState(() => read(() => !analyticsOptedOut(getDatabase()), false));
  const [installId] = useState(() => read(() => anonymousId(getDatabase()), ''));
  const [progress, setProgress] = useState(() => read(() => analyticsProgressConsent(getDatabase()), false));

  function toggleUsage(on: boolean) {
    setUsage(on);
    read(() => setAnalyticsOptOut(getDatabase(), !on), undefined);
  }

  function toggleProgress(on: boolean) {
    setProgress(on);
    read(() => setAnalyticsProgressConsent(getDatabase(), on), undefined);
  }

  return (
    <Scaffold testID="privacy-settings">
      <Text style={styles.intro}>
        Your experiment, scores, check-ins and Health data stay on this phone. We can’t see them. The switches below
        cover the only things that leave it: anonymous counts that help us fix and improve the app.
      </Text>

      <Card style={styles.card}>
        <Row
          title="Anonymous usage counts"
          body="Steps like opening the paywall or starting a trial. No personal details."
          value={usage}
          onChange={toggleUsage}
          testID="toggle-usage"
        />
        <View style={styles.divider} />
        <Row
          title="Anonymous progress counts"
          body="Which day of your run you’re on and whether you checked in. Never your scores, health data, supplement or verdict."
          value={usage && progress}
          disabled={!usage}
          onChange={toggleProgress}
          testID="toggle-progress"
        />
      </Card>

      {installId ? (
        <Text style={styles.fine} selectable testID="install-id">
          {`Your anonymous install ID: ${installId}. Include it if you ask us to delete your analytics data.`}
        </Text>
      ) : null}

      <Text style={styles.fine}>
        To delete everything the app stores, delete the app. Subscriptions are managed in your App Store settings.
      </Text>

      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
        <Text style={styles.link}>Read the privacy policy</Text>
      </Pressable>
    </Scaffold>
  );
}

function Row(props: {
  title: string;
  body: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{props.title}</Text>
        <Text style={styles.rowBody}>{props.body}</Text>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        disabled={props.disabled}
        accessibilityLabel={props.title}
        testID={props.testID}
        trackColor={{ true: brand.ink, false: brand.line }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted },
  card: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontFamily: fonts.semibold, color: brand.ink },
  rowBody: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.muted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: brand.line },
  fine: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.muted },
  link: { fontSize: 15, fontFamily: fonts.semibold, color: brand.ink, textDecorationLine: 'underline' },
});
