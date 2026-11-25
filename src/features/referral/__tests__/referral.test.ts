import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import { migrate } from '@/db/schema';
import { seedSupplements } from '@/db/seed';
import { experiments } from '@/db/repositories';
import { computeExperimentVerdict } from '@/results/verdict';
import {
  canSendKey,
  cheerMessage,
  clearPendingInvite,
  decodeProgressPayload,
  dueProgressMilestone,
  keyholderRun,
  markInviteSent,
  markProgressShared,
  progressLink,
  progressMessage,
  updateHeldProgress,
  decodeKeyholderPayload,
  decodeUnlockPayload,
  encodePayload,
  heldKeys,
  holdKey,
  isFriendCode,
  isOwnRun,
  keyholderInviteMessage,
  keyholderLink,
  lookupCode,
  markKeySent,
  newKeyholderKey,
  newReferralCode,
  normalizeKey,
  parseLink,
  pendingInvite,
  referralState,
  setCreatorCode,
  setReferredBy,
  startKeyholderRun,
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
    expect(parseLink('https://placebo.app/r/PABCDEF')).toEqual({ kind: 'r', token: 'PABCDEF' });
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

describe('startKeyholderRun', () => {
  it('seals the run with a fresh key whose link unblinds the verdict', () => {
    const d = db();
    const p = startKeyholderRun(
      d,
      {
        goal: 'focus',
        supplement: { kind: 'other', name: 'Caffeine', type: 'acute' },
        lengthDays: 21,
        blindingMode: 'sealed',
        testWindow: 'morning',
        startDate: '2026-12-04',
      },
      { experimentId: 'exp_k', seed: 'seed-1' },
      'Shubh',
    );
    expect(p.reveal).toBe('2026-12-25');
    expect(p.supplement).toBe('Caffeine');
    expect(isOwnRun(d, p.run)).toBe(true);
    expect(pendingInvite(d)).toEqual(p);
    clearPendingInvite(d);
    expect(pendingInvite(d)).toBeNull();

    // The key in the link is the one the run was sealed with.
    const experiment = experiments.getById(d, 'exp_k')!;
    const vm = computeExperimentVerdict(d, {
      experiment,
      schedule: [],
      sessions: [],
      unsealPassphrase: p.key,
    });
    expect(vm.revealedMapping?.supplementLabel).toBe(p.cup);
  });
});

describe('keyholder progress updates', () => {
  const progress = { v: 1 as const, t: 'p' as const, run: 'exp_1', day: 14, of: 28, from: 'Shubh', reveal: '2026-12-22' };

  it('round-trips a progress payload and keeps it apart from keys', () => {
    const token = encodePayload(progress);
    expect(decodeProgressPayload(token)).toEqual(progress);
    expect(decodeUnlockPayload(token)).toBeNull();
    expect(decodeKeyholderPayload(token)).toBeNull();
    expect(decodeProgressPayload(encodePayload(payload))).toBeNull();
    expect(decodeProgressPayload(encodePayload({ ...progress, day: 30 }))).toBeNull();
    expect(parseLink(progressLink(progress))).toEqual({ kind: 'p', token });
  });

  it('asks for one update per week, rolling a skipped week forward', () => {
    expect(dueProgressMilestone(6, 28, 0)).toBeNull();
    expect(dueProgressMilestone(7, 28, 0)).toBe(7);
    expect(dueProgressMilestone(9, 28, 7)).toBeNull();
    expect(dueProgressMilestone(15, 28, 0)).toBe(14);
    expect(dueProgressMilestone(21, 21, 14)).toBeNull();
    expect(dueProgressMilestone(22, 28, 14)).toBe(21);
  });

  it('writes messages with the day count and never a cup or key', () => {
    const msg = progressMessage(progress);
    expect(msg).toContain('Day 14 of 28');
    expect(msg).toContain('Halfway');
    expect(msg).not.toMatch(/cup [AB]|K7QX/);
    expect(cheerMessage(progress)).toContain('14 to go');
    expect(progressMessage({ ...progress, day: 21 })).toContain('One week left');
  });

  it('records progress on a held key, ignoring older updates and unknown runs', () => {
    const db = createMemoryDriver();
    migrate(db);
    holdKey(db, payload);
    expect(updateHeldProgress(db, 'nope', 7, 28)).toBeNull();
    expect(updateHeldProgress(db, 'exp_1', 14, 28)?.progress).toMatchObject({ day: 14, of: 28 });
    expect(updateHeldProgress(db, 'exp_1', 7, 28)?.progress?.day).toBe(14);
    expect(heldKeys(db)[0]!.progress?.day).toBe(14);
  });

  it('remembers a sent invite once and tracks the last shared milestone', () => {
    const db = createMemoryDriver();
    migrate(db);
    expect(keyholderRun(db, 'exp_1')).toBeNull();
    expect(markInviteSent(db, 'exp_1', 'keyholder_link', 'Shubh')).toBe(true);
    expect(markInviteSent(db, 'exp_1', 'in_person', 'Shubh')).toBe(false);
    markProgressShared(db, 'exp_1', 8);
    markProgressShared(db, 'exp_1', 3);
    expect(keyholderRun(db, 'exp_1')).toMatchObject({ sentVia: 'keyholder_link', from: 'Shubh', lastSharedDay: 8 });
  });
});
