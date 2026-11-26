/**
 * Word memory — study now, recognize later. Pure logic.
 *
 * At the start of the check-in the user sees a short list of words. After the
 * other tests (a few minutes of filled delay) they pick the words they saw from
 * a grid mixing studied words and new ones. This is a delayed recognition test
 * in the style of the word-list tasks in standard memory batteries (e.g. the
 * CDR system's word recognition, Wesnes 2000). Score: hits minus false alarms
 * (Snodgrass & Corwin, 1988), so tapping everything earns nothing.
 *
 * Every day draws a fresh list from a large pool of common concrete nouns.
 */
import { createRng } from './rng';
import { shuffle } from './shuffle';

/** Words studied per day. */
export const RECALL_STUDY_WORDS = 10;
/** How long each study word stays on screen. */
export const RECALL_WORD_MS = 1500;

/** Common, concrete, easy-to-picture nouns of similar length and frequency. */
export const RECALL_WORD_POOL: readonly string[] = [
  'anchor', 'apple', 'arrow', 'badge', 'basket', 'beach', 'bell', 'blanket', 'boat', 'bottle',
  'bread', 'brick', 'bridge', 'brush', 'bucket', 'button', 'cabin', 'cake', 'camera', 'candle',
  'canoe', 'carpet', 'castle', 'chair', 'cherry', 'chimney', 'clock', 'cloud', 'coat', 'coin',
  'collar', 'compass', 'cookie', 'corn', 'cotton', 'crown', 'cup', 'curtain', 'desk', 'diamond',
  'dish', 'doll', 'door', 'dragon', 'drum', 'eagle', 'engine', 'feather', 'fence', 'flag',
  'flute', 'forest', 'fork', 'fountain', 'frog', 'garden', 'garlic', 'gate', 'glove', 'goat',
  'guitar', 'hammer', 'harbor', 'helmet', 'honey', 'horse', 'island', 'jacket', 'jar', 'kettle',
  'key', 'kite', 'ladder', 'lamp', 'lemon', 'letter', 'lion', 'magnet', 'map', 'marble',
  'mask', 'meadow', 'mirror', 'monkey', 'moon', 'mountain', 'nail', 'necklace', 'needle', 'nest',
  'ocean', 'onion', 'orange', 'owl', 'paddle', 'palace', 'pencil', 'pepper', 'piano', 'pillow',
  'pipe', 'planet', 'plate', 'pocket', 'pony', 'potato', 'puzzle', 'rabbit', 'radio', 'ribbon',
  'river', 'robot', 'rocket', 'rope', 'saddle', 'sail', 'salad', 'scarf', 'shell', 'shoe',
  'shovel', 'silver', 'skate', 'sock', 'spider', 'spoon', 'stamp', 'statue', 'stone', 'sugar',
  'sword', 'table', 'teapot', 'tiger', 'tent', 'thimble', 'ticket', 'tower', 'tractor', 'train',
  'trumpet', 'tulip', 'tunnel', 'turtle', 'umbrella', 'valley', 'violin', 'wagon', 'wallet', 'whale',
  'whistle', 'window', 'wolf', 'zipper', 'acorn', 'banana', 'barrel', 'blossom', 'bubble', 'cactus',
  'carrot', 'cereal', 'chalk', 'cliff', 'copper', 'desert', 'donkey', 'falcon', 'ferry', 'goblet',
  'hornet', 'iceberg', 'jungle', 'lantern', 'lizard', 'mitten', 'muffin', 'oyster', 'parrot', 'peach',
  'pebble', 'penguin', 'pickle', 'pirate', 'pumpkin', 'quilt', 'raven', 'saucer', 'sponge', 'squirrel',
];

export type RecallSet = {
  /** Words to study, in presentation order. */
  study: string[];
  /** The recognition grid: studied and new words, shuffled. */
  probes: string[];
};

export function generateRecallSet(options: { seed: number; words?: number }): RecallSet {
  const rng = createRng(options.seed);
  const n = Math.min(options.words ?? RECALL_STUDY_WORDS, Math.floor(RECALL_WORD_POOL.length / 2));
  const drawn = shuffle(RECALL_WORD_POOL, rng).slice(0, n * 2);
  const study = drawn.slice(0, n);
  const lures = drawn.slice(n);
  return { study, probes: shuffle([...study, ...lures], rng) };
}

export type RecallScore = {
  hits: number;
  falseAlarms: number;
  /** Hits minus false alarms, floored at 0 (0..study length). Higher is better. */
  score: number;
};

export function scoreRecall(set: RecallSet, picked: Iterable<string>): RecallScore {
  const studied = new Set(set.study);
  const probes = new Set(set.probes);
  let hits = 0;
  let falseAlarms = 0;
  for (const word of new Set(picked)) {
    if (!probes.has(word)) continue;
    if (studied.has(word)) hits += 1;
    else falseAlarms += 1;
  }
  return { hits, falseAlarms, score: Math.max(0, hits - falseAlarms) };
}
