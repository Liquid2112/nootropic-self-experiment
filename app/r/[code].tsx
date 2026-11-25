import { useEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { CREATORS } from '@/config/creators';
import { getDatabase } from '@/db';
import { lookupCode, referralState, setCreatorCode, setReferredBy } from '@/features/referral';
import { syncAttribution } from '@/features/referral/rewards';

/**
 * A referral or creator link (placebo.app/r/CODE), e.g. from a TikTok bio or a
 * shared verdict card. Saves the code (first one wins) and carries on into the
 * app as usual.
 */
export default function ReferralLink() {
  const params = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    if (typeof params.code !== 'string') return;
    const db = getDatabase();
    const me = referralState(db);
    const match = lookupCode(params.code, CREATORS, me.myCode);
    if (!match) return;
    const saved = match.kind === 'creator' ? setCreatorCode(db, match.code) : setReferredBy(db, match.code);
    if (saved) {
      const after = referralState(db);
      void syncAttribution({ referralCode: after.myCode, referredBy: after.referredBy, creatorCode: after.creatorCode });
    }
  }, [params.code]);
  return <Redirect href="/" />;
}
