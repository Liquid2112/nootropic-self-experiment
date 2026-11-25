/**
 * Referrals through friend-blinding — pure logic.
 *
 * The growth loop: a friend-blinded run needs a keyholder, someone who knows
 * which cup holds the real supplement and keeps the unlock key until the
 * verdict. Instead of typing a passphrase into your phone, you send them a
 * keyholder link. They install Placebo to hold it, and you both get a free
 * month. On reveal day their app nudges them to send the key back, which makes
 * the reveal a shared moment and gives you a person waiting on your result:
 * a reason to finish all 28 days.
 *
 * Also here: personal referral codes, creator codes ("Who sent you?"), and the
 * link formats. Everything is pure so it's unit tested.
 *
 * Honest threat model (same as sealedKey.ts): links are obfuscated, not
 * encrypted. A curious user could decode a keyholder link before sending it.
 * The blind holds because the app never shows it to them, and the key itself
 * never stays on their phone once it's sent.
 */

import { SHARE_LINK_BASE } from '@/config/links';
import { shortDateLabel } from '@/features/widget/model';

/** Public base for shareable links (universal links / App Links). */
export const LINK_BASE = SHARE_LINK_BASE;

/** Readable code alphabet: no 0/O, 1/I/L, so codes survive being read aloud. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type Rand = () => number;

function pick(rand: Rand, n: number): string {
  let out = '';
  for (let i = 0; i < n; i += 1) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return out;
}

/** A personal referral code: "P" + 6 characters, e.g. "PK7QXM2". */
export function newReferralCode(rand: Rand = Math.random): string {
  return `P${pick(rand, 6)}`;
}

/** The unlock key a keyholder holds: four groups of four, e.g. "K7QX-M2PA-R9TD-3HWE". */
export function newKeyholderKey(rand: Rand = Math.random): string {
  return [pick(rand, 4), pick(rand, 4), pick(rand, 4), pick(rand, 4)].join('-');
}

/** Uppercase and strip spaces, so "pk7q xm2" matches "PK7QXM2". */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Normalize a typed key back to its dashed form (or return it trimmed). */
export function normalizeKey(input: string): string {
  const raw = normalizeCode(input);
  return raw.length === 16 ? raw.match(/.{4}/g)!.join('-') : input.trim();
}

const FRIEND_CODE = new RegExp(`^P[${CODE_ALPHABET}]{6}$`);

export function isFriendCode(code: string): boolean {
  return FRIEND_CODE.test(code);
}

export type Creator = { code: string; name: string };

export type CodeMatch = { kind: 'creator'; code: string; name: string } | { kind: 'friend'; code: string };

/** Resolve a typed "Who sent you?" code against the creator list. */
export function lookupCode(input: string, creators: readonly Creator[], ownCode?: string): CodeMatch | null {
  const code = normalizeCode(input);
  if (code.length === 0) return null;
  const creator = creators.find((c) => normalizeCode(c.code) === code);
  if (creator) return { kind: 'creator', code: normalizeCode(creator.code), name: creator.name };
  if (isFriendCode(code) && code !== ownCode) return { kind: 'friend', code };
  return null;
}

// --- links -------------------------------------------------------------------

/**
 * What a keyholder link carries. `cup` is the cup that gets the real
 * supplement: the keyholder needs it to fill the cups.
 */
export type KeyholderPayload = {
  v: 1;
  /** Run id on the sender's phone (so the sender's own app refuses to open it). */
  run: string;
  /** The unlock key the run was sealed with. */
  key: string;
  /** Which cup gets the supplement. */
  cup: 'A' | 'B';
  supplement: string;
  /** YYYY-MM-DD the verdict unlocks. */
  reveal: string;
  /** Sender's first name, or '' when they skipped it. */
  from: string;
  /** Sender's referral code, so both get the reward. */
  ref: string;
};

/** What the keyholder sends back on reveal day. */
export type UnlockPayload = { v: 1; run: string; key: string };

/**
 * A progress update the runner sends their keyholder ("day 14 of 28"). Carries
 * only how far along the run is, never a score, so it can't hint at the result.
 */
export type ProgressPayload = {
  v: 1;
  t: 'p';
  run: string;
  /** Run day reached (1-based). */
  day: number;
  /** Run length in days. */
  of: number;
  /** Sender's first name, or ''. */
  from: string;
  /** YYYY-MM-DD the verdict unlocks. */
  reveal: string;
};

// A fixed mask so a link isn't readable at a glance. Not a secret (see the
// threat model above).
const MASK = 'placebo-keyholder';

function xor(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) out[i] = bytes[i]! ^ MASK.charCodeAt(i % MASK.length);
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodePayload(payload: KeyholderPayload | UnlockPayload | ProgressPayload): string {
  return toBase64Url(xor(new TextEncoder().encode(JSON.stringify(payload))));
}

function decodeJson(token: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(xor(fromBase64Url(token))));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function decodeKeyholderPayload(token: string): KeyholderPayload | null {
  const p = decodeJson(token);
  if (
    !p ||
    p.v !== 1 ||
    typeof p.run !== 'string' ||
    typeof p.key !== 'string' ||
    (p.cup !== 'A' && p.cup !== 'B') ||
    typeof p.supplement !== 'string' ||
    typeof p.reveal !== 'string' ||
    !ISO.test(p.reveal) ||
    typeof p.from !== 'string' ||
    typeof p.ref !== 'string'
  ) {
    return null;
  }
  return p as unknown as KeyholderPayload;
}

