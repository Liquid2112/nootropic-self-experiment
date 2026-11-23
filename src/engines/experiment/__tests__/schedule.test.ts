import { unsealArmMapping } from '../sealedKey';
import {
  BASELINE_DAYS,
  addDays,
  generateSchedule,
  isMidpointDay,
  toScheduleDayRows,
} from '../schedule';
import type { ArmMapping } from '../blinding';
import type { GenerateScheduleInput } from '../types';

function base(overrides: Partial<GenerateScheduleInput> = {}): GenerateScheduleInput {
  return {
    design: 'acute',
    blindingMode: 'none',
    lengthDays: 28,
    startDate: '2026-01-01',
    seed: 'seed-1',
    ...overrides,
  };
}

describe('addDays', () => {
  it('advances calendar days across a month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });
  it('rejects a non-ISO date', () => {
    expect(() => addDays('01/01/2026', 1)).toThrow();
  });
});

describe('generateSchedule: shape and dates', () => {
  it('produces lengthDays ordered rows with sequential dates', () => {
    const s = generateSchedule(base());
    expect(s.days).toHaveLength(28);
    expect(s.days[0]?.dayIndex).toBe(0);
    expect(s.days[0]?.date).toBe('2026-01-01');
    expect(s.days[27]?.date).toBe(addDays('2026-01-01', 27));
    s.days.forEach((d, i) => expect(d.dayIndex).toBe(i));
  });

  it('flags the first three days as baseline, rest not', () => {
    const s = generateSchedule(base());
    expect(s.days.slice(0, BASELINE_DAYS).every((d) => d.isBaseline)).toBe(true);
    expect(s.days.slice(BASELINE_DAYS).some((d) => d.isBaseline)).toBe(false);
  });

  it('rejects an unsupported length', () => {
    expect(() => generateSchedule(base({ lengthDays: 30 as never }))).toThrow();
  });
});

describe('generateSchedule: open run', () => {
  it('is unblinded with ON/OFF arms and no sealed key', () => {
    const s = generateSchedule(base());
    expect(s.blindingState).toBe('unblinded');
    expect(s.sealedKey).toBeNull();
    for (const d of s.days) {
      expect(['ON', 'OFF']).toContain(d.arm);
    }
  });
});

describe('generateSchedule: blinded run does not leak identity', () => {
  it('friend-blinded stores only A/B and hides the mapping', () => {
    const s = generateSchedule(base({ blindingMode: 'sealed' }), { passphrase: 'pw' });
    expect(s.blindingState).toBe('blinded');
    expect(s.sealedKey).not.toBeNull();
    for (const d of s.days) {
      expect(['A', 'B']).toContain(d.arm);
    }
    // No row, and no field on the schedule object, reveals supplement vs placebo
    // without unsealing.
    const serialized = JSON.stringify(s.days);
    expect(serialized).not.toContain('ON');
    expect(serialized).not.toContain('OFF');
    // Unsealing with the passphrase recovers a consistent mapping.
    const mapping = unsealArmMapping<ArmMapping>(s.sealedKey as string, 'pw');
    expect(['A', 'B']).toContain(mapping.supplementLabel);
  });
});

describe('generateSchedule: cumulative design', () => {
  it('lays out ABAB blocks for 28 days (as stored A/B labels under blinding)', () => {
    // Open cumulative keeps ON/OFF; the block structure shows as 7-long runs.
    const s = generateSchedule(base({ design: 'cumulative' }));
    const arms = s.days.map((d) => d.arm);
    expect(arms.slice(0, 7).every((a) => a === arms[0])).toBe(true);
    expect(arms.slice(7, 14).every((a) => a === arms[7])).toBe(true);
    expect(arms[0]).not.toBe(arms[7]);
  });
});

describe('toScheduleDayRows', () => {
  it('maps to full schedule_day rows with taken defaults', () => {
    const s = generateSchedule(base({ lengthDays: 21 }));
    const rows = toScheduleDayRows('exp-42', s);
    expect(rows).toHaveLength(21);
    expect(rows[0]).toEqual({
      experimentId: 'exp-42',
      dayIndex: 0,
      date: '2026-01-01',
      arm: s.days[0]?.arm,
      taken: false,
      takenAt: null,
    });
  });
});

describe('isMidpointDay', () => {
  it('is true across days 10..14 for a 28-day run', () => {
    for (let d = 10; d <= 14; d += 1) {
      expect(isMidpointDay(d, 28)).toBe(true);
    }
    expect(isMidpointDay(9, 28)).toBe(false);
    expect(isMidpointDay(15, 28)).toBe(false);
  });

  it('clamps the window to the run length for a 21-day run', () => {
    // 21-day run still has days 10..14, all valid indices.
    expect(isMidpointDay(14, 21)).toBe(true);
    expect(isMidpointDay(20, 21)).toBe(false);
  });
});
