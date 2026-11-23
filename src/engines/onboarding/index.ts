/**
 * Onboarding domain: the pure derivations, validation, and persistence that
 * turn the three onboarding screens' selections into a stored experiment and
 * its schedule. UI-free, so it unit-tests without a React Native runtime.
 */

export type {
  Goal,
  SupplementChoice,
  OnboardingSelections,
  TestWindow,
  TestWindowId,
} from './types';
export { GOALS } from './types';
export {
  primaryMetricForGoal,
  goalLabel,
  designForSupplementType,
  TEST_WINDOWS,
  testWindowById,
} from './derive';
export {
  validateSelections,
  createExperiment,
  type ValidationError,
  type CreateExperimentDeps,
} from './createExperiment';
export { newExperimentId, newScheduleSeed } from './ids';
