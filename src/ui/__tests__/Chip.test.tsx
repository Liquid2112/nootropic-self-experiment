import { Chip } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('Chip', () => {
  it('renders its label', () => {
    const r = renderWithTheme(<Chip label="Focus" onPress={() => {}} />);
    expect(textContent(r)).toContain('Focus');
  });

  it('reflects the selected state for accessibility', () => {
    const r = renderWithTheme(<Chip label="Memory" selected onPress={() => {}} />);
    const node = r.root.findByProps({ accessibilityRole: 'button' });
    expect(node.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('reflects the unselected state', () => {
    const r = renderWithTheme(<Chip label="Energy" onPress={() => {}} />);
    const node = r.root.findByProps({ accessibilityRole: 'button' });
    expect(node.props.accessibilityState).toMatchObject({ selected: false });
  });
});
