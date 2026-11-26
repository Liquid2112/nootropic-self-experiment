import { REFERRAL_REWARDS_LIVE, creatorThanks, rewardCopy, type RewardCopyKey } from '@/config/referralRewards';
import { keyholderInviteMessage, referralMessage } from '@/features/referral';

const KEYS: RewardCopyKey[] = [
  'homeTile',
  'inviteKicker',
  'inviteBody',
  'codePrompt',
  'codeSavedFriend',
  'shareCardSuffix',
  'messageSuffix',
  'keyholderModeSuffix',
];

describe('referral reward copy', () => {
  it('stays off until the rewards server grants months for real', () => {
    expect(REFERRAL_REWARDS_LIVE).toBe(false);
  });

  it('promises no reward anywhere while rewards are off', () => {
    const all = [...KEYS.map((k) => rewardCopy(k, false)), creatorThanks('Sam', false)].join(' ');
    expect(all).not.toMatch(/free|month|on us/i);
    expect(referralMessage('ABC123')).not.toMatch(/free month/i);
    expect(
      keyholderInviteMessage({ v: 1, run: 'r1', key: 'K', cup: 'A', supplement: 'Creatine', reveal: '2026-12-24', from: 'Sam', ref: 'ABC123' }),
    ).not.toMatch(/free month/i);
  });

  it('keeps the live copy ready for when rewards ship', () => {
    expect(rewardCopy('homeTile', true)).toMatch(/month free/);
    expect(creatorThanks('Sam', true)).toMatch(/on us/);
  });
});
