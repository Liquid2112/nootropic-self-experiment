import { lightTheme, defaultTheme, spacing, radius, typography } from '@/ui';

describe('design tokens', () => {
  it('exposes the full semantic color role set', () => {
    const roles = Object.keys(lightTheme.colors).sort();
    expect(roles).toEqual(
      [
        'accent',
        'accentMuted',
        'accentPressed',
        'background',
        'border',
        'danger',
        'fill',
        'onAccent',
        'scrim',
        'success',
        'surface',
        'surfaceRaised',
        'textPrimary',
        'textSecondary',
        'textTertiary',
        'warning',
      ].sort(),
    );
  });

  it('defaults to the light theme', () => {
    expect(defaultTheme).toBe(lightTheme);
    expect(defaultTheme.name).toBe('light');
  });

  it('uses a single blue accent and its pressed variant', () => {
    expect(lightTheme.colors.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(lightTheme.colors.accentPressed).not.toBe(lightTheme.colors.accent);
  });

  it('scales spacing monotonically from a small base', () => {
    const values = [spacing.xxs, spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl, spacing.xxl];
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });

  it('provides a pill radius for fully rounded controls', () => {
    expect(radius.pill).toBeGreaterThanOrEqual(999);
  });

  it('keeps every typography entry well-formed', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });
});
