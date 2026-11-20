import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Experiment setup. Later PRs configure design, blinding mode, and length,
// then generate the ON/OFF schedule.
export default function ExperimentSetupScreen() {
  return (
    <ScreenPlaceholder
      title="Experiment Setup"
      description="Configure design, blinding, and length here."
      links={[{ label: 'Go to Today', href: '/' }]}
    />
  );
}
