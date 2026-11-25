import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { brand } from '@/ui/tokens';

export type BrianMood = 'happy' | 'wink' | 'wow' | 'sleepy' | 'proud' | 'focused';

export type BrianProps = {
  size?: number;
  mood?: BrianMood;
  /** Tilt in degrees; Brian leans a little by default. */
  tilt?: number;
};

/**
 * Brian, Placebo's mascot: a chunky, friendly brain with a Tang hemisphere
 * and a Lilac hemisphere (the same split as the logo, and the two blinded
 * cups). Shapes are bold and rounded so the same character reads in the flat
 * app art and in the blocky 3D Stack City videos.
 */
export function Brian({ size = 120, mood = 'happy', tilt = -6 }: BrianProps) {
  const ink = brand.ink;
  return (
    <Svg width={size} height={size * 0.92} viewBox="0 0 120 110">
      <Ellipse cx="60" cy="104" rx="30" ry="4.5" fill={ink} opacity={0.08} />
      <G transform={`rotate(${tilt} 60 55)`}>
        {/* feet */}
        <Path d="M44 88 q0 8 -8 8 h-4" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
        <Path d="M76 88 q0 8 8 8 h4" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* left hemisphere (Tang) */}
        <Path
          d="M60 14 C48 8 34 12 30 22 C18 22 10 34 14 44 C6 52 8 66 18 70 C18 82 32 90 44 86 C50 92 58 92 60 90 Z"
          fill={brand.tang}
          stroke={ink}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* right hemisphere (Lilac) */}
        <Path
          d="M60 14 C72 8 86 12 90 22 C102 22 110 34 106 44 C114 52 112 66 102 70 C102 82 88 90 76 86 C70 92 62 92 60 90 Z"
          fill={brand.lilac}
          stroke={ink}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* folds */}
        <Path d="M30 22 q6 6 2 14 M18 48 q8 -2 12 6" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" opacity={0.55} />
        <Path d="M90 22 q-6 6 -2 14 M102 48 q-8 -2 -12 6" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" opacity={0.55} />
        {/* shine */}
        <Path d="M36 30 q6 -8 16 -9" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity={0.6} />
        {/* cheeks */}
        <Ellipse cx="38" cy="62" rx="6" ry="3.5" fill="#FFFFFF" opacity={0.35} />
        <Ellipse cx="82" cy="62" rx="6" ry="3.5" fill="#FFFFFF" opacity={0.45} />
        {face(mood)}
      </G>
    </Svg>
  );
}

function face(mood: BrianMood) {
  const ink = brand.ink;
  const eye = (cx: number) => (
    <>
      <Ellipse cx={cx} cy="52" rx="5" ry="6" fill={ink} />
      <Circle cx={cx + 1.6} cy="49.6" r="1.7" fill="#FFFFFF" />
    </>
  );
  const closed = (cx: number) => (
    <Path d={`M${cx - 5} 52 q5 4 10 0`} stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
  );
  const smile = <Path d="M52 64 q8 7 16 0" stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
  switch (mood) {
    case 'wink':
      return (
        <>
          {eye(48)}
          {closed(72)}
          {smile}
        </>
      );
    case 'wow':
      return (
        <>
          {eye(48)}
          {eye(72)}
          <Ellipse cx="60" cy="67" rx="4.5" ry="5.5" fill={ink} />
        </>
      );
    case 'sleepy':
      return (
        <>
          {closed(48)}
          {closed(72)}
          <Path d="M55 66 h10" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 'proud':
      return (
        <>
          {closed(48)}
          {closed(72)}
          <Path d="M50 62 q10 11 20 0 Z" fill={ink} />
        </>
      );
    case 'focused':
      return (
        <>
          <Path d="M42 43 q6 -2 11 0 M67 43 q5 -2 11 0" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          {eye(48)}
          {eye(72)}
          <Path d="M54 66 h12" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    default:
      return (
        <>
          {eye(48)}
          {eye(72)}
          {smile}
        </>
      );
  }
}
