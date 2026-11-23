import type { BlindingMode, ScheduleArm } from '@/db';
import { createRng, shuffle } from './rng';
import { sealArmMapping } from './sealedKey';
import type { TrueArm } from './types';

/**
 * Blinding: turn the sequence of "true" ON/OFF arms into the arm LABELS stored
 * in `schedule_day.arm`, plus whatever sealed artifact the run needs.
 *
 * Three modes, mapped onto the DB's `BlindingMode` vocabulary:
 *   - 'none'       Open. Stored arm === true arm (ON/OFF). Nothing sealed; the
 *                  run is 'unblinded' and results may be shown.
 *   - 'sealed'     Friend-blinded. Days are stored as neutral A/B. A friend
 *                  chooses which letter maps to ON (the supplement) and that
 *                  mapping is sealed; the app can render only "A"/"B" during the
 *                  run.
 *   - 'self_blind' Self-blinded. Days are stored as neutral A/B. The user is
 *                  shown, once, a shuffled list that assigns each stored letter
 *                  to a numbered envelope; the letter->envelope mapping and the
 *                  letter->true-arm mapping are sealed. During the run the app
 *                  shows only the envelope number to open, never the arm.
 *
 * The letter->true-arm assignment is itself randomized from the seed so the
 * supplement is not always "A".
 */

/** The neutral labels a blinded run stores instead of ON/OFF. */
type NeutralLabel = 'A' | 'B';

/**
 * The secret mapping that is sealed for a blinded run. Kept minimal: which
 * neutral label is the supplement, and (self-blind only) which envelope number
 * each label corresponds to.
 */
export type ArmMapping = {
  /** The neutral label that corresponds to the ON (supplement) arm. */
  supplementLabel: NeutralLabel;
  /** The neutral label that corresponds to the OFF (placebo) arm. */
  placeboLabel: NeutralLabel;
  /** Self-blind only: neutral label -> envelope number shown to the user. */
  envelopeByLabel?: Record<NeutralLabel, number>;
};

export type BlindingResult = {
  /** The stored arm per day, aligned to the input `trueArms` order. */
  storedArms: ScheduleArm[];
  /** 'unblinded' for open runs, 'blinded' otherwise. */
  blindingState: 'unblinded' | 'blinded';
  /** Sealed mapping for blinded runs; null for open runs. */
  sealedKey: string | null;
};

/**
 * The passphrase used to seal a mapping.
 *
 * For 'sealed' (friend-blinded) runs this is supplied by the friend and kept
 * off-device — that is what actually holds the blind. For 'self_blind' runs the
 * app generates a passphrase from the seed; it is weaker (a determined user can
 * recover it), which is honest and expected: self-blinding only has to stop the
 * app from displaying the arm and make casual peeking inconvenient.
 */
export type SealOptions = {
  /** Passphrase for the sealed mapping. Required for 'sealed' mode. */
  passphrase?: string;
};

function assignLabels(seed: string | number): {
  supplementLabel: NeutralLabel;
  placeboLabel: NeutralLabel;
} {
  // One RNG draw decides whether the supplement is A or B.
  const rng = createRng(`labels:${String(seed)}`);
  const supplementLabel: NeutralLabel = rng.next() < 0.5 ? 'A' : 'B';
  return {
    supplementLabel,
    placeboLabel: supplementLabel === 'A' ? 'B' : 'A',
  };
}

/**
 * Apply a blinding mode to a sequence of true arms.
 *
 * Returns the stored arm labels plus the sealed artifact. Never returns the raw
 * arm mapping for a blinded run — only its sealed form — so a caller that
 * forwards the result to the UI cannot leak the assignment.
 */
export function applyBlinding(
  trueArms: readonly TrueArm[],
  mode: BlindingMode,
  seed: string | number,
  options: SealOptions = {},
): BlindingResult {
  if (mode === 'none') {
    return {
      storedArms: trueArms.map((a) => a as ScheduleArm),
      blindingState: 'unblinded',
      sealedKey: null,
    };
  }

  const { supplementLabel, placeboLabel } = assignLabels(seed);
  const storedArms: ScheduleArm[] = trueArms.map((a) =>
    a === 'ON' ? supplementLabel : placeboLabel,
  );

  const mapping: ArmMapping = { supplementLabel, placeboLabel };

  if (mode === 'self_blind') {
    // Show a shuffled envelope order once: assign each neutral label a distinct
    // envelope number from a shuffled [1, 2].
    const envelopes = shuffle([1, 2], createRng(`envelopes:${String(seed)}`));
    mapping.envelopeByLabel = {
      A: (supplementLabel === 'A' ? envelopes[0] : envelopes[1]) as number,
      B: (supplementLabel === 'B' ? envelopes[0] : envelopes[1]) as number,
    };
  }

  // Self-blind derives a passphrase from the seed (weak by design); friend-blind
  // requires the friend's passphrase and will not silently fall back.
  let passphrase = options.passphrase;
  if (mode === 'self_blind' && !passphrase) {
    passphrase = `self-blind:${String(seed)}`;
  }
  if (!passphrase) {
    throw new Error(
      "Friend-blinded ('sealed') runs require a passphrase to seal the mapping",
    );
  }

  return {
    storedArms,
    blindingState: 'blinded',
    sealedKey: sealArmMapping(mapping, passphrase),
  };
}
