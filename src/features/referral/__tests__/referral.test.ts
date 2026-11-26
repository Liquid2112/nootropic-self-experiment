import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import { migrate } from '@/db/schema';
import { seedSupplements } from '@/db/seed';
import {
  canSendKey,
  decodeKeyholderPayload,
  decodeUnlockPayload,
  encodePayload,
  heldKeys,
  holdKey,
  isFriendCode,
  keyholderInviteMessage,
  keyholderLink,
  lookupCode,
  markKeySent,
  newKeyholderKey,
  newReferralCode,
  normalizeKey,
  parseLink,
  referralState,
  setCreatorCode,
  setReferredBy,
  type KeyholderPayload,
} from '..';

function seq(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length]!;
}

const payload: KeyholderPayload = {
  v: 1,
  run: 'exp_1',
  key: 'K7QX-M2PA-R9TD-3HWE',
  cup: 'B',
  supplement: 'Lion’s Mane',
  reveal: '2026-12-22',
  from: 'Shubh',
  ref: 'PABCDEF',
};

describe('codes', () => {
  it('makes readable referral codes and keys', () => {
    const code = newReferralCode(seq(0.1, 0.5, 0.9));
    expect(code).toMatch(/^P[A-Z2-9]{6}$/);
    expect(isFriendCode(code)).toBe(true);
    expect(newKeyholderKey(seq(0.3))).toMatch(/^([A-Z2-9]{4}-){3}[A-Z2-9]{4}$/);
    expect(normalizeKey('k7qx m2pa r9td 3hwe')).toBe('K7QX-M2PA-R9TD-3HWE');
  });

  it('resolves creator and friend codes, rejecting unknown ones and your own', () => {
    const creators = [{ code: 'STACKCITY', name: 'Stack City' }];
    expect(lookupCode(' stack-city ', creators)).toEqual({ kind: 'creator', code: 'STACKCITY', name: 'Stack City' });
    expect(lookupCode('pabcdef', creators)).toEqual({ kind: 'friend', code: 'PABCDEF' });
    expect(lookupCode('PABCDEF', creators, 'PABCDEF')).toBeNull();
    expect(lookupCode('nope', creators)).toBeNull();
  });
});

describe('links', () => {
  it('round-trips a keyholder payload, unicode included, and hides it from a glance', () => {
    const token = encodePayload(payload);
    expect(token).not.toMatch(/K7QX|Shubh|cup/);
    expect(decodeKeyholderPayload(token)).toEqual(payload);
    expect(decodeUnlockPayload(token)).toBeNull();
  });

  it('round-trips an unlock payload', () => {
    const token = encodePayload({ v: 1, run: 'exp_1', key: 'K' });
    expect(decodeUnlockPayload(token)).toEqual({ v: 1, run: 'exp_1', key: 'K' });
    expect(decodeKeyholderPayload(token)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(decodeKeyholderPayload('not-a-token')).toBeNull();
  });

  it('parses pasted links of every shape', () => {
    const link = keyholderLink(payload);
    expect(parseLink(link)?.kind).toBe('k');
    expect(parseLink(`placebo://u/abc_-1`)).toEqual({ kind: 'u', token: 'abc_-1' });
    expect(parseLink('https://placeboapp.com/r/PABCDEF')).toEqual({ kind: 'r', token: 'PABCDEF' });
    expect(parseLink('hello')).toBeNull();
  });

  it('never names the cup in the message the user sends', () => {
    const text = keyholderInviteMessage(payload);
    expect(text).toContain('Dec 22');
    expect(text).not.toMatch(/cup [AB]\b/i);
  });

  it('only lets the key go back on or after reveal day', () => {
    expect(canSendKey('2026-12-22', '2026-12-21')).toBe(false);
    expect(canSendKey('2026-12-22', '2026-12-22')).toBe(true);
  });
});

function db() {
  const d = createMemoryDriver();
  migrate(d);
  seedSupplements(d);
  return d;
}

describe('referral state', () => {
  it('creates my code once and keeps first attribution only', () => {
    const d = db();
    const mine = referralState(d).myCode;
    expect(referralState(d).myCode).toBe(mine);
    expect(setReferredBy(d, mine)).toBe(false);
    expect(setReferredBy(d, 'PABCDEF')).toBe(true);
    expect(setReferredBy(d, 'PGHJKMN')).toBe(false);
    expect(setCreatorCode(d, 'STACKCITY')).toBe(true);
    expect(setCreatorCode(d, 'OTHER')).toBe(false);
    expect(referralState(d)).toEqual({ myCode: mine, referredBy: 'PABCDEF', creatorCode: 'STACKCITY' });
  });

  it('holds keys for friends and marks them sent', () => {
    const d = db();
    holdKey(d, payload, new Date('2026-12-01T10:00:00Z'));
    holdKey(d, payload, new Date('2026-12-01T11:00:00Z'));
    expect(heldKeys(d)).toHaveLength(1);
    markKeySent(d, 'exp_1', new Date('2026-12-22T09:00:00Z'));
    expect(heldKeys(d)[0]?.sentAt).toBe('2026-12-22T09:00:00.000Z');
  });
});

