import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Progress. Later PRs chart the daily metrics over the experiment and show
// adherence.
export default function ProgressScreen() {
  return (
    <ScreenPlaceholder
      title="Progress"
      description="Charts of your daily metrics will appear here."
      links={[{ label: 'See verdict', href: '/verdict' }]}
    />
  );
}
