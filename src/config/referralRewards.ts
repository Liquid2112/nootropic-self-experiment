/**
 * Referral rewards switch, and every line of copy that mentions the reward.
 *
 * OFF until a rewards server really grants the free month (see
 * src/features/referral/rewards.ts: today the backend is a stub that grants
 * nothing). Promising a reward the app doesn't deliver is a deceptive practice
 * under the FTC Act and state consumer-protection laws, and it breaks App Store
 * guideline 2.3.1 (accurate metadata), so while this is false no screen, share
 * message or share card mentions a free month.
 *
 * Before turning it on, the server must also handle people who already pay:
 * a RevenueCat promotional entitlement doesn't pause Apple billing, so a
 * paying subscriber needs an App Store offer code or promotional offer
 * instead, or the copy must say the free month is for new subscribers only.
 */
export const REFERRAL_REWARDS_LIVE = false;

const COPY = {
  /** Home tile subtitle. */
  homeTile: { live: 'You both get a month free', off: 'Blind-test with a friend' },
  /** Invite screen kicker. */
  inviteKicker: { live: 'GIVE A MONTH, GET A MONTH', off: 'SHARE PLACEBO' },
  /** Invite screen body. */
  inviteBody: {
    live: 'A friend who starts with your code gets a free month, and so do you. Your code is also on every verdict card you share.',
    off: 'Send your code to a friend who keeps buying supplements on vibes. Your code is also on every verdict card you share.',
  },
  /** "Who sent you?" prompt. */
  codePrompt: {
    live: 'Got a code from a creator or a friend? Enter it for a free month.',
    off: 'Got a code from a creator or a friend? Enter it so they know you came.',
  },
  codeSavedFriend: {
    live: 'Code saved. You and your friend each get a free month when you start an experiment.',
    off: 'Code saved. Your friend will know you came.',
  },
  /** Verdict share card call to action, after "Code XXXX". */
  shareCardSuffix: { live: ' = a free month', off: '' },
  /** Appended to share messages; starts with a space. */
  messageSuffix: { live: ' We both get a free month of Placebo.', off: '' },
  /** Keyholder mode description on Experiment setup; starts with a space. */
  keyholderModeSuffix: { live: ' You both get a free month.', off: '' },
} as const;

export type RewardCopyKey = keyof typeof COPY;

export function rewardCopy(key: RewardCopyKey, live: boolean = REFERRAL_REWARDS_LIVE): string {
  return live ? COPY[key].live : COPY[key].off;
}

/** Creator-code thank-you line. */
export function creatorThanks(name: string, live: boolean = REFERRAL_REWARDS_LIVE): string {
  return live
    ? `Thanks for coming from ${name}. Your first month is on us when you start an experiment.`
    : `Thanks for coming from ${name}.`;
}
