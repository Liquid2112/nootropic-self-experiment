import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from './AppText';
import { useTheme } from './theme';

export type SectionHeaderProps = {
  /** Section title. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional trailing accessory (e.g. an action link). */
  accessory?: ReactNode;
  style?: ViewStyle;
};

/** Heading that introduces a group of content or a list section. */
export function SectionHeader({ title, subtitle, accessory, style }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: theme.spacing.xs, marginBottom: theme.spacing.sm },
        style,
      ]}
    >
      <View style={styles.textCol}>
        <AppText variant="title3">{title}</AppText>
        {subtitle ? (
          <AppText variant="footnote" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {accessory ? <View>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
});
