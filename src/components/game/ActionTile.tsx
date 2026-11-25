import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/brand';
import { brand, fonts } from '@/ui';

export type ActionTileProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Icon bubble tint; the tile itself stays white. */
  tint: string;
  /** Icon stroke color. */
  iconColor?: string;
  /** Small corner tag, e.g. "NEW". */
  tag?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

/** A white shortcut tile with a tinted icon bubble, for the home grid. */
export function ActionTile({ icon, title, subtitle, tint, iconColor = brand.ink, tag, onPress, style }: ActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
    >
      <View style={[styles.bubble, { backgroundColor: tint }]}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
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
    gap: 14,
    minHeight: 124,
    backgroundColor: brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  bubble: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { gap: 2 },
  title: { fontSize: 16, fontFamily: fonts.displayBold, color: brand.ink },
  subtitle: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, color: brand.muted },
  tag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: brand.tang,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { color: brand.white, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.6 },
});
