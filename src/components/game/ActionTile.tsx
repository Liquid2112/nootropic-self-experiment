import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { lightTheme } from '@/ui';

export type ActionTileProps = {
  emoji: string;
  title: string;
  subtitle?: string;
  /** Tile tint (background); the emoji sits on a white bubble. */
  tint: string;
  /** Small corner tag, e.g. "NEW" or "SOON". */
  tag?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

/** A colorful square shortcut tile for the home grid. */
export function ActionTile({ emoji, title, subtitle, tint, tag, onPress, style }: ActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tint, transform: [{ scale: pressed ? 0.96 : 1 }] },
        style,
      ]}
    >
      <View style={styles.bubble}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {tag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 20,
    padding: 14,
    gap: 6,
    minHeight: 118,
  },
  bubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  title: { fontSize: 16, fontWeight: '700', color: lightTheme.colors.textPrimary },
  subtitle: { fontSize: 12, color: lightTheme.colors.textSecondary },
  tag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: lightTheme.colors.textPrimary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
