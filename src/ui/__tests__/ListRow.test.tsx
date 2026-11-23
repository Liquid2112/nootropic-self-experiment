import { ListRow } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('ListRow', () => {
  it('renders title and subtitle', () => {
    const r = renderWithTheme(<ListRow title="Caffeine" subtitle="200 mg" />);
    const texts = textContent(r);
    expect(texts).toContain('Caffeine');
    expect(texts).toContain('200 mg');
  });

  it('is a button when pressable', () => {
    const r = renderWithTheme(<ListRow title="Open" onPress={() => {}} />);
    const node = r.root.findByProps({ accessibilityRole: 'button' });
    expect(node).toBeTruthy();
  });

  it('renders a chevron when requested', () => {
    const r = renderWithTheme(<ListRow title="Next" showChevron />);
    expect(textContent(r)).toContain('\u203A');
  });
});
