import {
  NBACK_N,
  NBACK_DEFAULT_TRIALS,
  NBACK_LETTERS,
  generateNbackSequence,
  scoreNback,
  normInv,
  type NbackSequence,
  type NbackResponse,
} from '../nback';

/** A perfect responder: respond iff the trial is a target. */
function perfectResponses(seq: NbackSequence): NbackResponse[] {
  return seq.isTarget.map((t) => ({ responded: t }));
}

/** Respond to nothing. */
function noResponses(seq: NbackSequence): NbackResponse[] {
  return seq.isTarget.map(() => ({ responded: false }));
}

/** Respond to everything. */
function allResponses(seq: NbackSequence): NbackResponse[] {
  return seq.isTarget.map(() => ({ responded: true }));
}

describe('generateNbackSequence', () => {
  it('emits the default trial count of letters and flags', () => {
    const seq = generateNbackSequence({ seed: 1 });
    expect(seq.letters).toHaveLength(NBACK_DEFAULT_TRIALS);
    expect(seq.isTarget).toHaveLength(NBACK_DEFAULT_TRIALS);
  });

  it('only uses letters from the pool', () => {
    const seq = generateNbackSequence({ seed: 5, trials: 200 });
    for (const letter of seq.letters) {
      expect(NBACK_LETTERS).toContain(letter);
    }
  });

  it('never flags the leading n trials as targets', () => {
    const seq = generateNbackSequence({ seed: 3, trials: 20 });
    for (let i = 0; i < NBACK_N; i += 1) {
      expect(seq.isTarget[i]).toBe(false);
    }
  });

  it('isTarget[i] is true exactly when letters[i] equals letters[i - n]', () => {
    const seq = generateNbackSequence({ seed: 9, trials: 50 });
    for (let i = NBACK_N; i < seq.letters.length; i += 1) {
      expect(seq.isTarget[i]).toBe(seq.letters[i] === seq.letters[i - NBACK_N]);
    }
  });

  it('is reproducible under a fixed seed', () => {
    const a = generateNbackSequence({ seed: 2024, trials: 20 });
    const b = generateNbackSequence({ seed: 2024, trials: 20 });
    expect(a).toEqual(b);
  });

  it('lands near the requested target rate over many eligible trials', () => {
    const trials = 2000;
    const seq = generateNbackSequence({ seed: 11, trials, targetRate: 0.3 });
    const eligible = trials - NBACK_N;
    const targets = seq.isTarget.filter(Boolean).length;
    const rate = targets / eligible;
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.35);
  });

  it('targetRate 0 yields no matches among eligible trials', () => {
    const seq = generateNbackSequence({ seed: 4, trials: 100, targetRate: 0 });
    expect(seq.isTarget.filter(Boolean).length).toBe(0);
  });

  it('returns an empty sequence for zero trials', () => {
    const seq = generateNbackSequence({ seed: 1, trials: 0 });
    expect(seq.letters).toEqual([]);
    expect(seq.isTarget).toEqual([]);
  });
});

