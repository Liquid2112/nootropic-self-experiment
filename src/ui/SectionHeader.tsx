import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from './tokens';

export type SectionHeaderProps = {
  title: string;
  caption?: string;
  testID?: string;
};

/** Grouped-list section header with an optional supporting caption. */
export function SectionHeader({ title, caption, testID }: SectionHeaderProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  caption: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
