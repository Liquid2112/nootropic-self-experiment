/**
 * Cognitive test engine — pure, UI-free logic for the two tasks a test session
 * records: the Psychomotor Vigilance Task (PVT) and letter 2-back. A screen
 * drives it by generating a trial schedule / stimulus stream, feeding in the
 * timestamps or responses it collects, applying the validity rules, and reading
 * the scores out. No database, no React Native, no randomness that a test
 * cannot pin via a seed.
 */
export { createRng } from './rng';
export type { Rng } from './rng';

export {
  PVT_MIN_ISI_MS,
  PVT_MAX_ISI_MS,
  PVT_DEFAULT_TRIALS,
  PVT_LAPSE_THRESHOLD_MS,
  generatePvtSchedule,
  scorePvt,
} from './pvt';
export type { PvtScheduleOptions, PvtScore } from './pvt';

export {
  NBACK_N,
  NBACK_DEFAULT_TRIALS,
  NBACK_DEFAULT_TARGET_RATE,
  NBACK_LETTERS,
  generateNbackSequence,
  scoreNback,
  normInv,
} from './nback';
export type {
  NbackSequenceOptions,
  NbackSequence,
  NbackResponse,
  NbackScore,
} from './nback';

export {
  MIN_PLAUSIBLE_RT_MS,
  DEFAULT_MIN_COMPLETION_RATE,
  DEFAULT_MAX_DISCARD_RATE,
  filterPlausibleReactionTimes,
  validateSession,
} from './validity';
export type {
  ValidityReason,
  SessionValidity,
  ValidateSessionInput,
} from './validity';

export {
  STROOP_COLORS,
  STROOP_DEFAULT_TRIALS,
  STROOP_MIN_RT_MS,
  generateStroopTrials,
  scoreStroop,
} from './stroop';
export type { StroopColor, StroopTrial, StroopResponse, StroopScore } from './stroop';

export {
  SYMBOL_COUNT,
  SYMBOL_DURATION_MS,
  SYMBOL_STREAM_LENGTH,
  generateSymbolSet,
  scoreSymbol,
} from './symbol';
export type { SymbolSet, SymbolScore } from './symbol';

export {
  RECALL_STUDY_WORDS,
  RECALL_WORD_MS,
  RECALL_WORD_POOL,
  generateRecallSet,
  scoreRecall,
} from './recall';
export type { RecallSet, RecallScore } from './recall';

export { CALM_ITEMS, CALM_SCALE, scoreCalm } from './calm';
export type { CalmItem } from './calm';
