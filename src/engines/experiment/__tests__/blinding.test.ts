import { applyBlinding, type ArmMapping } from '../blinding';
import { unsealArmMapping } from '../sealedKey';
import type { TrueArm } from '../types';

const TRUE_ARMS: TrueArm[] = ['ON', 'OFF', 'ON', 'OFF', 'ON', 'OFF'];

describe('blinding: open (none)', () => {
  it('stores true ON/OFF arms and marks the run unblinded', () => {
    const r = applyBlinding(TRUE_ARMS, 'none', 'seed');
    expect(r.storedArms).toEqual(TRUE_ARMS);
    expect(r.blindingState).toBe('unblinded');
    expect(r.sealedKey).toBeNull();
  });
});

describe('blinding: friend-blinded (sealed)', () => {
  it('stores only neutral A/B labels and seals the mapping', () => {
    const r = applyBlinding(TRUE_ARMS, 'sealed', 'seed', { passphrase: 'pw' });
    expect(r.blindingState).toBe('blinded');
    expect(new Set(r.storedArms).size).toBeLessThanOrEqual(2);
    for (const arm of r.storedArms) {
      expect(['A', 'B']).toContain(arm);
    }
    expect(r.sealedKey).not.toBeNull();
  });

  it('never leaks which label is the supplement through stored arms', () => {
    const r = applyBlinding(TRUE_ARMS, 'sealed', 'seed', { passphrase: 'pw' });
    // The stored arms alone cannot tell you which letter is ON: the mapping is
    // only in the sealed key, which needs the passphrase to open.
    const mapping = unsealArmMapping<ArmMapping>(r.sealedKey as string, 'pw');
    // Round-trip consistency: decoding the stored arm with the sealed mapping
    // reproduces the original true arm.
    const decoded = r.storedArms.map((label) =>
      label === mapping.supplementLabel ? 'ON' : 'OFF',
    );
    expect(decoded).toEqual(TRUE_ARMS);
  });

  it('requires a passphrase for friend-blinding', () => {
    expect(() => applyBlinding(TRUE_ARMS, 'sealed', 'seed')).toThrow();
  });
});

describe('blinding: self-blinded (self_blind)', () => {
  it('stores neutral labels and seals a label->envelope mapping', () => {
    const r = applyBlinding(TRUE_ARMS, 'self_blind', 'seed');
    expect(r.blindingState).toBe('blinded');
    expect(r.sealedKey).not.toBeNull();
    for (const arm of r.storedArms) {
      expect(['A', 'B']).toContain(arm);
    }
    const mapping = unsealArmMapping<ArmMapping>(
      r.sealedKey as string,
      'self-blind:seed',
    );
    expect(mapping.envelopeByLabel).toBeDefined();
    const envelopes = Object.values(mapping.envelopeByLabel ?? {}).sort();
    expect(envelopes).toEqual([1, 2]);
  });
});

describe('blinding: supplement label is randomized by seed', () => {
  it('is not always A across seeds', () => {
    const labels = new Set<string>();
    for (let s = 0; s < 20; s += 1) {
      const r = applyBlinding(TRUE_ARMS, 'sealed', `seed-${s}`, { passphrase: 'pw' });
      const mapping = unsealArmMapping<ArmMapping>(r.sealedKey as string, 'pw');
      labels.add(mapping.supplementLabel);
    }
    expect(labels).toEqual(new Set(['A', 'B']));
  });
});