describe('scoreNback', () => {
  it('perfect responder: 100% accuracy and a large positive d-prime', () => {
    const seq = generateNbackSequence({ seed: 101, trials: 40, targetRate: 0.3 });
    const score = scoreNback(seq, perfectResponses(seq));
    expect(score.accuracy).toBe(100);
    expect(score.misses).toBe(0);
    expect(score.falseAlarms).toBe(0);
    expect(score.dPrime).toBeGreaterThan(2);
  });

  it('chance responder (random, uncorrelated with targets) gives d-prime near 0', () => {
    // Responder flips a coin independent of the stimulus: hit rate ~= FA rate,
    // so d-prime should sit near zero over a long run.
    const seq = generateNbackSequence({ seed: 202, trials: 2000, targetRate: 0.3 });
    let coin = 0.123;
    const responses: NbackResponse[] = seq.isTarget.map(() => {
      coin = (coin * 9301 + 49297) % 233280 / 233280;
      return { responded: coin < 0.5 };
    });
    const score = scoreNback(seq, responses);
    expect(score.dPrime).toBeGreaterThan(-0.3);
    expect(score.dPrime).toBeLessThan(0.3);
  });

  it('all-miss run (never responds) has zero hits/false-alarms and a near-zero d-prime', () => {
    const seq = generateNbackSequence({ seed: 303, trials: 40, targetRate: 0.3 });
    const score = scoreNback(seq, noResponses(seq));
    expect(score.hits).toBe(0);
    expect(score.falseAlarms).toBe(0);
    // With no responses the corrected hit and FA rates are both tiny, so
    // d-prime sits near zero (the log-linear correction's count asymmetry can
    // leave a small residual) — nowhere near a real performer's d-prime.
    expect(Math.abs(score.dPrime as number)).toBeLessThan(0.5);
  });

  it('respond-to-everything: all targets hit, all non-targets false-alarmed', () => {
    const seq = generateNbackSequence({ seed: 404, trials: 40, targetRate: 0.3 });
    const targets = seq.isTarget.slice(NBACK_N).filter(Boolean).length;
    const nonTargets = seq.isTarget.slice(NBACK_N).filter((t) => !t).length;
    const score = scoreNback(seq, allResponses(seq));
    expect(score.misses).toBe(0);
    expect(score.correctRejections).toBe(0);
    expect(score.hits).toBe(targets);
    expect(score.falseAlarms).toBe(nonTargets);
  });

  it('log-linear correction keeps d-prime finite at perfect performance', () => {
    const seq = generateNbackSequence({ seed: 505, trials: 40, targetRate: 0.3 });
    const score = scoreNback(seq, perfectResponses(seq));
    expect(Number.isFinite(score.dPrime as number)).toBe(true);
  });

  it('no eligible trials: null accuracy and d-prime', () => {
    const seq = generateNbackSequence({ seed: 1, trials: NBACK_N });
    const score = scoreNback(seq, perfectResponses(seq));
    expect(score.trials).toBe(0);
    expect(score.accuracy).toBeNull();
    expect(score.dPrime).toBeNull();
  });

  it('throws when responses length does not match the sequence', () => {
    const seq = generateNbackSequence({ seed: 1, trials: 10 });
    expect(() => scoreNback(seq, [{ responded: true }])).toThrow();
  });

  it('accuracy counts both hits and correct rejections', () => {
    // Hand-built 2-back sequence: indices 2 and 4 are targets.
    const seq: NbackSequence = {
      letters: ['A', 'B', 'A', 'C', 'C'],
      isTarget: [false, false, true, false, false],
    };
    // Note index 4: letters[4]='C' vs letters[2]='A' -> not a target; the hand
    // build intentionally sets isTarget to exercise scoring independent of gen.
    const responses: NbackResponse[] = [
      { responded: false },
      { responded: false },
      { responded: true }, // hit
      { responded: false }, // correct rejection
      { responded: true }, // false alarm
    ];
    const score = scoreNback(seq, responses);
    expect(score.hits).toBe(1);
    expect(score.correctRejections).toBe(1);
    expect(score.falseAlarms).toBe(1);
    expect(score.misses).toBe(0);
    // 2 correct out of 3 eligible = 66.67%
    expect(score.accuracy).toBeCloseTo((2 / 3) * 100, 5);
  });
});

describe('normInv', () => {
  it('maps 0.5 to 0', () => {
    expect(normInv(0.5)).toBeCloseTo(0, 6);
  });

  it('matches known standard-normal quantiles', () => {
    // z(0.975) ~= 1.959964, z(0.841345) ~= 1.0
    expect(normInv(0.975)).toBeCloseTo(1.959964, 4);
    expect(normInv(0.8413447)).toBeCloseTo(1.0, 4);
  });

  it('is antisymmetric about 0.5', () => {
    expect(normInv(0.9)).toBeCloseTo(-normInv(0.1), 5);
  });

  it('throws outside the open interval (0, 1)', () => {
    expect(() => normInv(0)).toThrow();
    expect(() => normInv(1)).toThrow();
  });
});
