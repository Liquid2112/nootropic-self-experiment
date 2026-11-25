/**
 * Creator codes for "Who sent you?". A creator who posts about Placebo gives
 * their audience a code; every code entered is stored on the device and sent
 * to RevenueCat as a subscriber attribute, so payouts can be counted per
 * creator from the RevenueCat dashboard.
 *
 * PLACEHOLDERS: add each signed creator here before launch (code in caps, no
 * spaces). A typed code that isn't listed and isn't a friend's code is
 * rejected with a friendly message.
 */
import type { Creator } from '@/features/referral/model';

export const CREATORS: readonly Creator[] = [
  { code: 'STACKCITY', name: 'Stack City' },
  { code: 'PLACEBO', name: 'Placebo' },
];
