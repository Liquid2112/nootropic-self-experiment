/**
 * Start a friend-blinded run with an app-made key, and build the keyholder
 * link that goes to the friend. The key seals the A/B mapping; the friend's
 * link carries the key and which cup gets the supplement. Nothing on this
 * phone shows either to the user.
 */
import type { SqlDriver } from '@/db/driver';
import { experiments, supplements } from '@/db/repositories';
import { type ArmMapping, addDays, unsealArmMapping } from '@/engines/experiment';
import { createExperiment, type CreateExperimentDeps, type OnboardingSelections } from '@/engines/onboarding';
import { newKeyholderKey, type KeyholderPayload, type Rand } from './model';
import { referralState, setPendingInvite } from './store';

export function startKeyholderRun(
  db: SqlDriver,
  selections: OnboardingSelections,
  deps: CreateExperimentDeps,
  fromName: string,
  rand: Rand = Math.random,
): KeyholderPayload {
  const key = newKeyholderKey(rand);
  const id = createExperiment(db, { ...selections, blindingMode: 'sealed', friendPassphrase: key }, deps);
  const experiment = experiments.getById(db, id)!;
  const mapping = unsealArmMapping<ArmMapping>(experiment.sealedKey!, key);
  const payload: KeyholderPayload = {
    v: 1,
    run: id,
    key,
    cup: mapping.supplementLabel,
    supplement: supplements.getById(db, experiment.supplementId)?.name ?? selections.supplement.name,
    reveal: addDays(experiment.startDate, experiment.lengthDays),
    from: fromName.trim().slice(0, 30),
    ref: referralState(db).myCode,
  };
  setPendingInvite(db, payload);
  return payload;
}

/** Is this run one of mine? (Then I must not open its keyholder link.) */
export function isOwnRun(db: SqlDriver, run: string): boolean {
  return experiments.getById(db, run) !== undefined;
}
