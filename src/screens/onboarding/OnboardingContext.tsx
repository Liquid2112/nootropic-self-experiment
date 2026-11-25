import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BlindingMode } from '@/db';
import type { RunLength } from '@/engines/experiment';
import type { Goal, SupplementChoice, TestWindowId } from '@/engines/onboarding';

/**
 * In-memory onboarding state shared across the three screens.
 *
 * The flow is linear (welcome -> goal+supplement -> setup) and short-lived, so
 * the selections live in a React context rather than the database until the
 * final confirm persists them. Nothing here holds any arm assignment: the
 * sealed key is produced and stored only at persist time (see createExperiment),
 * so the UI never has the mapping to display during a blinded run.
 */

export type OnboardingState = {
  acknowledgedDisclaimer: boolean;
  goal: Goal | null;
  supplement: SupplementChoice | null;
  lengthDays: RunLength;
  blindingMode: BlindingMode;
  testWindow: TestWindowId;
  startDate: string;
  friendPassphrase: string;
  /** Friend-blinded runs: the user's first name, shown to their keyholder. */
  keyholderFromName: string;
};

export type OnboardingContextValue = {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  reset: () => void;
};

function todayIso(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().padStart(4, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function initialState(): OnboardingState {
  return {
    acknowledgedDisclaimer: false,
    goal: null,
    supplement: null,
    lengthDays: 28,
    blindingMode: 'none',
    testWindow: 'morning',
    startDate: todayIso(),
    friendPassphrase: '',
    keyholderFromName: '',
  };
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      update: (patch) => setState((prev) => ({ ...prev, ...patch })),
      reset: () => setState(initialState()),
    }),
    [state],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
