import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Verdict. Later PRs run the stats engine and present the effect estimate,
// confidence interval, and the did-it-work verdict.
export default function VerdictScreen() {
  return (
    <ScreenPlaceholder
      title="Verdict"
      description="Your experiment result and effect size will appear here."
      links={[{ label: 'Share evidence card', href: '/evidence-card' }]}
    />
  );
}
