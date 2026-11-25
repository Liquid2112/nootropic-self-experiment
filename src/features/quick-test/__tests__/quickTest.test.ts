import { comparedToBest, scoreQuickTest, shareText, speedLabel } from '..';

describe('scoreQuickTest', () => {
  it('scores a clean run: median and lapses over plausible taps', () => {
    const rts = [250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 600, 240];
    const s = scoreQuickTest(rts, 12);
    expect(s).toEqual({ ok: true, medianMs: 295, lapses: 1, trials: 12 });
  });

  it('drops a single false start but still scores', () => {
    const rts = [50, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360];
    const s = scoreQuickTest(rts, 12);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.trials).toBe(11);
  });

  it('refuses a spammed run and an abandoned run', () => {
    expect(scoreQuickTest(Array(12).fill(40), 12)).toEqual({ ok: false, reason: 'too_many_false_starts' });
    expect(scoreQuickTest([250, 260], 12)).toEqual({ ok: false, reason: 'abandoned' });
  });
});

describe('copy', () => {
  it('labels speed bands', () => {
    expect(speedLabel(230)).toBe('Lightning fast');
    expect(speedLabel(280)).toBe('Sharp');
    expect(speedLabel(320)).toBe('Solid');
    expect(speedLabel(420)).toBe('A bit slow today');
  });

  it('compares with the personal best', () => {
    expect(comparedToBest(280, null)).toMatch(/first score/);
    expect(comparedToBest(260, 280)).toBe('New personal best, 20 ms faster than before.');
    expect(comparedToBest(280, 280)).toBe('Tied your personal best.');
    expect(comparedToBest(300, 280)).toBe('20 ms off your best of 280 ms.');
  });

  it('builds share text', () => {
    expect(shareText(247)).toBe('My reaction time today: 247 ms (lightning fast). How fast are you?');
  });
});
