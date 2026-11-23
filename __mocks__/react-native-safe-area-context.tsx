/**
 * Test-only mock for react-native-safe-area-context. `SafeAreaView` renders as
 * a plain host element and `SafeAreaProvider` passes children through, which is
 * all the Scaffold render tests need.
 */
import { createElement, type ReactNode } from 'react';

type AnyProps = Record<string, unknown> & { children?: ReactNode };

export function SafeAreaView({ children, ...rest }: AnyProps) {
  return createElement('SafeAreaView', rest, children);
}

export function SafeAreaProvider({ children }: AnyProps) {
  return createElement('SafeAreaProvider', null, children);
}

export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });

export type Edge = 'top' | 'bottom' | 'left' | 'right';
