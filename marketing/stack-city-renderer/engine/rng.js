export const BRAND = {
  TANG: 0xFF5A36,
  LIL: 0xB7A6FF,
  INK: 0x15131C,
  PAPER: 0xF7F4EE,
  MINT: 0x2FBF71,
  GOLD: 0xFFC23A,
  BLUE: 0x4AA3FF,
  PINK: 0xFF6FA8,
  TANG_HEX: '#FF5A36',
  LIL_HEX: '#B7A6FF',
  INK_HEX: '#15131C',
  PAPER_HEX: '#F7F4EE',
  MINT_HEX: '#2FBF71',
  GOLD_HEX: '#FFC23A'
};

/**
 * Deterministic 32-bit PRNG (Mulberry32). Never uses Math.random().
 */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t) => {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
};

export const easeInCubic = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * x;
};

export const easeInOutCubic = (t) => {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const easeOutBack = (t, c = 1.9) => {
  const x = clamp(t, 0, 1);
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

const EASINGS = {
  linear: (t) => clamp(t, 0, 1),
  ease_out: easeOutCubic,
  easeOut: easeOutCubic,
  easeOutCubic,
  ease_in: easeInCubic,
  easeIn: easeInCubic,
  easeInCubic,
  ease_in_out: easeInOutCubic,
  easeInOut: easeInOutCubic,
  easeInOutCubic,
  back: easeOutBack,
  easeOutBack,
  smoothstep: (t) => smoothstep(0, 1, t)
};

export function getEase(name = 'ease_out') {
  return EASINGS[name] || easeOutCubic;
}
