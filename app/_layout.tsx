import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider } from '@/screens/onboarding/OnboardingContext';

/**
 * Root navigator. One stack with a placeholder route per MVP screen.
 * Later PRs replace each placeholder with its real screen implementation
 * (see src/screens/).
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: true }}>
          <Stack.Screen name="index" options={{ title: 'Today' }} />
          <Stack.Screen name="welcome" options={{ title: 'Welcome' }} />
          <Stack.Screen name="goal-picker" options={{ title: 'Goal & Supplement' }} />
          <Stack.Screen name="experiment-setup" options={{ title: 'Experiment Setup' }} />
          <Stack.Screen name="daily-test" options={{ title: 'Daily Test' }} />
          <Stack.Screen name="progress" options={{ title: 'Progress' }} />
          <Stack.Screen name="verdict" options={{ title: 'Verdict' }} />
          <Stack.Screen name="evidence-card" options={{ title: 'Evidence Card' }} />
        </Stack>
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}
