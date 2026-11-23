import { sealArmMapping, unsealArmMapping } from '../sealedKey';

describe('sealed arm mapping', () => {
  const mapping = { supplementLabel: 'B', placeboLabel: 'A' };
  const passphrase = 'friend-secret-123';

  it('round-trips exactly with the right passphrase', () => {
    const sealed = sealArmMapping(mapping, passphrase);
    expect(unsealArmMapping(sealed, passphrase)).toEqual(mapping);
  });

  it('does not expose the mapping in the sealed value', () => {
    const sealed = sealArmMapping(mapping, passphrase);
    // The plaintext keys/values must not appear in the sealed string.
    expect(sealed).not.toContain('supplementLabel');
    expect(sealed).not.toContain('placeboLabel');
    // The sealed form is the versioned "v1:<checksum>:<hex>" shape.
    expect(sealed).toMatch(/^v1:[0-9a-f]{8}:[0-9a-f]*$/);
  });

  it('is not recoverable with the wrong passphrase', () => {
    const sealed = sealArmMapping(mapping, passphrase);
    // Wrong passphrase either fails the checksum or yields different data; it
    // must never return the original mapping.
    let recovered: unknown = null;
    try {
      recovered = unsealArmMapping(sealed, 'wrong-passphrase');
    } catch {
      recovered = null; // checksum mismatch is the expected common case
    }
    expect(recovered).not.toEqual(mapping);
  });

  it('rejects a malformed sealed value', () => {
    expect(() => unsealArmMapping('not-a-sealed-value', passphrase)).toThrow();
    expect(() => unsealArmMapping('v2:deadbeef:00', passphrase)).toThrow();
  });

  it('handles an envelope mapping payload', () => {
    const payload = {
      supplementLabel: 'A',
      placeboLabel: 'B',
      envelopeByLabel: { A: 2, B: 1 },
    };
    const sealed = sealArmMapping(payload, 'pw');
    expect(unsealArmMapping(sealed, 'pw')).toEqual(payload);
  });
});
