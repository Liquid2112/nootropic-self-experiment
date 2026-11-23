import { Card, AppText } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('Card', () => {
  it('renders children', () => {
    const r = renderWithTheme(
      <Card>
        <AppText>Inside the card</AppText>
      </Card>,
    );
    expect(textContent(r)).toContain('Inside the card');
  });

  it('renders at each elevation', () => {
    for (const elevation of ['none', 'sm', 'md', 'lg'] as const) {
      const r = renderWithTheme(
        <Card elevation={elevation}>
          <AppText>x</AppText>
        </Card>,
      );
      expect(r.toJSON()).toBeTruthy();
    }
  });
});
