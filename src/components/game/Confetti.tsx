import { useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { gameColors, lightTheme } from '@/ui';

const PALETTE = [
  lightTheme.colors.accent,
  gameColors.xp,
  gameColors.flame,
  gameColors.mint,
  gameColors.heroEnd,
  '#FF5FA2',
];

/** Small deterministic PRNG so a burst's layout is a pure function of its key. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(key: number | string): number {
  const text = String(key);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

type Piece = {
  x: number;
  size: number;
  color: string;
  delay: number;
  drift: number;
  spin: number;
  round: boolean;
};

export type ConfettiProps = {
  /** Number of pieces. Defaults to 70. */
  count?: number;
  /** Change this value to fire another burst. */
  burstKey?: number | string;
};

/**
 * A one-shot confetti burst built from plain Animated views (no extra native
 * dependency). Pieces fall from above the screen with a little drift and spin.
 * It ignores touches so it can sit on top of any screen.
 */
export function Confetti({ count = 70, burstKey = 0 }: ConfettiProps) {
  const { width, height } = Dimensions.get('window');
  const [progress] = useState(() => new Animated.Value(0));

  const pieces = useMemo<Piece[]>(() => {
    const rand = mulberry32(seedOf(burstKey));
    return Array.from({ length: count }, (_, i) => ({
        x: rand() * width,
        size: 6 + rand() * 7,
        color: PALETTE[i % PALETTE.length] ?? PALETTE[0]!,
        delay: rand() * 0.25,
        drift: (rand() - 0.5) * 120,
        spin: (rand() - 0.5) * 6,
        round: rand() > 0.6,
      }));
  }, [count, width, burstKey]);

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, burstKey]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const start = p.delay;
        const local = progress.interpolate({
          inputRange: [0, start, 1],
          outputRange: [0, 0, 1],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: -20,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity: local.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: local.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
                { translateX: local.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                {
                  rotate: local.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0rad', `${p.spin * Math.PI}rad`],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
