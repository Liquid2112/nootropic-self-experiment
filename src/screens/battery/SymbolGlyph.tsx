import Svg, { Path } from 'react-native-svg';

/**
 * The nine abstract symbols for the symbol-coding task. Simple strokes, all
 * different in outline, so they're told apart at a glance at small sizes.
 */
const GLYPHS: string[] = [
  'M5 19 12 5l7 14z',
  'M5 5h14v14H5zM5 5l14 14',
  'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M4 12h16',
  'M4 9h16M4 15h16M9 4v16',
  'M6 6l12 12M18 6 6 18',
  'M4 16 8 8l4 8 4-8 4 8',
  'M7 4v16h11',
  'M12 4 20 12 12 20 4 12z',
  'M5 12a7 7 0 0 1 14 0M12 12v8',
];

export function SymbolGlyph({
  id,
  size = 28,
  color,
  strokeWidth = 2,
}: {
  id: number;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={GLYPHS[id] ?? GLYPHS[0]!}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
