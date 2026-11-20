import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Goal + Supplement picker. Later PRs list the curated supplements and let the
// user choose a goal and primary metric.
export default function GoalPickerScreen() {
  return (
    <ScreenPlaceholder
      title="Goal & Supplement"
      description="Choose a goal and a supplement from the curated list here."
      links={[{ label: 'Set up experiment', href: '/experiment-setup' }]}
    />
  );
}
