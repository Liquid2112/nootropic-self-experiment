import { StyleSheet, Text, View } from 'react-native';
import { Scaffold, lightTheme } from '@/ui';

/**
 * Placeholder for the nootropic library. The real dictionary ships separately
 * and replaces this file; it exists so the home screen's Library tile never
 * lands on a missing route.
 */
export default function DictionaryPlaceholder() {
  return (
    <Scaffold>
      <View style={styles.box}>
        <Text style={styles.emoji}>📚</Text>
        <Text style={styles.title}>Nootropic library</Text>
        <Text style={styles.body}>
          What each nootropic does, what it claims, and what the research actually says. Coming very soon.
        </Text>
      </View>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 10, paddingTop: 60 },
  emoji: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: '800', color: lightTheme.colors.textPrimary },
  body: { fontSize: 16, textAlign: 'center', color: lightTheme.colors.textSecondary },
});
