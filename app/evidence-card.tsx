import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Evidence card. Later PRs render a shareable summary card of the experiment
// and its result.
export default function EvidenceCardScreen() {
  return (
    <ScreenPlaceholder
      title="Evidence Card"
      description="A shareable summary of your experiment will appear here."
      links={[{ label: 'Back to Today', href: '/' }]}
    />
  );
}
