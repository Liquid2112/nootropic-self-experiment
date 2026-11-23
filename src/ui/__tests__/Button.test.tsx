import { Button } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('Button', () => {
  it('renders its label', () => {
    const r = renderWithTheme(<Button label="Continue" onPress={() => {}} />);
    expect(textContent(r)).toContain('Continue');
  });

  it('renders every variant', () => {
    for (const variant of ['primary', 'secondary', 'subtle'] as const) {
      const r = renderWithTheme(<Button variant={variant} label={variant} onPress={() => {}} />);
      expect(r.toJSON()).toBeTruthy();
    }
  });

  it('hides the label and marks busy while loading', () => {
    const r = renderWithTheme(<Button label="Save" loading onPress={() => {}} />);
    expect(textContent(r)).not.toContain('Save');
    const root = r.root.findByProps({ accessibilityRole: 'button' });
    expect(root.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('is marked disabled when disabled', () => {
    const r = renderWithTheme(<Button label="Nope" disabled onPress={() => {}} />);
    const root = r.root.findByProps({ accessibilityRole: 'button' });
    expect(root.props.accessibilityState.disabled).toBe(true);
  });
});
