import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { brand } from '@/ui/tokens';

/**
 * Placebo's icon set: 24pt grid, 2pt rounded strokes, no fills except where a
 * shape needs weight. One family everywhere, instead of emoji, so the UI reads
 * as designed rather than assembled.
 */
export type IconName =
  | 'home'
  | 'flame'
  | 'bolt'
  | 'map'
  | 'trophy'
  | 'book'
  | 'check'
  | 'lock'
  | 'capsule'
  | 'brain'
  | 'chart'
  | 'clock'
  | 'eyeOff'
  | 'sparkle'
  | 'arrowRight'
  | 'chevronRight'
  | 'close'
  | 'share'
  | 'star'
  | 'target'
  | 'moon'
  | 'smile'
  | 'flask'
  | 'shield'
  | 'calendar'
  | 'gift'
  | 'crown'
  | 'cups'
  | 'search'
  | 'flag'
  | 'medal'
  | 'plus'
  | 'alert';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Stroke width on the 24pt grid. Defaults to 2. */
  strokeWidth?: number;
};

export function Icon({ name, size = 24, color = brand.ink, strokeWidth = 2 }: IconProps) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {GLYPHS[name](p, color)}
    </Svg>
  );
}

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

const GLYPHS: Record<IconName, (p: StrokeProps, color: string) => React.ReactNode> = {
  home: (p) => <Path {...p} d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  flame: (p) => (
    <Path {...p} d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.3-2.2-5.4-3.6-7.6-.5 1.6-1.4 2.6-2.4 3C12.8 7.4 11.6 4.8 9.3 3c.3 2.8-1.2 4.8-2.6 6.6C5.9 10.7 5.5 12.4 5.5 14.8 5.5 18.4 8.1 21 12 21Z" />
  ),
  bolt: (p) => <Path {...p} d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z" />,
  map: (p) => (
    <>
      <Path {...p} d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" />
      <Path {...p} d="M9 4v14M15 6v14" />
    </>
  ),
  trophy: (p) => (
    <>
      <Path {...p} d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" />
      <Path {...p} d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20h7M9.5 17h5" />
    </>
  ),
  book: (p) => (
    <>
      <Path {...p} d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19v15H6.5a2 2 0 0 0-2 2z" />
      <Path {...p} d="M4.5 20.5v-15M19 18.5V21H6.5M9 8h6" />
    </>
  ),
  check: (p) => <Path {...p} d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: (p) => (
    <>
      <Rect {...p} x="5" y="10.5" width="14" height="10" rx="2.5" />
      <Path {...p} d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" />
    </>
  ),
  capsule: (p) => (
    <>
      <Rect {...p} x="2.8" y="8.2" width="18.4" height="7.6" rx="3.8" transform="rotate(-40 12 12)" />
      <Path {...p} d="m9.6 9.2 5 5.6" />
    </>
  ),
  brain: (p) => (
    <>
      <Path {...p} d="M12 5.5a3 3 0 0 0-5.6-1.2A3 3 0 0 0 4 8.5a3.2 3.2 0 0 0 .4 5.6A3 3 0 0 0 8 19a3 3 0 0 0 4 .5z" />
      <Path {...p} d="M12 5.5a3 3 0 0 1 5.6-1.2A3 3 0 0 1 20 8.5a3.2 3.2 0 0 1-.4 5.6A3 3 0 0 1 16 19a3 3 0 0 1-4 .5z" />
      <Path {...p} d="M12 5.5v14" />
    </>
  ),
  chart: (p) => <Path {...p} d="M4 20h16M7 16.5V11M12 16.5V6.5M17 16.5v-3.5" />,
  clock: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="8.5" />
      <Path {...p} d="M12 7.5V12l3 2" />
    </>
  ),
  eyeOff: (p) => (
    <>
      <Path {...p} d="M3.5 12S6.5 6.5 12 6.5c1.3 0 2.5.3 3.5.8M20.5 12s-3 5.5-8.5 5.5c-1.3 0-2.5-.3-3.5-.8" />
      <Path {...p} d="M4 20 20 4" />
    </>
  ),
  sparkle: (p) => (
    <Path {...p} d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5ZM18.5 16c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" />
  ),
  arrowRight: (p) => <Path {...p} d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />,
  chevronRight: (p) => <Path {...p} d="m9.5 6 6 6-6 6" />,
  close: (p) => <Path {...p} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  share: (p) => (
    <>
      <Path {...p} d="M12 3.5v11M8 7.5l4-4 4 4" />
      <Path {...p} d="M6.5 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-.5" />
    </>
  ),
  star: (p) => (
    <Path {...p} d="m12 3.8 2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.7z" />
  ),
  target: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="8.5" />
      <Circle {...p} cx="12" cy="12" r="4.5" />
      <Circle {...p} cx="12" cy="12" r="0.8" />
    </>
  ),
  moon: (p) => <Path {...p} d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" />,
  smile: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="8.5" />
      <Path {...p} d="M8.5 14a4 4 0 0 0 7 0M9 9.5v.5M15 9.5v.5" />
    </>
  ),
  flask: (p) => (
    <>
      <Path {...p} d="M9.5 3.5h5M10 3.5v6L4.8 18.3A1.5 1.5 0 0 0 6.1 20.5h11.8a1.5 1.5 0 0 0 1.3-2.2L14 9.5v-6" />
      <Path {...p} d="M7.3 14.5h9.4" />
    </>
  ),
  shield: (p) => (
    <>
      <Path {...p} d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" />
      <Path {...p} d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  calendar: (p) => (
    <>
      <Rect {...p} x="4" y="5.5" width="16" height="15" rx="2.5" />
      <Path {...p} d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  gift: (p) => (
    <>
      <Rect {...p} x="4" y="8.5" width="16" height="4" rx="1" />
      <Path {...p} d="M5.5 12.5V20h13v-7.5M12 8.5V20M12 8.5S10.5 4 8.2 4.5C6 5 7 8.5 12 8.5ZM12 8.5s1.5-4.5 3.8-4c2.2.5 1.2 4-3.8 4Z" />
    </>
  ),
  crown: (p) => <Path {...p} d="M4 8.5 7.5 12 12 5.5l4.5 6.5L20 8.5 18.5 18h-13zM5.5 20.5h13" />,
  cups: (p) => (
    <>
      <Path {...p} d="M3.5 7.5h7l-1 12h-5zM13.5 7.5h7l-1 12h-5z" />
      <Path {...p} d="M5.5 4.5h3M15.5 4.5h3" />
    </>
  ),
  search: (p) => (
    <>
      <Circle {...p} cx="10.5" cy="10.5" r="6" />
      <Path {...p} d="m15 15 5 5" />
    </>
  ),
  flag: (p) => <Path {...p} d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" />,
  medal: (p) => (
    <>
      <Circle {...p} cx="12" cy="14.5" r="5.5" />
      <Path {...p} d="M8.5 10 6 3.5h4l2 5M15.5 10 18 3.5h-4l-2 5M12 12.3v4.4" />
    </>
  ),
  plus: (p) => <Path {...p} d="M12 5v14M5 12h14" />,
  alert: (p) => (
    <>
      <Path {...p} d="M10.3 4.3 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <Path {...p} d="M12 9.5v4.5M12 17.2v.1" />
    </>
  ),
};
