import { beliefCheck, MIN_BELIEF_DAYS, type BeliefObservation } from '../belief';

/** 20 alternating ON/OFF days with a small deterministic wobble. */
function days(make: (on: 0 | 1, i: number) => { y: number; belief: number }): BeliefObservation[] {
  const out: BeliefObservation[] = [];
  for (let i = 0; i < 20; i += 1) {
    const on: 0 | 1 = i % 4 < 2 ? 1 : 0;
    const { y, belief } = make(on, i);
    out.push({ y, on, t: i, belief });
  }
  return out;
}

const wobble = (i: number) => ((i * 7) % 5) - 2;

describe('beliefCheck', () => {
  it('needs enough rated days and both arms', () => {
    expect(beliefCheck('pvtMedianMs', days(() => ({ y: 300, belief: 3 })).slice(0, MIN_BELIEF_DAYS - 1))).toBeNull();
    const allOn = days(() => ({ y: 300, belief: 3 })).map((d) => ({ ...d, on: 1 as const }));
    expect(beliefCheck('pvtMedianMs', allOn)).toBeNull();
  });

  it('says belief can’t be separated when the rating never changes', () => {
    const r = beliefCheck('pvtMedianMs', days((on, i) => ({ y: 300 - 20 * on + wobble(i), belief: 3 })));
    expect(r?.tier).toBe('flat_belief');
    expect(r?.sentence).toMatch(/same/);
  });

  it('holds up when belief varies but doesn’t move scores', () => {
    // Faster by 20 ms on ON days; belief varies independently of ON and scores.
    const r = beliefCheck('pvtMedianMs', days((on, i) => ({ y: 300 - 20 * on + wobble(i), belief: 1 + ((i * 3) % 5) })));
    expect(r?.tier).toBe('holds_up');
    expect(r?.onRaw).toBeLessThan(-15);
    expect(r?.sentence).toMatch(/holds up/);
  });

  it('flags an effect that moves into belief', () => {
    // Scores follow belief only; belief is higher on ON days, with some spread.
    const r = beliefCheck(
      'pvtMedianMs',
      days((on, i) => {
        const belief = 2 + 2 * on + ((i % 3) - 1);
        return { y: 320 - 10 * belief + wobble(i) * 0.2, belief };
      }),
    );
    expect(r?.tier).toBe('mostly_belief');
    expect(r?.beliefShare).toBeGreaterThan(0.6);
    expect(r?.sentence).toMatch(/expectation/);
  });

  it('reports nothing to explain when there is no ON difference', () => {
    const r = beliefCheck('pvtMedianMs', days((_on, i) => ({ y: 300 + wobble(i) * 5, belief: 1 + (i % 5) })));
    expect(r?.tier).toBe('no_effect_to_explain');
  });
});
