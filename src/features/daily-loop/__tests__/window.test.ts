import {
  DEFAULT_CHECK_IN_WINDOW,
  isOffWindow,
  isWithinWindow,
  localHourOf,
  type CheckInWindow,
} from '../window';

const window: CheckInWindow = { startHour: 6, endHour: 11 };

describe('isWithinWindow', () => {
  it('is inclusive of the start hour and exclusive of the end hour', () => {
    expect(isWithinWindow(6, window)).toBe(true);
    expect(isWithinWindow(10, window)).toBe(true);
    expect(isWithinWindow(11, window)).toBe(false);
    expect(isWithinWindow(5, window)).toBe(false);
  });

  it('throws on a malformed window', () => {
    expect(() => isWithinWindow(8, { startHour: 11, endHour: 6 })).toThrow();
    expect(() => isWithinWindow(8, { startHour: -1, endHour: 6 })).toThrow();
    expect(() => isWithinWindow(8, { startHour: 6, endHour: 25 })).toThrow();
  });
});

describe('isOffWindow', () => {
  it('flags hours outside the window and not those inside', () => {
    expect(isOffWindow(8, window)).toBe(false);
    expect(isOffWindow(15, window)).toBe(true);
    expect(isOffWindow(11, window)).toBe(true);
  });
});

describe('localHourOf', () => {
  it('reads the local hour from a Date', () => {
    const d = new Date(2026, 0, 1, 9, 30, 0);
    expect(localHourOf(d)).toBe(9);
  });
});

describe('DEFAULT_CHECK_IN_WINDOW', () => {
  it('is a valid morning window', () => {
    expect(isWithinWindow(DEFAULT_CHECK_IN_WINDOW.startHour, DEFAULT_CHECK_IN_WINDOW)).toBe(true);
    expect(DEFAULT_CHECK_IN_WINDOW.endHour).toBeGreaterThan(DEFAULT_CHECK_IN_WINDOW.startHour);
  });
});
