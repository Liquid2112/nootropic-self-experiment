import { createRng, normalizeSeed } from './rng';

/**
 * Sealed arm mapping.
 *
 * During a blinded run the app must not DISPLAY which arm (A/B, or which
 * envelope number) is the supplement. We store the mapping in an obfuscated
 * "sealed" form so that the running app, reading `experiment.sealed_key`, cannot
 * render the assignment without first being given the unseal passphrase at
 * unblinding time.
 *
 * HONEST THREAT MODEL — read this before trusting it:
 *   This is obfuscation, NOT cryptography. The sealed value is a XOR of the
 *   mapping JSON against a keystream derived from the passphrase with a
 *   non-cryptographic PRNG (see rng.ts). The data lives on the user's own
 *   device, so a determined user can read the stored passphrase, inspect
 *   storage, or read this source and recover the mapping. That is acceptable:
 *   the goal is to stop the APP from accidentally showing the assignment during
 *   a blinded run and to make casual peeking inconvenient — NOT to defend
 *   against the device owner. For friend-blinding, the friend keeps the
 *   passphrase off-device, which is what actually preserves the blind.
 */

/** Current sealed-format version, prefixed so future formats can be detected. */
const SEAL_VERSION = 'v1';

/**
 * Pull the next keystream byte from a passphrase-seeded PRNG. The passphrase
 * seeds the generator once (by the caller); each call advances it. Same
 * passphrase -> same keystream, so seal/unseal round-trip exactly.
 */
function keystreamByte(rng: { next(): number }): number {
  return Math.floor(rng.next() * 256) % 256;
}

/** 32-bit FNV-1a checksum of a string, hex-encoded, used as a tamper/typo guard. */
function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function toHex(bytes: number[]): string {
  return bytes.map((b) => (b & 0xff).toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

/**
 * Seal an arbitrary JSON-serializable mapping with a passphrase.
 *
 * The returned string is safe to persist in `experiment.sealed_key`. It cannot
 * be read back without the same passphrase (modulo the honest threat model
 * above). Format: `v1:<checksum>:<hex ciphertext>`.
 */
export function sealArmMapping(mapping: unknown, passphrase: string): string {
  const plain = JSON.stringify(mapping);
  // Seed from the passphrase; re-create fresh so seal and unseal share a state.
  const rng = createRng(normalizeSeed(passphrase));
  const cipher: number[] = [];
  for (let i = 0; i < plain.length; i += 1) {
    const code = plain.charCodeAt(i);
    // charCodeAt is a UTF-16 unit (0..65535). XOR high and low bytes with two
    // keystream bytes so the full code point is obscured.
    const kHi = keystreamByte(rng);
    const kLo = keystreamByte(rng);
    cipher.push((code >> 8) ^ kHi, (code & 0xff) ^ kLo);
  }
  const hex = toHex(cipher);
  return `${SEAL_VERSION}:${checksum(plain)}:${hex}`;
}

/**
 * Unseal a value produced by `sealArmMapping` with the same passphrase.
 *
 * Throws if the format is unrecognized or if the checksum does not match after
 * decryption (wrong passphrase, or a corrupted value). The generic type is the
 * caller's assertion about the stored shape; this function does not validate it
 * beyond the checksum.
 */
export function unsealArmMapping<T = unknown>(sealed: string, passphrase: string): T {
  const parts = sealed.split(':');
  if (parts.length !== 3 || parts[0] !== SEAL_VERSION) {
    throw new Error('Unrecognized sealed-key format');
  }
  const expectedChecksum = parts[1] as string;
  const hex = parts[2] as string;
  const cipher = fromHex(hex);
  const rng = createRng(normalizeSeed(passphrase));
  let plain = '';
  for (let i = 0; i < cipher.length; i += 2) {
    const hi = cipher[i] as number;
    const lo = cipher[i + 1] as number;
    const kHi = keystreamByte(rng);
    const kLo = keystreamByte(rng);
    const code = ((hi ^ kHi) << 8) | (lo ^ kLo);
    plain += String.fromCharCode(code);
  }
  if (checksum(plain) !== expectedChecksum) {
    throw new Error('Sealed-key checksum mismatch (wrong passphrase or corrupt)');
  }
  return JSON.parse(plain) as T;
}
