/**
 * Referral state on this phone, kept in app_state:
 *  - my referral code, who referred me, and the creator code I entered;
 *  - keys I hold for friends (keyholder vault);
 *  - a pending keyholder invite I haven't sent yet (sender side).
 */
import type { SqlDriver } from '@/db/driver';
import { appState } from '@/db/repositories';
import {
  decodeKeyholderPayload,
  encodePayload,
  isFriendCode,
  newReferralCode,
  type KeyholderPayload,
  type Rand,
} from './model';

const REFERRAL_KEY = 'referral_v1';
const VAULT_KEY = 'keyholder_vault_v1';
const PENDING_KEY = 'keyholder_pending_v1';

export type ReferralState = {
  myCode: string;
  /** Friend code of whoever referred me (first one wins). */
  referredBy: string | null;
  /** Creator code from "Who sent you?" (first one wins). */
  creatorCode: string | null;
};

function readJson<T>(db: SqlDriver, key: string): T | null {
  const raw = appState.get(db, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** My referral state, creating my code on first use. */
export function referralState(db: SqlDriver, rand: Rand = Math.random): ReferralState {
  const stored = readJson<Partial<ReferralState>>(db, REFERRAL_KEY);
  if (stored && typeof stored.myCode === 'string' && isFriendCode(stored.myCode)) {
    return {
      myCode: stored.myCode,
      referredBy: typeof stored.referredBy === 'string' ? stored.referredBy : null,
      creatorCode: typeof stored.creatorCode === 'string' ? stored.creatorCode : null,
    };
  }
  const fresh: ReferralState = { myCode: newReferralCode(rand), referredBy: null, creatorCode: null };
  appState.set(db, REFERRAL_KEY, JSON.stringify(fresh));
  return fresh;
}

/**
 * Record who referred me. First attribution wins and you can't refer yourself.
 * Returns true when it was recorded.
 */
export function setReferredBy(db: SqlDriver, code: string): boolean {
  const state = referralState(db);
  if (state.referredBy || code === state.myCode || !isFriendCode(code)) return false;
  appState.set(db, REFERRAL_KEY, JSON.stringify({ ...state, referredBy: code }));
  return true;
}

/** Record the creator code. First one wins, so a later link can't steal credit. */
export function setCreatorCode(db: SqlDriver, code: string): boolean {
  const state = referralState(db);
  if (state.creatorCode) return false;
  appState.set(db, REFERRAL_KEY, JSON.stringify({ ...state, creatorCode: code }));
  return true;
}

// --- keyholder vault (the friend's phone) ------------------------------------

export type HeldKey = KeyholderPayload & { savedAt: string; sentAt: string | null };

export function heldKeys(db: SqlDriver): HeldKey[] {
  const list = readJson<HeldKey[]>(db, VAULT_KEY);
  return Array.isArray(list) ? list.filter((k) => decodeKeyholderPayload(encodePayload(stripMeta(k))) !== null) : [];
}

function stripMeta(k: HeldKey): KeyholderPayload {
  return { v: 1, run: k.run, key: k.key, cup: k.cup, supplement: k.supplement, reveal: k.reveal, from: k.from, ref: k.ref };
}

/** Save a key I'm holding. Saving the same run twice keeps one entry. */
export function holdKey(db: SqlDriver, payload: KeyholderPayload, now: Date = new Date()): HeldKey {
  const others = heldKeys(db).filter((k) => k.run !== payload.run);
  const entry: HeldKey = { ...payload, savedAt: now.toISOString(), sentAt: null };
  appState.set(db, VAULT_KEY, JSON.stringify([...others, entry]));
  return entry;
}

export function markKeySent(db: SqlDriver, run: string, now: Date = new Date()): void {
  const list = heldKeys(db).map((k) => (k.run === run ? { ...k, sentAt: now.toISOString() } : k));
  appState.set(db, VAULT_KEY, JSON.stringify(list));
}

// --- pending invite (the sender's phone) -------------------------------------

/**
 * Keep the keyholder link until the user has sent or shown it. Without it the
 * run could never be unblinded, so it's kept (obfuscated) only until then.
 */
export function setPendingInvite(db: SqlDriver, payload: KeyholderPayload): void {
  appState.set(db, PENDING_KEY, encodePayload(payload));
}

export function pendingInvite(db: SqlDriver): KeyholderPayload | null {
  const token = appState.get(db, PENDING_KEY);
  return token ? decodeKeyholderPayload(token) : null;
}

export function clearPendingInvite(db: SqlDriver): void {
  appState.set(db, PENDING_KEY, '');
}
