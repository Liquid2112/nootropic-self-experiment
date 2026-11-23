import type { BlindingMode, SupplementType } from '@/db';
import type { RunLength } from '@/engines/experiment';

/**
 * Onboarding-domain types: the choices the three onboarding screens collect and
 * the resolved shape handed to persistence. Kept pure (no DB, no RN) so the
 * derivations and validation are unit-tested directly.
 */

/** The four goals offered on the goal picker. */
export type Goal = 'focus' | 'memory' | 'calm' | 'sleep';

export const GOALS: readonly Goal[] = ['focus', 'memory', 'calm', 'sleep'];

/**
 * A supplement choice. A curated-list pick carries the DB id and its type; the
 * free-text 'Other' entry has no id (no evidence card, type chosen by the user
 * since the engine still needs a design).
 */
export type SupplementChoice =
  | { kind: 'curated'; supplementId: string; type: SupplementType; name: string }
  | { kind: 'other'; name: string; type: SupplementType };

/** The raw selections made across the onboarding screens. */
export type OnboardingSelections = {
  goal: Goal;
  supplement: SupplementChoice;
  lengthDays: RunLength;
  blindingMode: BlindingMode;
  /** Chosen daily test-time window (see TEST_WINDOWS). */
  testWindow: TestWindowId;
  /** ISO YYYY-MM-DD start date (day 0 of the run). */
  startDate: string;
  /** Friend's passphrase, required only for the 'sealed' (friend-blinded) mode. */
  friendPassphrase?: string;
};

/** Identifiers for the daily test-time windows the user can pick. */
export type TestWindowId = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening';

export type TestWindow = {
  id: TestWindowId;
  label: string;
  /** Inclusive local-time range, 24h, for display and later reminders. */
  startHour: number;
  endHour: number;
};
