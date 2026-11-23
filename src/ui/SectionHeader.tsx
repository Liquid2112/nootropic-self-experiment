import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from './AppText';
import { useTheme } from './theme';

export type SectionHeaderProps = {
  /** Section title. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Alias for `subtitle`, used by screens that predate the rename. */
  caption?: string;
  /** Optional trailing accessory (e.g. an action link). */
  accessory?: ReactNode;
  /** Test id forwarded to the container. */
  testID?: string;
  style?: ViewStyle;
};

/** Heading that introduces a group of content or a list section. */
export function SectionHeader({ title, subtitle, caption, accessory, testID, style }: SectionHeaderProps) {
  const theme = useTheme();
  const supporting = subtitle ?? caption;
  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { paddingHorizontal: theme.spacing.xs, marginBottom: theme.spacing.sm },
        style,
      ]}
    >
      <View style={styles.textCol}>
        <AppText variant="title3">{title}</AppText>
        {supporting ? (
          <AppText variant="footnote" color="textSecondary">
            {supporting}
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
