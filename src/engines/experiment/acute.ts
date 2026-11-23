import { createRng, shuffle, type Rng } from './rng';
import type { RunLength, TrueArm } from './types';

/**
 * Acute design: a balanced, randomized sequence of ON/OFF days with no more
 * than `MAX_RUN` of the same arm in a row.
 *
 * "Balanced" means the ON and OFF counts differ by at most one: 14/14 for a
 * 28-day run, 10/11 (or 11/10) for a 21-day run. The sequence is reproducible
 * from the seed and the no-long-run constraint protects against accidental
 * confounds (e.g. a week of ON lining up with a good-sleep streak).
 */

/** Maximum number of identical arms allowed consecutively. */
export const MAX_RUN = 3;

/**
 * Balanced ON/OFF counts for a run length. The larger share goes to ON when the
 * length is odd, so the counts are deterministic rather than seed-dependent.
 */
export function balancedCounts(lengthDays: number): { on: number; off: number } {
  const on = Math.ceil(lengthDays / 2);
  const off = lengthDays - on;
  return { on, off };
}

/** True if `seq` ever has more than MAX_RUN identical arms in a row. */
export function hasTooLongRun(seq: readonly TrueArm[]): boolean {
  let run = 0;
  let prev: TrueArm | null = null;
  for (const arm of seq) {
    run = arm === prev ? run + 1 : 1;
    if (run > MAX_RUN) {
      return true;
    }
    prev = arm;
  }
  return false;
}

/**
 * Repair any run longer than MAX_RUN by swapping the offending day with a later
 * day of the opposite arm. Swapping preserves the exact ON/OFF totals (we only
 * exchange positions), so balance is never broken by the repair. Driven by the
 * RNG so the choice of swap partner is still reproducible.
 *
 * Returns the repaired sequence, or null if no valid swap exists (which cannot
 * happen for balanced counts at lengths 21/28, but the caller re-validates).
 */
function repairRuns(seq: TrueArm[], rng: Rng): TrueArm[] | null {
  const out = seq.slice();
  // Bounded number of passes; each pass fixes the first violation it finds.
  for (let pass = 0; pass < out.length * 2; pass += 1) {
    let run = 0;
    let prev: TrueArm | null = null;
    let violationIndex = -1;
    for (let i = 0; i < out.length; i += 1) {
      const arm = out[i] as TrueArm;
      run = arm === prev ? run + 1 : 1;
      if (run > MAX_RUN) {
        violationIndex = i;
        break;
      }
      prev = arm;
    }
    if (violationIndex === -1) {
      return out;
    }
    const offending = out[violationIndex] as TrueArm;
    const opposite: TrueArm = offending === 'ON' ? 'OFF' : 'ON';
    // Candidate positions hold the opposite arm and are not themselves inside a
    // same-as-offending neighborhood that the swap would just move the problem
    // into; we pick among all opposite-arm positions and let re-validation
    // catch a bad pick on the next pass.
    const candidates: number[] = [];
    for (let j = 0; j < out.length; j += 1) {
      if (out[j] === opposite) {
        candidates.push(j);
      }
    }
    if (candidates.length === 0) {
      return null;
    }
    const pick = candidates[rng.nextInt(candidates.length)] as number;
    out[violationIndex] = opposite;
    out[pick] = offending;
  }
  return hasTooLongRun(out) ? null : out;
}

/**
 * Build the acute ON/OFF sequence for the given length and seed.
 *
 * Strategy: start from a balanced multiset, shuffle it, and if the shuffle
 * violates the no-long-run constraint, reshuffle (bounded retries) and then
 * repair by position swaps. Both reshuffle and repair are seeded, so the output
 * is deterministic for a given seed.
 */
export function buildAcuteSequence(lengthDays: RunLength, seed: string | number): TrueArm[] {
  const { on, off } = balancedCounts(lengthDays);
  const base: TrueArm[] = [
    ...Array<TrueArm>(on).fill('ON'),
    ...Array<TrueArm>(off).fill('OFF'),
  ];
  const rng = createRng(seed);

  const MAX_RESHUFFLES = 200;
  for (let attempt = 0; attempt < MAX_RESHUFFLES; attempt += 1) {
    const candidate = shuffle(base, rng);
    if (!hasTooLongRun(candidate)) {
      return candidate;
    }
    const repaired = repairRuns(candidate, rng);
    if (repaired && !hasTooLongRun(repaired)) {
      return repaired;
    }
  }
  // Unreachable for balanced 21/28 runs: a balanced sequence can always be
  // arranged without a run longer than 3. The throw makes a broken assumption
  // loud instead of silently returning an invalid schedule.
  throw new Error(
    `Could not build a valid acute sequence for length ${lengthDays}`,
  );
}
