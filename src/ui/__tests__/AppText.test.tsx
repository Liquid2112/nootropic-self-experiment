import { AppText } from '@/ui';
import { renderWithTheme, textContent } from './render';

describe('AppText', () => {
  it('renders its children', () => {
    const r = renderWithTheme(<AppText>Hello</AppText>);
    expect(textContent(r)).toContain('Hello');
  });

  it('applies the typography variant size', () => {
    const r = renderWithTheme(<AppText variant="largeTitle">Title</AppText>);
    const node = r.root.findByType('Text' as never);
    const style = Array.isArray(node.props.style) ? node.props.style[0] : node.props.style;
    expect(style.fontSize).toBe(34);
  });

  it('centers when asked', () => {
    const r = renderWithTheme(<AppText center>Centered</AppText>);
    const node = r.root.findByType('Text' as never);
    const style = Array.isArray(node.props.style) ? node.props.style[0] : node.props.style;
    expect(style.textAlign).toBe('center');
  });
});
