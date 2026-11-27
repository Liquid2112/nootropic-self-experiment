import { checkBirthYear } from '../ageGate';

const now = new Date('2026-06-15T12:00:00Z');

describe('checkBirthYear', () => {
  it('waits for four digits', () => {
    expect(checkBirthYear('', now)).toBe('incomplete');
    expect(checkBirthYear('200', now)).toBe('incomplete');
  });
  it('rejects junk and impossible years', () => {
    expect(checkBirthYear('20ab', now)).toBe('invalid');
    expect(checkBirthYear('1850', now)).toBe('invalid');
    expect(checkBirthYear('2030', now)).toBe('invalid');
  });
  it('blocks under 18', () => {
    expect(checkBirthYear('2012', now)).toBe('under');
    expect(checkBirthYear('2026', now)).toBe('under');
  });
  it('allows 18 and over', () => {
    expect(checkBirthYear('2008', now)).toBe('ok');
    expect(checkBirthYear('1990', now)).toBe('ok');
  });
});
