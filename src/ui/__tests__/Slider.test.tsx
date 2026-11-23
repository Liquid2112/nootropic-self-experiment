import { Slider } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('Slider', () => {
  it('shows the current value and label', () => {
    const r = renderWithTheme(<Slider value={7} label="Focus" onChange={() => {}} />);
    const texts = textContent(r);
    expect(texts).toContain('Focus');
    expect(texts).toContain('7');
  });

  it('exposes its range to accessibility services', () => {
    const r = renderWithTheme(<Slider value={3} onChange={() => {}} />);
    const node = r.root.findByProps({ accessibilityRole: 'adjustable' });
    expect(node.props.accessibilityValue).toMatchObject({ min: 0, max: 10, now: 3 });
  });

  it('clamps and snaps an out-of-range value in the readout', () => {
    const r = renderWithTheme(<Slider value={42} onChange={() => {}} />);
    expect(textContent(r)).toContain('10');
  });

  it('can hide the numeric readout', () => {
    const r = renderWithTheme(<Slider value={5} hideValue onChange={() => {}} />);
    expect(textContent(r)).not.toContain('5');
  });
});
