import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Welcome / Disclaimer. Later PRs show the not-medical-advice disclaimer and
// first-run onboarding.
export default function WelcomeScreen() {
  return (
    <ScreenPlaceholder
      title="Welcome"
      description="Disclaimer and onboarding will appear here. This app is for personal self-experiments, not medical advice."
      links={[{ label: 'Continue', href: '/goal-picker' }]}
    />
  );
}
