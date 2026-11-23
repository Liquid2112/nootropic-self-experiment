import { Scaffold, AppText, Button } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('Scaffold', () => {
  it('renders scrolling content', () => {
    const r = renderWithTheme(
      <Scaffold>
        <AppText>Body content</AppText>
      </Scaffold>,
    );
    expect(textContent(r)).toContain('Body content');
  });

  it('renders a pinned footer', () => {
    const r = renderWithTheme(
      <Scaffold footer={<Button label="Continue" onPress={() => {}} />}>
        <AppText>Body</AppText>
      </Scaffold>,
    );
    const texts = textContent(r);
    expect(texts).toContain('Body');
    expect(texts).toContain('Continue');
  });

  it('renders without scrolling when scroll is false', () => {
    const r = renderWithTheme(
      <Scaffold scroll={false}>
        <AppText>Static</AppText>
      </Scaffold>,
    );
    expect(textContent(r)).toContain('Static');
  });
});
