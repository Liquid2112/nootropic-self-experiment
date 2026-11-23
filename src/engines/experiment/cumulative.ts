import type { RunLength, TrueArm } from './types';

/**
 * Cumulative design: a block design rather than day-by-day alternation, because
 * cumulative supplements need several days on one arm for an effect to build.
 *
 * Layout is chosen from the run length:
 *   - 28 days -> ABAB with 7-day blocks  (ON OFF ON OFF, 7 days each)
 *   - 21 days -> AB with ... see below; 21 is not a clean multiple of 14, so the
 *     two 14-day blocks would overflow. Instead 21 uses three 7-day blocks ABA,
 *     keeping whole 7-day blocks and avoiding a ragged partial block.
 *
 * Returning the "true" ON/OFF arm per day; blinding relabels these downstream.
 */

export type BlockLayout = {
  blockSizeDays: number;
  /** Arm per block, in order. */
  blocks: TrueArm[];
};

/**
 * Pick the block layout for a run length.
 *
 * 28 = 4 x 7 -> ABAB (7-day blocks), the design the spec names first.
 * 21 = 3 x 7 -> ABA  (7-day blocks). 21 is not divisible by 14, so the 14-day
 * A-B layout the spec mentions cannot tile 21 evenly; three 7-day blocks is the
 * nearest clean fit and still gives two ON periods bracketing an OFF period.
 * This divisibility edge case is tested in cumulative.test.ts.
 */
export function blockLayoutFor(lengthDays: RunLength): BlockLayout {
  if (lengthDays === 28) {
    return { blockSizeDays: 7, blocks: ['ON', 'OFF', 'ON', 'OFF'] };
  }
  // lengthDays === 21
  return { blockSizeDays: 7, blocks: ['ON', 'OFF', 'ON'] };
}

/**
 * Expand a block layout into one arm per day. The cumulative design is fixed by
 * length (no randomization), so no seed is needed.
 */
export function buildCumulativeSequence(lengthDays: RunLength): TrueArm[] {
  const layout = blockLayoutFor(lengthDays);
  const seq: TrueArm[] = [];
  for (const block of layout.blocks) {
    for (let i = 0; i < layout.blockSizeDays; i += 1) {
      seq.push(block);
    }
  }
  // Guard: the blocks must exactly cover the run length.
  if (seq.length !== lengthDays) {
    throw new Error(
      `Block layout covers ${seq.length} days but run is ${lengthDays}`,
    );
  }
  return seq;
}
