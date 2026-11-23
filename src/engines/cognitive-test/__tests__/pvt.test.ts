import {
  PVT_DEFAULT_TRIALS,
  PVT_MIN_ISI_MS,
  PVT_MAX_ISI_MS,
  PVT_LAPSE_THRESHOLD_MS,
  generatePvtSchedule,
  scorePvt,
} from '../pvt';

describe('generatePvtSchedule', () => {
  it('emits the default trial count', () => {
    const schedule = generatePvtSchedule({ seed: 1 });
    expect(schedule).toHaveLength(PVT_DEFAULT_TRIALS);
  });

  it('keeps every ISI within [1000, 4000] ms', () => {
    const schedule = generatePvtSchedule({ seed: 123, trials: 500 });
    for (const isi of schedule) {
      expect(isi).toBeGreaterThanOrEqual(PVT_MIN_ISI_MS);
      expect(isi).toBeLessThanOrEqual(PVT_MAX_ISI_MS);
    }
  });

  it('is reproducible under a fixed seed', () => {
    const a = generatePvtSchedule({ seed: 777, trials: 12 });
    const b = generatePvtSchedule({ seed: 777, trials: 12 });
    expect(a).toEqual(b);
  });

  it('differs across seeds', () => {
    const a = generatePvtSchedule({ seed: 1, trials: 12 });
    const b = generatePvtSchedule({ seed: 2, trials: 12 });
    expect(a).not.toEqual(b);
  });

  it('returns an empty schedule for zero trials', () => {
    expect(generatePvtSchedule({ seed: 1, trials: 0 })).toEqual([]);
  });

  it('throws on a negative trial count', () => {
    expect(() => generatePvtSchedule({ seed: 1, trials: -1 })).toThrow();
  });

  it('throws when minIsi exceeds maxIsi', () => {
    expect(() =>
      generatePvtSchedule({ seed: 1, minIsiMs: 4000, maxIsiMs: 1000 })
    ).toThrow();
  });
});

describe('scorePvt', () => {
  it('median ignores the order of reaction times', () => {
    const forward = scorePvt([200, 250, 300, 350, 400]);
    const shuffled = scorePvt([350, 200, 400, 250, 300]);
    expect(forward.medianMs).toBe(300);
    expect(shuffled.medianMs).toBe(300);
  });

  it('averages the two middle values for an even count', () => {
    expect(scorePvt([200, 300, 400, 500]).medianMs).toBe(350);
  });

  it('counts a lapse only when RT is strictly greater than 500 ms', () => {
    // 500 is not a lapse; 501 is.
    const score = scorePvt([300, PVT_LAPSE_THRESHOLD_MS, 501, 900]);
    expect(score.lapses).toBe(2);
  });

  it('all-lapse run reports every trial as a lapse', () => {
    const rts = [600, 700, 800];
    const score = scorePvt(rts);
    expect(score.lapses).toBe(3);
    expect(score.medianMs).toBe(700);
  });

  it('a single trial has itself as the median', () => {
    const score = scorePvt([275]);
    expect(score.medianMs).toBe(275);
    expect(score.lapses).toBe(0);
    expect(score.count).toBe(1);
  });

  it('empty run has null median, zero lapses, zero count', () => {
    const score = scorePvt([]);
    expect(score.medianMs).toBeNull();
    expect(score.lapses).toBe(0);
    expect(score.count).toBe(0);
  });

  it('does not mutate the input array', () => {
    const rts = [400, 100, 300];
    scorePvt(rts);
    expect(rts).toEqual([400, 100, 300]);
  });
});
