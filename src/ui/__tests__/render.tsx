import { createElement, type ReactElement } from 'react';
import TestRenderer, { type ReactTestRenderer } from 'react-test-renderer';

import { ThemeProvider } from '@/ui';

/**
 * Render a component inside the design-system ThemeProvider with
 * react-test-renderer and return the renderer instance. Wrapping in the
 * provider mirrors how screens mount primitives.
 */
export function renderWithTheme(element: ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(createElement(ThemeProvider, null, element));
  });
  return renderer;
}

/** Collect every text string anywhere in the rendered tree. */
export function textContent(renderer: ReactTestRenderer): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object' && 'children' in node) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(renderer.toJSON());
  return out;
}
