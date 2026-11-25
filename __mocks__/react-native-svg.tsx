/**
 * Minimal react-native-svg mock for UI render tests: every SVG primitive is a
 * plain host element, so components that draw with SVG render to JSON.
 */
import { createElement, type ReactNode } from 'react';

type AnyProps = Record<string, unknown> & { children?: ReactNode };

const host = (name: string) => {
  const Component = ({ children, ...rest }: AnyProps) => createElement(name, rest, children);
  Component.displayName = name;
  return Component;
};

const Svg = host('Svg');
export default Svg;
export const Circle = host('Circle');
export const Ellipse = host('Ellipse');
export const G = host('G');
export const Path = host('Path');
export const Rect = host('Rect');
