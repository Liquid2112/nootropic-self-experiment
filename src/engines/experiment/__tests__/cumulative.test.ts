import { blockLayoutFor, buildCumulativeSequence } from '../cumulative';
import type { TrueArm } from '../types';

describe('cumulative: block layout', () => {
  it('28 days is ABAB with 7-day blocks', () => {
    const layout = blockLayoutFor(28);
    expect(layout.blockSizeDays).toBe(7);
    expect(layout.blocks).toEqual(['ON', 'OFF', 'ON', 'OFF']);
  });

  it('21 days uses whole 7-day blocks (ABA), not a ragged 14-day split', () => {
    // 21 is not divisible by 14, so the 14-day A-B layout cannot tile it; the
    // engine falls back to three clean 7-day blocks. Edge case under test.
    const layout = blockLayoutFor(21);
    expect(layout.blockSizeDays).toBe(7);
    expect(layout.blocks).toEqual(['ON', 'OFF', 'ON']);
  });
});

describe('cumulative: expanded day sequence', () => {
  it('28-day run expands to 7+7+7+7 of ON/OFF/ON/OFF', () => {
    const seq = buildCumulativeSequence(28);
    expect(seq).toHaveLength(28);
    const expected: TrueArm[] = [
      ...Array<TrueArm>(7).fill('ON'),
      ...Array<TrueArm>(7).fill('OFF'),
      ...Array<TrueArm>(7).fill('ON'),
      ...Array<TrueArm>(7).fill('OFF'),
    ];
    expect(seq).toEqual(expected);
  });

  it('21-day run expands to 7+7+7 of ON/OFF/ON', () => {
    const seq = buildCumulativeSequence(21);
    expect(seq).toHaveLength(21);
    const expected: TrueArm[] = [
      ...Array<TrueArm>(7).fill('ON'),
      ...Array<TrueArm>(7).fill('OFF'),
      ...Array<TrueArm>(7).fill('ON'),
    ];
    expect(seq).toEqual(expected);
  });

  it('is deterministic (no seed) — same length -> same sequence', () => {
    expect(buildCumulativeSequence(28)).toEqual(buildCumulativeSequence(28));
  });
});
