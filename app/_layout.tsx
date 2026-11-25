import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
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
  // Brand fonts. Render nothing until they load (the native splash stays up),
  // so text never flashes in the system font first.
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded && !fontError) {
    return null;
  }
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
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { color: theme.colors.textPrimary, fontFamily: theme.typography.headline.fontFamily },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Today', headerShown: false }} />
        <Stack.Screen name="welcome" options={{ title: '', headerShown: false }} />
        <Stack.Screen name="goal-picker" options={{ title: '' }} />
        <Stack.Screen name="experiment-setup" options={{ title: '' }} />
        <Stack.Screen name="daily-test" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="progress" options={{ title: 'Journey' }} />
        <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        <Stack.Screen name="verdict" options={{ title: '' }} />
        <Stack.Screen name="evidence-card" options={{ title: 'Evidence Card' }} />
        <Stack.Screen name="paywall" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="reaction-test" options={{ title: 'Reaction test' }} />
        <Stack.Screen name="dictionary/index" options={{ title: 'Library' }} />
        <Stack.Screen name="dictionary/[id]" options={{ title: '' }} />
      </Stack>
    </>
  );
}
