import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { brand, fonts } from '@/ui/tokens';

export type LogoMarkProps = {
  size?: number;
  /** Draw on a colored tile (app-icon style). */
  tile?: boolean;
  tileColor?: string;
};

/**
 * The Placebo mark: a brain split into a Tang and a Lilac hemisphere. The two
 * halves are the two blinded cups; nobody knows which one is real.
 */
export function LogoMark({ size = 40, tile = false, tileColor = brand.ink }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {tile ? <Rect x="0" y="0" width="100" height="100" rx="24" fill={tileColor} /> : null}
      <G transform={tile ? 'translate(50 50) scale(0.72) translate(-50 -50)' : undefined}>
        <Path
          d="M48 16 C38 10 26 14 23 23 C13 24 7 34 10 43 C4 50 6 62 14 66 C14 77 26 85 37 81 C42 87 47 87 48 86 Z"
          fill={brand.tang}
        />
        <Path
          d="M52 16 C62 10 74 14 77 23 C87 24 93 34 90 43 C96 50 94 62 86 66 C86 77 74 85 63 81 C58 87 53 87 52 86 Z"
          fill={brand.lilac}
        />
        <Path d="M27 32 q5 -7 13 -8" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" fill="none" opacity={0.6} />
      </G>
    </Svg>
  );
}

export type LogoProps = {
  size?: number;
  color?: string;
  style?: ViewStyle;
};

/** Mark + lowercase wordmark, the default lockup. */
export function Logo({ size = 28, color = brand.ink, style }: LogoProps) {
  return (
    <View style={[styles.row, style]} accessibilityRole="image" accessibilityLabel="Placebo">
      <LogoMark size={size * 1.15} />
      <Text style={[styles.word, { fontSize: size, lineHeight: size * 1.15, color }]}>placebo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  word: { fontFamily: fonts.display, letterSpacing: -1 },
});
