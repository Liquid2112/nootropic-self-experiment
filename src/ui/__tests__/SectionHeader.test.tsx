import { SectionHeader, AppText } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('SectionHeader', () => {
  it('renders the title', () => {
    const r = renderWithTheme(<SectionHeader title="This week" />);
    expect(textContent(r)).toContain('This week');
  });

  it('renders subtitle and accessory', () => {
    const r = renderWithTheme(
      <SectionHeader title="Doses" subtitle="7 scheduled" accessory={<AppText>Edit</AppText>} />,
    );
    const texts = textContent(r);
    expect(texts).toContain('7 scheduled');
    expect(texts).toContain('Edit');
  });
});
