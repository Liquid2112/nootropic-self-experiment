import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Daily test. Later PRs run the PVT and n-back cognitive tests and collect the
// subjective ratings for a test_session.
export default function DailyTestScreen() {
  return (
    <ScreenPlaceholder
      title="Daily Test"
      description="The reaction-time and working-memory tests will run here."
      links={[{ label: 'Back to Today', href: '/' }]}
    />
  );
}
