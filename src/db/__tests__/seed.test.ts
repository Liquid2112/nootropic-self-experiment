import { createMemoryDriver } from './memoryDriver';
import { supplements } from '../repositories';
import { migrate } from '../schema';
import { SEED_SUPPLEMENTS, seedSupplements } from '../seed';
import type { SupplementType } from '../types';

/**
 * Integrity checks on the curated supplement list. These guard the two things
 * a later feature relies on: the list is roughly the promised size and every
 * entry is well-formed, and the exclusion policy (no prescription, grey-market,
 * or injectable compounds) is actually honored.
 */

// Compounds that MUST NOT appear: prescription drugs, grey-market research
// chemicals, and injectables. Matched case-insensitively against id and name.
const FORBIDDEN = [
  'modafinil',
  'adderall',
  'ritalin',
  'methylphenidate',
  'amphetamine',
  'vyvanse',
  'piracetam',
  'aniracetam',
  'oxiracetam',
  'phenylpiracetam',
  'racetam',
  'phenibut',
  'tianeptine',
  'noopept',
  'selegiline',
  'semax',
  'cerebrolysin',
];

const VALID_TYPES: SupplementType[] = ['acute', 'cumulative'];

describe('curated supplement list integrity', () => {
  it('has about 30 entries', () => {
    expect(SEED_SUPPLEMENTS.length).toBeGreaterThanOrEqual(28);
    expect(SEED_SUPPLEMENTS.length).toBeLessThanOrEqual(35);
  });

  it('gives every entry a valid type', () => {
    for (const s of SEED_SUPPLEMENTS) {
      expect(VALID_TYPES).toContain(s.type);
    }
  });

  it('gives every entry a non-empty name and one-line evidence summary', () => {
    for (const s of SEED_SUPPLEMENTS) {
      expect(s.name.trim().length).toBeGreaterThan(0);
      expect(s.evidenceSummary.trim().length).toBeGreaterThan(0);
      expect(s.evidenceSummary).not.toContain('\n');
    }
  });

  it('gives every entry at least one evidence link', () => {
    for (const s of SEED_SUPPLEMENTS) {
      expect(s.evidenceLinks.length).toBeGreaterThan(0);
      for (const link of s.evidenceLinks) {
        expect(link).toMatch(/^https?:\/\//);
      }
    }
  });

  it('uses unique ids', () => {
    const ids = SEED_SUPPLEMENTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains no excluded entries today', () => {
    expect(SEED_SUPPLEMENTS.every((s) => s.excluded === false)).toBe(true);
  });

  it('contains no prescription, grey-market, or injectable compounds', () => {
    for (const s of SEED_SUPPLEMENTS) {
      const haystack = `${s.id} ${s.name}`.toLowerCase();
      for (const forbidden of FORBIDDEN) {
        expect(haystack).not.toContain(forbidden);
      }
    }
  });

  it('includes both acute and cumulative examples named in the spec', () => {
    const byId = new Map(SEED_SUPPLEMENTS.map((s) => [s.id, s]));
    expect(byId.get('l-theanine')?.type).toBe('acute');
    expect(byId.get('alpha-gpc')?.type).toBe('acute');
    expect(byId.get('rhodiola-rosea')?.type).toBe('acute');
    expect(byId.get('bacopa-monnieri')?.type).toBe('cumulative');
    expect(byId.get('creatine')?.type).toBe('cumulative');
    expect(byId.get('lions-mane')?.type).toBe('cumulative');
  });
});

describe('seedSupplements', () => {
  it('inserts the full list on first run and is a no-op afterwards', () => {
    const db = createMemoryDriver();
    migrate(db);

    seedSupplements(db);
    expect(supplements.count(db)).toBe(SEED_SUPPLEMENTS.length);

    // Second call must not duplicate rows.
    seedSupplements(db);
    expect(supplements.count(db)).toBe(SEED_SUPPLEMENTS.length);
  });
});
