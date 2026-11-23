/**
 * Minimal React Native mock for render tests.
 *
 * The design-system primitives only touch a small slice of the RN surface:
 * the host components View / Text / Pressable / ScrollView / ActivityIndicator,
 * plus the StyleSheet and PanResponder helpers. Rendering each as a plain host
 * element lets react-test-renderer produce a JSON tree without pulling in the
 * metro/babel transform chain, so the UI tests run under the same ts-jest
 * setup as the data tests. This mock is test-only; the real modules ship to
 * the device.
 */
import { createElement, type ReactNode } from 'react';

type AnyProps = Record<string, unknown> & { children?: ReactNode };

const host = (name: string) => {
  const Component = ({ children, ...rest }: AnyProps) =>
    createElement(name, rest, children);
  Component.displayName = name;
  return Component;
};

export const View = host('View');
export const Text = host('Text');
export const ScrollView = host('ScrollView');
export const ActivityIndicator = host('ActivityIndicator');
export const SafeAreaView = host('SafeAreaView');

type PressableChildState = { pressed: boolean };
type PressableProps = Omit<AnyProps, 'children'> & {
  children?: ReactNode | ((state: PressableChildState) => ReactNode);
  onLayout?: (e: unknown) => void;
};

export function Pressable({ children, ...rest }: PressableProps) {
  const resolved =
    typeof children === 'function' ? children({ pressed: false }) : children;
  return createElement('Pressable', rest, resolved);
}

export const StyleSheet = {
  create: <T extends Record<string, object>>(styles: T): T => styles,
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hairlineWidth: 1,
  flatten: (style: unknown) => style,
};

export const PanResponder = {
  create: (_config: unknown) => ({ panHandlers: {} }),
};

export type ViewProps = AnyProps;
export type TextProps = AnyProps;
export type ViewStyle = Record<string, unknown>;
export type TextStyle = Record<string, unknown>;
export type GestureResponderEvent = { nativeEvent: { locationX: number } };
export type PanResponderGestureState = { moveX: number; dx: number };
export type LayoutChangeEvent = { nativeEvent: { layout: { width: number; height: number } } };
export type PressableStateCallbackType = PressableChildState;
export type { PressableProps };
