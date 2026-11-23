import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider } from '@/screens/onboarding/OnboardingContext';

import { ThemeProvider, useTheme } from '@/ui';

/**
 * Root navigator. One stack with a route per MVP screen, wrapped in the
 * design-system `ThemeProvider` so every screen reads the same tokens and in
 * `OnboardingProvider` so the onboarding flow can share draft state across its
 * Welcome -> Goal picker -> Experiment setup steps.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <OnboardingProvider>
          <ThemedStack />
        </OnboardingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** The navigation stack, themed from the design-system tokens. */
function ThemedStack() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.textPrimary },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Today' }} />
        <Stack.Screen name="welcome" options={{ title: 'Welcome' }} />
        <Stack.Screen name="goal-picker" options={{ title: 'Goal & Supplement' }} />
        <Stack.Screen name="experiment-setup" options={{ title: 'Experiment Setup' }} />
        <Stack.Screen name="daily-test" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        <Stack.Screen name="verdict" options={{ title: 'Verdict' }} />
        <Stack.Screen name="evidence-card" options={{ title: 'Evidence Card' }} />
      </Stack>
    </>
  );
}
