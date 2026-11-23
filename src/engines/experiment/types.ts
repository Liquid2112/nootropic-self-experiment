import type { BlindingMode, ScheduleArm } from '@/db';

/**
 * Engine-local types for the experiment-design engine.
 *
 * The generator is a pure function of its input and returns plain objects. It
 * deliberately does NOT build the full `ScheduleDay` domain row (which carries
 * `experimentId`, `taken`, `takenAt`): those belong to the DB layer, which adds
 * them when it persists a run. See `toScheduleDayRows` in `schedule.ts` for the
 * mapping into `schedule_day` columns.
 */

/** Which of the two study designs a supplement uses. Mirrors `SupplementType`. */
export type DesignType = 'acute' | 'cumulative';

/**
 * Supported run lengths. The acute design needs an even split and the
 * cumulative design needs clean 7- or 14-day blocks; 21 and 28 are the two MVP
 * lengths that satisfy both, so the generator only accepts these.
 */
export type RunLength = 21 | 28;

/**
 * The "true" arm a day belongs to, independent of how it is labeled to the user.
 * ON = supplement taken, OFF = placebo / nothing. Blinding only changes the
 * visible label (see `DisplayArm`), never this underlying value.
 */
export type TrueArm = 'ON' | 'OFF';

/**
 * Input to the schedule generator.
 *
 * `blindingMode` reuses the DB layer's vocabulary:
 *   - 'none'       -> Open: days are labeled ON/OFF, the user knows.
 *   - 'self_blind' -> Self-blinded: the user pre-fills numbered envelopes from a
 *                     shuffled list shown once; days are labeled by envelope
 *                     number. Stored schedule arms are the neutral A/B.
 *   - 'sealed'     -> Friend-blinded: a friend enters and seals the
 *                     A/B -> supplement/placebo mapping; days are labeled A/B and
 *                     the true mapping is hidden until unblinding.
 */
export type GenerateScheduleInput = {
  design: DesignType;
  blindingMode: BlindingMode;
  lengthDays: RunLength;
  /** Run start date as an ISO `YYYY-MM-DD` string; day 0 is this date. */
  startDate: string;
  /** Seed for reproducible randomization (acute order, blinding shuffles). */
  seed: string | number;
};

/**
 * One generated day. `arm` is the value persisted into `schedule_day.arm`
 * (constrained to ON/OFF/A/B by the schema). `isBaseline` flags the first three
 * lead-in days, during which no supplement is taken regardless of arm.
 */
export type GeneratedDay = {
  dayIndex: number;
  /** ISO `YYYY-MM-DD` date for this day, computed from `startDate + dayIndex`. */
  date: string;
  /** The arm label stored in the DB (neutralized for blinded runs). */
  arm: ScheduleArm;
  /** True for the 3-day baseline lead-in; such days carry no supplement. */
  isBaseline: boolean;
};

/** A full generated schedule plus the blinding artifacts a run needs. */
export type GeneratedSchedule = {
  design: DesignType;
  blindingMode: BlindingMode;
  lengthDays: RunLength;
  days: GeneratedDay[];
  /**
   * `unblinded` for open runs (the user already knows the arms); `blinded` for
   * self- and friend-blinded runs. Mirrors the "Mark results 'unblinded'"
   * requirement for the open mode.
   */
  blindingState: 'unblinded' | 'blinded';
  /**
   * The sealed arm mapping for blinded runs, ready to store in
   * `experiment.sealed_key`. `null` for open runs. The raw mapping is never
   * exposed here — only its sealed form (see `sealedKey.ts`).
   */
  sealedKey: string | null;
};