export function decodeUnlockPayload(token: string): UnlockPayload | null {
  const p = decodeJson(token);
  if (!p || p.v !== 1 || typeof p.run !== 'string' || typeof p.key !== 'string' || 'cup' in p || 't' in p) return null;
  return { v: 1, run: p.run, key: p.key };
}

const isDay = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 400;

export function decodeProgressPayload(token: string): ProgressPayload | null {
  const p = decodeJson(token);
  if (
    !p ||
    p.v !== 1 ||
    p.t !== 'p' ||
    typeof p.run !== 'string' ||
    !isDay(p.day) ||
    !isDay(p.of) ||
    p.day > p.of ||
    typeof p.from !== 'string' ||
    typeof p.reveal !== 'string' ||
    !ISO.test(p.reveal)
  ) {
    return null;
  }
  return { v: 1, t: 'p', run: p.run, day: p.day, of: p.of, from: p.from, reveal: p.reveal };
}

export const keyholderLink = (p: KeyholderPayload) => `${LINK_BASE}/k/${encodePayload(p)}`;
export const unlockLink = (p: UnlockPayload) => `${LINK_BASE}/u/${encodePayload(p)}`;
export const referralLink = (code: string) => `${LINK_BASE}/r/${code}`;
export const progressLink = (p: ProgressPayload) => `${LINK_BASE}/p/${encodePayload(p)}`;

export type ParsedLink = { kind: 'k' | 'u' | 'r' | 'p'; token: string };

/** Pull the kind and token out of a pasted link (https or placebo://). */
export function parseLink(text: string): ParsedLink | null {
  const m = /(?:^|\/)(k|u|r|p)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/.exec(text.trim());
  return m ? { kind: m[1] as ParsedLink['kind'], token: m[2]! } : null;
}

// --- messages ----------------------------------------------------------------

/** The text the user sends their keyholder. Never names the cup. */
export function keyholderInviteMessage(p: KeyholderPayload): string {
  return [
    `I'm running a blind test of ${p.supplement} on Placebo and I need you to be my keyholder.`,
    `Open this on your phone (not mine!). It tells you how to fill two cups and keeps the key until ${shortDateLabel(p.reveal)}. We both get a free month of Placebo.`,
    keyholderLink(p),
  ].join('\n\n');
}

export function unlockMessage(p: UnlockPayload, supplement: string): string {
  return [`Reveal day! Here's the key to your ${supplement} verdict.`, unlockLink(p)].join('\n\n');
}

export function referralMessage(code: string): string {
  return [
    `I'm testing whether my supplements actually work, blind, with Placebo. Use my code ${code} and we both get a free month.`,
    referralLink(code),
  ].join('\n\n');
}

// --- keyholder progress updates --------------------------------------------

/**
 * The run days that prompt "tell your keyholder how it's going": once a week.
 * The keyholder is the one person who knows the run exists and is waiting on
 * the result, so a weekly ping turns them into a reason to keep going.
 */
export const PROGRESS_MILESTONES = [7, 14, 21] as const;

/**
 * The milestone the runner should share now, or null. That is the latest
 * milestone reached that hasn't been shared yet and isn't the last day (the
 * reveal covers that). A skipped week rolls forward instead of stacking up.
 */
export function dueProgressMilestone(runDay: number, lengthDays: number, lastSharedDay: number): number | null {
  let due: number | null = null;
  for (const m of PROGRESS_MILESTONES) {
    if (m < lengthDays && m <= runDay && m > lastSharedDay) due = m;
  }
  return due;
}

/** "Day 14 of 28" update the runner sends their keyholder. Never a score. */
export function progressMessage(p: ProgressPayload): string {
  const left = p.of - p.day;
  const half = p.day * 2 >= p.of && (p.day - 1) * 2 < p.of;
  const line =
    left <= 7
      ? `Day ${p.day} of ${p.of}. One week left on my blind test and I still can't tell which cup is real.`
      : half
        ? `Day ${p.day} of ${p.of}. Halfway through my blind test, still no idea which cup is real.`
        : `Day ${p.day} of ${p.of} on my blind test. Still no idea which cup is real.`;
  return [line, `You're holding my key until ${shortDateLabel(p.reveal)}. Don't tell me anything.`, progressLink(p)].join(
    '\n\n',
  );
}

/** The keyholder's reply: a short cheer, no link needed. */
export function cheerMessage(p: ProgressPayload): string {
  const left = p.of - p.day;
  return left <= 0
    ? `That's all ${p.of} days. I've got your key ready for ${shortDateLabel(p.reveal)}.`
    : `Day ${p.day} of ${p.of}, nice. ${left} to go. Your key's safe with me until ${shortDateLabel(p.reveal)}, so don't you dare skip a day.`;
}

/** The runner's reveal-day nudge to their keyholder. */
export function keyRequestMessage(supplement: string): string {
  return `Reveal day! My ${supplement} test is done. Open Placebo and send me the key so I can see if it actually worked.`;
}

/** True once the key may be sent back (on or after reveal day). */
export function canSendKey(reveal: string, today: string): boolean {
  return today >= reveal;
}

/** The reward both sides get when a referred friend starts. */
export const REFERRAL_REWARD = { months: 1 } as const;
