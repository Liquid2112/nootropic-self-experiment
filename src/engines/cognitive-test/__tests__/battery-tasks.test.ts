import {
  CALM_ITEMS,
  generateRecallSet,
  generateStroopTrials,
  generateSymbolSet,
  RECALL_STUDY_WORDS,
  scoreCalm,
  scoreRecall,
  scoreStroop,
  scoreSymbol,
  STROOP_DEFAULT_TRIALS,
  SYMBOL_COUNT,
  type StroopResponse,
} from '..';

describe('Stroop', () => {
  it('is reproducible from a seed and half congruent', () => {
    const a = generateStroopTrials({ seed: 7 });
    expect(generateStroopTrials({ seed: 7 })).toEqual(a);
    expect(a).toHaveLength(STROOP_DEFAULT_TRIALS);
    expect(a.filter((t) => t.congruent)).toHaveLength(STROOP_DEFAULT_TRIALS / 2);
  });

  it('marks congruence correctly and never repeats an ink back to back', () => {
    const trials = generateStroopTrials({ seed: 99, trials: 40 });
    for (const t of trials) expect(t.congruent).toBe(t.word === t.ink);
    for (let i = 1; i < trials.length; i += 1) expect(trials[i]!.ink).not.toBe(trials[i - 1]!.ink);
  });

  it('scores interference as incongruent minus congruent median RT on correct trials', () => {
    const trials = generateStroopTrials({ seed: 3 });
    const responses: StroopResponse[] = trials.map((t) => ({
      choice: t.ink,
      rtMs: t.congruent ? 600 : 700,
    }));
    const score = scoreStroop(trials, responses);
    expect(score.interferenceMs).toBe(100);
    expect(score.accuracy).toBe(1);
  });

  it('ignores errors and anticipations, and needs enough correct trials', () => {
    const trials = generateStroopTrials({ seed: 5 });
    const wrong = trials.map((t) => ({ choice: t.word === 'red' ? 'blue' : 'red', rtMs: 500 }) as StroopResponse);
    expect(scoreStroop(trials, wrong).interferenceMs).toBeNull();
    const tooFast = trials.map((t) => ({ choice: t.ink, rtMs: 120 }));
    expect(scoreStroop(trials, tooFast).interferenceMs).toBeNull();
    expect(scoreStroop(trials, []).accuracy).toBeNull();
  });
});

describe('Symbol coding', () => {
  it('uses each digit once in the key and never repeats a symbol twice in a row', () => {
    const set = generateSymbolSet({ seed: 11 });
    expect([...set.key].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const s of set.stream) expect(s).toBeGreaterThanOrEqual(0);
    for (const s of set.stream) expect(s).toBeLessThan(SYMBOL_COUNT);
    for (let i = 1; i < set.stream.length; i += 1) expect(set.stream[i]).not.toBe(set.stream[i - 1]);
  });

  it('reshuffles the key from day to day', () => {
    expect(generateSymbolSet({ seed: 1 }).key).not.toEqual(generateSymbolSet({ seed: 2 }).key);
  });

  it('scores correct answers per minute', () => {
    const set = generateSymbolSet({ seed: 4 });
    const answers = set.stream.slice(0, 30).map((s, i) => (i < 27 ? set.key[s]! : 0));
    const score = scoreSymbol(set, answers, 45_000);
    expect(score.correctPerMin).toBe(36);
    expect(score.accuracy).toBeCloseTo(0.9);
    expect(scoreSymbol(set, []).correctPerMin).toBeNull();
  });
});

describe('Word memory', () => {
  it('draws a fresh list of distinct words and a balanced grid', () => {
    const set = generateRecallSet({ seed: 21 });
    expect(set.study).toHaveLength(RECALL_STUDY_WORDS);
    expect(set.probes).toHaveLength(RECALL_STUDY_WORDS * 2);
    expect(new Set(set.probes).size).toBe(set.probes.length);
    for (const w of set.study) expect(set.probes).toContain(w);
    expect(generateRecallSet({ seed: 22 }).study).not.toEqual(set.study);
  });

  it('scores hits minus false alarms, so picking everything earns nothing', () => {
    const set = generateRecallSet({ seed: 8 });
    const lures = set.probes.filter((w) => !set.study.includes(w));
    expect(scoreRecall(set, set.study).score).toBe(10);
    expect(scoreRecall(set, [...set.study.slice(0, 7), lures[0]!]).score).toBe(6);
    expect(scoreRecall(set, set.probes).score).toBe(0);
    expect(scoreRecall(set, ['not-a-probe']).score).toBe(0);
  });
});

describe('Calm check', () => {
  it('reverse-scores the tension items onto a 0..100 calm score', () => {
    // calm, tense, at ease, worried
    expect(scoreCalm([3, 0, 3, 0])).toBe(100);
    expect(scoreCalm([0, 3, 0, 3])).toBe(0);
    expect(scoreCalm([2, 1, 2, 1])).toBe(67);
  });

  it('needs every item answered', () => {
    expect(scoreCalm([3, null, 3, 0])).toBeNull();
    expect(scoreCalm([3, 0, 3])).toBeNull();
    expect(scoreCalm([3, 0, 3, 9])).toBeNull();
    expect(CALM_ITEMS.filter((i) => i.reverse)).toHaveLength(2);
  });
});
