import { createContext, useContext, type ReactNode } from 'react';

import { defaultTheme, type Theme } from './tokens';

/**
 * Theme context. A single provider puts the active `Theme` in context and
 * every primitive reads it through `useTheme()`. Defaulting the context to
 * `defaultTheme` means a component rendered without an explicit provider
 * (e.g. in a unit test) still gets valid tokens instead of throwing.
 */
const ThemeContext = createContext<Theme>(defaultTheme);

export type ThemeProviderProps = {
  /** Theme to apply to the subtree. Defaults to the app's light theme. */
  theme?: Theme;
  children: ReactNode;
};

export function ThemeProvider({ theme = defaultTheme, children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Read the active theme. Returns `defaultTheme` when no provider is mounted. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
