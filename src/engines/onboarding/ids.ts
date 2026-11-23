/**
 * Small id/seed helpers for creating a run. Kept dependency-free: a short
 * random base-36 token is enough to key a local row and seed the schedule RNG,
 * which does not need cryptographic strength (self-blinding is weak by design;
 * see the engine's blinding notes).
 */

function randomToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
  );
}

/** A new experiment row id. */
export function newExperimentId(): string {
  return `exp_${randomToken()}`;
}

/** A fresh schedule seed. */
export function newScheduleSeed(): string {
  return randomToken();
}
