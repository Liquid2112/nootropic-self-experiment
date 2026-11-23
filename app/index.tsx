import { useMemo } from 'react';
import { Redirect } from 'expo-router';
import { experiments, getDatabase } from '@/db';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

/**
 * Today (home). On first run there is no active experiment, so the user is sent
 * through the onboarding gate (welcome -> goal -> setup) before anything else.
 * Once a run exists, this is where later PRs show the current day and test.
 */
export default function TodayScreen() {
  const hasActiveRun = useMemo(() => {
    return experiments.listByStatus(getDatabase(), 'active').length > 0;
  }, []);

  if (!hasActiveRun) {
    return <Redirect href="/welcome" />;
  }

  return (
    <ScreenPlaceholder
      title="Today"
      description="Your active experiment day will appear here."
      links={[
        { label: 'Take today\u2019s test', href: '/daily-test' },
        { label: 'See progress', href: '/progress' },
      ]}
    />
  );
}
