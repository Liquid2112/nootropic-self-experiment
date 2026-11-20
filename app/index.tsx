import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

// Today (home). Later PRs show the current experiment day, the dose reminder,
// and the entry point to the daily test.
export default function TodayScreen() {
  return (
    <ScreenPlaceholder
      title="Today"
      description="Your active experiment day will appear here."
      links={[
        { label: 'Start over (Welcome)', href: '/welcome' },
        { label: 'Pick a goal', href: '/goal-picker' },
        { label: 'Take today\u2019s test', href: '/daily-test' },
        { label: 'See progress', href: '/progress' },
      ]}
    />
  );
}
