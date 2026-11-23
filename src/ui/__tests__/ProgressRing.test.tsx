import { ProgressRing, StreakIndicator, AppText } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('ProgressRing', () => {
  it('renders centered content', () => {
    const r = renderWithTheme(
      <ProgressRing progress={0.5}>
        <AppText>50%</AppText>
      </ProgressRing>,
    );
    expect(textContent(r)).toContain('50%');
  });

  it('reports clamped progress to accessibility', () => {
    const r = renderWithTheme(<ProgressRing progress={1.8} />);
    const node = r.root.findByProps({ accessibilityRole: 'progressbar' });
    expect(node.props.accessibilityValue).toMatchObject({ min: 0, max: 100, now: 100 });
  });

  it('renders at 0 progress without the left arc', () => {
    const r = renderWithTheme(<ProgressRing progress={0} />);
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('StreakIndicator', () => {
  it('shows the count and pluralized unit', () => {
    const many = renderWithTheme(<StreakIndicator count={5} />);
    expect(textContent(many)).toEqual(expect.arrayContaining(['5', 'days']));

    const one = renderWithTheme(<StreakIndicator count={1} />);
    expect(textContent(one)).toEqual(expect.arrayContaining(['1', 'day']));
  });
});
