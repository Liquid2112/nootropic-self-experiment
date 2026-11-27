/** Minimum age to use Placebo. Matches the terms, privacy policy and App Store rating. */
export const MINIMUM_AGE = 18;

export type AgeCheck = 'incomplete' | 'invalid' | 'under' | 'ok';

/**
 * Birth-year check. We only ask for the year (no full date of birth), so
 * anyone born in the cutoff year is treated as 18 and everyone born later is
 * blocked. That is the conservative-enough, low-friction reading for a
 * self-attested gate.
 */
export function checkBirthYear(input: string, now: Date = new Date()): AgeCheck {
  const text = input.trim();
  if (text.length < 4) return 'incomplete';
  if (!/^\d{4}$/.test(text)) return 'invalid';
  const year = Number(text);
  const thisYear = now.getFullYear();
  if (year < thisYear - 120 || year > thisYear) return 'invalid';
  return thisYear - year >= MINIMUM_AGE ? 'ok' : 'under';
}
