/**
 * Experiment-design engine: turns a chosen design, blinding mode, and run length
 * into the ordered `schedule_day` rows a run is driven by, and manages the
 * sealed arm mapping that keeps a blinded run blind.
 *
 * Pure and UI-free: everything here is a function of its inputs, so it unit-tests
 * without a database or a React Native runtime (see CONTRIBUTING.md).
 */

export type {
  DesignType,
  RunLength,
  TrueArm,
  GenerateScheduleInput,
  GeneratedDay,
  GeneratedSchedule,
} from './types';

export { MAX_RUN, balancedCounts, hasTooLongRun, buildAcuteSequence } from './acute';
export { blockLayoutFor, buildCumulativeSequence, type BlockLayout } from './cumulative';
export {
  applyBlinding,
  type ArmMapping,
  type BlindingResult,
  type SealOptions,
} from './blinding';
export { sealArmMapping, unsealArmMapping } from './sealedKey';
export { createRng, shuffle, normalizeSeed, type Rng } from './rng';
export {
  BASELINE_DAYS,
  MIDPOINT_START_DAY,
  MIDPOINT_END_DAY,
  addDays,
  generateSchedule,
  toScheduleDayRows,
  isMidpointDay,
} from './schedule';
