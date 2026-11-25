/**
 * Referral rewards and attribution.
 *
 * Attribution works today: the referral code, the referrer's code and any
 * creator code are written to RevenueCat as subscriber attributes, so every
 * purchase can be traced to a friend or a creator.
 *
 * Granting the free month needs a server: RevenueCat promotional entitlements
 * are granted with the secret REST key, which must never ship in the app, and
 * the server should check the friend really started (one reward per new
 * install, no self-referrals). Until that exists the backend below is a stub
 * that records the claim as pending.
 */
import { Platform } from 'react-native';
import { loadPurchasesAdapter } from '@/features/paywall';

export type RewardClaim = {
  /** Code of the person who sent the invite. */
  referrerCode: string;
  /** Code of the person who accepted it (this phone). */
  refereeCode: string;
  /** 'keyholder' when they accepted a keyholder link, 'code' for a typed code. */
  via: 'keyholder' | 'code';
};

export type RewardStatus = 'granted' | 'pending' | 'unavailable';

export type RewardsBackend = { claim(claim: RewardClaim): Promise<RewardStatus> };

/** TODO(backend): POST to the rewards endpoint once it exists. */
export const stubRewardsBackend: RewardsBackend = {
  async claim() {
    return 'pending';
  },
};

type PurchasesLike = { setAttributes?: (attrs: Record<string, string | null>) => Promise<void> | void };

/** Send attribution to RevenueCat. A no-op until RevenueCat keys exist. */
export async function syncAttribution(attrs: {
  referralCode: string;
  referredBy: string | null;
  creatorCode: string | null;
}): Promise<boolean> {
  try {
    const adapter = await loadPurchasesAdapter(Platform.OS);
    if (!adapter.available) return false;
    const mod: { default?: unknown } = await import('react-native-purchases');
    const purchases = (mod.default ?? mod) as PurchasesLike;
    await purchases.setAttributes?.({
      referral_code: attrs.referralCode,
      referred_by: attrs.referredBy,
      creator_code: attrs.creatorCode,
      $campaign: attrs.creatorCode,
    });
    return true;
  } catch {
    return false;
  }
}
