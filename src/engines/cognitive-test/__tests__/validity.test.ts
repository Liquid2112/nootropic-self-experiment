import {
  MIN_PLAUSIBLE_RT_MS,
  filterPlausibleReactionTimes,
  validateSession,
} from '../validity';

describe('filterPlausibleReactionTimes', () => {
  it('drops reaction times below 100 ms before scoring', () => {
    const kept = filterPlausibleReactionTimes([50, 99, 100, 250, 10]);
    // 100 is the floor and is kept; 50, 99, 10 are dropped.
    expect(kept).toEqual([100, 250]);
  });

  it('keeps everything when all RTs are plausible', () => {
    const rts = [120, 300, 450];
    expect(filterPlausibleReactionTimes(rts)).toEqual(rts);
  });

  it('empty in, empty out', () => {
    expect(filterPlausibleReactionTimes([])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const rts = [50, 200];
    filterPlausibleReactionTimes(rts);
    expect(rts).toEqual([50, 200]);
  });

  it('the floor constant is 100 ms', () => {
    expect(MIN_PLAUSIBLE_RT_MS).toBe(100);
  });
});

describe('validateSession', () => {
  it('a fully completed, clean run is valid', () => {
    const result = validateSession({
      plannedTrials: 12,
      completedTrials: 12,
      discardedTrials: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('ok');
    expect(result.usable).toBe(12);
  });

  it('marks a run abandoned when too few trials were completed', () => {
    const result = validateSession({
      plannedTrials: 12,
      completedTrials: 5, // ~42% < 75%
      discardedTrials: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('abandoned');
  });

  it('a run right at the completion threshold is valid', () => {
    const result = validateSession({
      plannedTrials: 12,
      completedTrials: 9, // 75% exactly
      discardedTrials: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('ok');
  });

  it('marks a run invalid when too many trials were discarded', () => {
    const result = validateSession({
      plannedTrials: 12,
      completedTrials: 12,
      discardedTrials: 4, // 33% > 25%
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('too_many_discarded');
    expect(result.usable).toBe(8);
  });

  it('a discard rate right at the threshold stays valid', () => {
    const result = validateSession({
      plannedTrials: 12,
      completedTrials: 12,
      discardedTrials: 3, // 25% exactly, not "more than"
    });
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('ok');
  });

  it('abandonment is reported ahead of discards', () => {
    // Only 4/12 completed (abandoned) and 2 of those discarded (50% > 25%).
    const result = validateSession({
      plannedTrials: 12,
      completedTrials: 4,
      discardedTrials: 2,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('abandoned');
  });

  it('a zero-trial plan is abandoned, not silently valid', () => {
    const result = validateSession({
      plannedTrials: 0,
      completedTrials: 0,
      discardedTrials: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('abandoned');
  });

  it('honors custom thresholds', () => {
    // Loosen completion to 40% and discards to 60%: the earlier abandoned case
    // now passes.
    const result = validateSession({
      plannedTrials: 12,
      completedTrials: 5,
      discardedTrials: 2,
      minCompletionRate: 0.4,
      maxDiscardRate: 0.6,
    });
    expect(result.valid).toBe(true);
    expect(result.reason).toBe('ok');
  });

  it('throws on negative counts', () => {
    expect(() =>
      validateSession({ plannedTrials: -1, completedTrials: 0, discardedTrials: 0 })
    ).toThrow();
  });

  it('throws when completed exceeds planned', () => {
    expect(() =>
      validateSession({ plannedTrials: 5, completedTrials: 6, discardedTrials: 0 })
    ).toThrow();
  });

  it('throws when discarded exceeds completed', () => {
    expect(() =>
      validateSession({ plannedTrials: 10, completedTrials: 5, discardedTrials: 6 })
    ).toThrow();
  });
});
