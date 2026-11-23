import { experiments, scheduleDays, supplements } from '@/db/repositories';
import type { Experiment, Supplement } from '@/db';
import type { SqlDriver } from '@/db/driver';
import { generateSchedule, toScheduleDayRows } from '@/engines/experiment';
import { designForSupplementType, primaryMetricForGoal } from './derive';
import type { OnboardingSelections } from './types';

/**
 * Validate and persist a configured experiment.
 *
 * This is the single wiring point between the onboarding screens, the
 * experiment-design engine, and the data layer: it validates the selections,
 * derives the design/metric, calls `generateSchedule`, and writes the
 * `experiment` row plus its `schedule_day` rows via the DAOs. Pure of React
 * Native so it is tested directly against an in-memory driver.
 *
 * The sealed arm mapping produced by the engine for blinded runs is stored in
 * `experiment.sealed_key`; the raw arm assignment is never returned, so a
 * caller cannot leak it to the UI during a blinded run.
 */

export type CreateExperimentDeps = {
  /** Unique id for the new experiment row. */
  experimentId: string;
  /** Seed for the schedule RNG (reproducible randomization). */
  seed: string;
};

export type ValidationError = { field: string; message: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Check selections before persisting. Returns the problems found (empty array
 * when valid) so the UI can enable/disable its confirm action and show why.
 */
export function validateSelections(selections: OnboardingSelections): ValidationError[] {
  const errors: ValidationError[] = [];

  if (selections.supplement.name.trim().length === 0) {
    errors.push({ field: 'supplement', message: 'Choose or name a supplement.' });
  }
  if (selections.lengthDays !== 21 && selections.lengthDays !== 28) {
    errors.push({ field: 'lengthDays', message: 'Length must be 21 or 28 days.' });
  }
  if (!ISO_DATE.test(selections.startDate)) {
    errors.push({ field: 'startDate', message: 'Start date must be a valid date.' });
  }
  if (selections.blindingMode === 'sealed') {
    const pass = selections.friendPassphrase?.trim() ?? '';
    if (pass.length === 0) {
      errors.push({
        field: 'friendPassphrase',
        message: 'A friend must set a passphrase to seal the assignment.',
      });
    }
  }

  return errors;
}

/**
 * Create and store the experiment and its schedule. Throws if the selections do
 * not validate (callers should gate on `validateSelections` first). Returns the
 * persisted experiment id.
 *
 * NOTE: a curated supplement is stored by its DB id. An 'Other' supplement has
 * no catalogue row, so one is inserted on the fly: a `supplement` row with a
 * synthetic `other:<name>` id, no evidence, and `excluded: true` so it never
 * shows in the curated picker list. This keeps the `experiment.supplement_id`
 * foreign key satisfied (foreign keys are enforced; see schema.ts) without a
 * schema change, and gives the custom entry a real, self-describing id.
 */
export function createExperiment(
  db: SqlDriver,
  selections: OnboardingSelections,
  deps: CreateExperimentDeps,
): string {
  const errors = validateSelections(selections);
  if (errors.length > 0) {
    throw new Error(`Invalid experiment selections: ${errors.map((e) => e.message).join('; ')}`);
  }

  const design = designForSupplementType(selections.supplement.type);
  const primaryMetric = primaryMetricForGoal(selections.goal);

  const schedule = generateSchedule(
    {
      design,
      blindingMode: selections.blindingMode,
      lengthDays: selections.lengthDays,
      startDate: selections.startDate,
      seed: deps.seed,
    },
    { passphrase: selections.friendPassphrase },
  );

  const supplementId = resolveSupplementId(db, selections);

  const experiment: Experiment = {
    id: deps.experimentId,
    supplementId,
    goal: selections.goal,
    primaryMetric,
    design,
    blindingMode: selections.blindingMode,
    lengthDays: selections.lengthDays,
    startDate: selections.startDate,
    status: 'active',
    sealedKey: schedule.sealedKey,
  };

  experiments.insert(db, experiment);
  for (const row of toScheduleDayRows(experiment.id, schedule)) {
    scheduleDays.insert(db, row);
  }

  return experiment.id;
}

/**
 * Resolve the `supplement_id` to store. For a curated pick it is the catalogue
 * id. For an 'Other' entry it inserts (once) a hidden `supplement` row so the
 * foreign key holds, reusing an existing row if the same custom name was used
 * before.
 */
function resolveSupplementId(db: SqlDriver, selections: OnboardingSelections): string {
  if (selections.supplement.kind === 'curated') {
    return selections.supplement.supplementId;
  }
  const name = selections.supplement.name.trim();
  const id = `other:${name.toLowerCase()}`;
  if (supplements.getById(db, id) === undefined) {
    const custom: Supplement = {
      id,
      name,
      type: selections.supplement.type,
      evidenceSummary: 'Custom supplement added by you. No evidence summary is shown for this entry.',
      evidenceLinks: [],
      excluded: true,
    };
    supplements.insert(db, custom);
  }
  return id;
}
