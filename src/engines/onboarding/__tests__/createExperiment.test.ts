import { createMemoryDriver } from '@/db/__tests__/memoryDriver';
import { experiments, scheduleDays, supplements } from '@/db/repositories';
import type { SqlDriver } from '@/db/driver';
import { migrate } from '@/db/schema';
import { seedSupplements } from '@/db/seed';
import { unsealArmMapping, type ArmMapping } from '@/engines/experiment';
import { createExperiment, validateSelections } from '../createExperiment';
import type { OnboardingSelections } from '../types';

/**
 * Tests for the one wiring point between the onboarding screens, the
 * experiment-design engine, and the data layer. They run the real schema,
 * seed, DAOs, and engine against an in-memory driver.
 */

function freshDb(): SqlDriver {
  const db = createMemoryDriver();
  migrate(db);
  seedSupplements(db);
  return db;
}

function base(overrides: Partial<OnboardingSelections> = {}): OnboardingSelections {
  return {
    goal: 'focus',
    supplement: { kind: 'curated', supplementId: 'caffeine', type: 'acute', name: 'Caffeine' },
    lengthDays: 28,
    blindingMode: 'none',
    testWindow: 'morning',
    startDate: '2026-02-01',
    ...overrides,
  };
}

describe('validateSelections', () => {
  it('accepts a well-formed open run', () => {
    expect(validateSelections(base())).toEqual([]);
  });

  it('rejects a bad length, bad date, and empty supplement name', () => {
    const errors = validateSelections(
      base({
        lengthDays: 30 as OnboardingSelections['lengthDays'],
        startDate: '2026/02/01',
        supplement: { kind: 'other', name: '   ', type: 'cumulative' },
      }),
    );
    const fields = errors.map((e) => e.field).sort();
    expect(fields).toEqual(['lengthDays', 'startDate', 'supplement']);
  });

  it('requires a passphrase only for friend-blinded (sealed) runs', () => {
    expect(validateSelections(base({ blindingMode: 'sealed' }))).toEqual([
      { field: 'friendPassphrase', message: expect.any(String) },
    ]);
    expect(
      validateSelections(base({ blindingMode: 'sealed', friendPassphrase: 'secret' })),
    ).toEqual([]);
    // self-blind derives its own passphrase, so none is required.
    expect(validateSelections(base({ blindingMode: 'self_blind' }))).toEqual([]);
  });
});

describe('createExperiment: open run', () => {
  it('stores the experiment and a full ON/OFF schedule', () => {
    const db = freshDb();
    const id = createExperiment(db, base(), { experimentId: 'exp_1', seed: 'seed-x' });

    const exp = experiments.getById(db, id);
    expect(exp).toBeDefined();
    expect(exp!.supplementId).toBe('caffeine');
    expect(exp!.design).toBe('acute');
    expect(exp!.primaryMetric).toBe('pvt_median_ms');
    expect(exp!.blindingMode).toBe('none');
    expect(exp!.lengthDays).toBe(28);
    expect(exp!.startDate).toBe('2026-02-01');
    expect(exp!.status).toBe('active');
    expect(exp!.sealedKey).toBeNull();

    const days = scheduleDays.listForExperiment(db, id);
    expect(days).toHaveLength(28);
    expect(days[0]!.dayIndex).toBe(0);
    expect(days[0]!.date).toBe('2026-02-01');
    // Open run stores the true ON/OFF arms.
    for (const d of days) {
      expect(d.arm === 'ON' || d.arm === 'OFF').toBe(true);
      expect(d.taken).toBe(false);
    }
  });
});

describe('createExperiment: blinded runs never expose the assignment', () => {
  it('stores neutral A/B arms and a sealed key for friend-blinded runs', () => {
    const db = freshDb();
    const id = createExperiment(db, base({ blindingMode: 'sealed', friendPassphrase: 'pw-123' }), {
      experimentId: 'exp_b',
      seed: 'seed-b',
    });

    const exp = experiments.getById(db, id)!;
    expect(exp.blindingMode).toBe('sealed');
    expect(exp.sealedKey).not.toBeNull();

    const days = scheduleDays.listForExperiment(db, id);
    // Stored arms carry no ON/OFF information — only neutral labels.
    for (const d of days) {
      expect(d.arm === 'A' || d.arm === 'B').toBe(true);
    }

    // The true mapping is recoverable only with the passphrase, never from the
    // stored rows alone.
    const mapping = unsealArmMapping<ArmMapping>(exp.sealedKey!, 'pw-123');
    expect(mapping.supplementLabel === 'A' || mapping.supplementLabel === 'B').toBe(true);
    expect(() => unsealArmMapping<ArmMapping>(exp.sealedKey!, 'wrong')).toThrow();
  });

  it('seals self-blinded runs with neutral arms too', () => {
    const db = freshDb();
    const id = createExperiment(db, base({ blindingMode: 'self_blind' }), {
      experimentId: 'exp_s',
      seed: 'seed-s',
    });
    const exp = experiments.getById(db, id)!;
    expect(exp.sealedKey).not.toBeNull();
    const arms = new Set(scheduleDays.listForExperiment(db, id).map((d) => d.arm));
    for (const arm of arms) {
      expect(arm === 'A' || arm === 'B').toBe(true);
    }
  });
});

describe('createExperiment: Other supplement', () => {
  it('inserts a hidden supplement row so the foreign key holds', () => {
    const db = freshDb();
    const before = supplements.list(db).length;
    const id = createExperiment(
      db,
      base({ supplement: { kind: 'other', name: 'Mystery Powder', type: 'cumulative' } }),
      { experimentId: 'exp_o', seed: 'seed-o' },
    );

    const exp = experiments.getById(db, id)!;
    expect(exp.supplementId).toBe('other:mystery powder');
    expect(exp.design).toBe('cumulative');

    // The custom row exists (so the FK is satisfied) but is excluded from the
    // curated picker list.
    const custom = supplements.getById(db, 'other:mystery powder');
    expect(custom?.excluded).toBe(true);
    expect(supplements.list(db).length).toBe(before);
    expect(supplements.list(db, true).length).toBe(before + 1);
  });

  it('reuses the custom row when the same name is used again', () => {
    const db = freshDb();
    const other: OnboardingSelections = base({
      supplement: { kind: 'other', name: 'Repeat Tonic', type: 'acute' },
    });
    createExperiment(db, other, { experimentId: 'exp_r1', seed: 's1' });
    // A second run with the same custom name must not throw on a duplicate id.
    expect(() =>
      createExperiment(db, other, { experimentId: 'exp_r2', seed: 's2' }),
    ).not.toThrow();
    expect(supplements.list(db, true).filter((s) => s.id === 'other:repeat tonic')).toHaveLength(1);
  });
});

describe('createExperiment: validation gate', () => {
  it('throws rather than persisting an invalid configuration', () => {
    const db = freshDb();
    expect(() =>
      createExperiment(db, base({ blindingMode: 'sealed' }), {
        experimentId: 'exp_bad',
        seed: 'seed',
      }),
    ).toThrow(/passphrase/i);
    expect(experiments.getById(db, 'exp_bad')).toBeUndefined();
  });
});
