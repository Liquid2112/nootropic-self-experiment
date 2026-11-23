import { CalendarCell, AdherenceDot } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('CalendarCell', () => {
  it('renders the day number', () => {
    const r = renderWithTheme(<CalendarCell day={14} />);
    expect(textContent(r)).toContain('14');
  });

  it('renders nothing numeric when blank', () => {
    const r = renderWithTheme(<CalendarCell day={0} blank />);
    expect(textContent(r)).toHaveLength(0);
  });

  it('marks selection for accessibility when pressable', () => {
    const r = renderWithTheme(<CalendarCell day={3} selected onPress={() => {}} />);
    const node = r.root.findByProps({ accessibilityRole: 'button' });
    expect(node.props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('AdherenceDot', () => {
  it('labels each state', () => {
    for (const state of ['taken', 'missed', 'partial', 'upcoming', 'off'] as const) {
      const r = renderWithTheme(<AdherenceDot state={state} />);
      const node = r.root.findByProps({ accessibilityLabel: `adherence: ${state}` });
      expect(node).toBeTruthy();
    }
  });
});
