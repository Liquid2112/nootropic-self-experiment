import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase, supplements, type Supplement } from '@/db';
import type { Goal, SupplementChoice } from '@/engines/onboarding';
import { GOALS, goalLabel } from '@/engines/onboarding';
import {
  Button,
  Chip,
  ListRow,
  Scaffold,
  SectionHeader,
  colors,
  fontSize,
  radius,
  spacing,
} from '@/ui';
import { useOnboarding } from './OnboardingContext';

/**
 * Screen 2 — Goal + supplement picker.
 *
 * Goal chips (focus / memory / calm / sleep) and a search over the curated
 * supplement list loaded from the DB, each row showing its acute/cumulative
 * type. An 'Other' entry lets the user name a supplement not in the list; the
 * 'Other' choice carries no evidence card.
 */
export function GoalPickerScreen() {
  const router = useRouter();
  const { state, update } = useOnboarding();
  const [query, setQuery] = useState('');

  // Load the curated list once; it is seeded on first launch (see @/db).
  const allSupplements = useMemo<Supplement[]>(() => {
    return supplements.list(getDatabase());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      return allSupplements;
    }
    return allSupplements.filter((s) => s.name.toLowerCase().includes(q));
  }, [allSupplements, query]);

  const trimmedQuery = query.trim();
  const showOther = trimmedQuery.length > 0;

  function selectGoal(goal: Goal) {
    update({ goal });
  }

  function selectCurated(s: Supplement) {
    const choice: SupplementChoice = {
      kind: 'curated',
      supplementId: s.id,
      type: s.type,
      name: s.name,
    };
    update({ supplement: choice });
  }

  function selectOther() {
    // Custom entries default to cumulative; the setup screen does not re-ask,
    // so default to the longer-horizon design which is the safer assumption for
    // an unknown supplement.
    const choice: SupplementChoice = { kind: 'other', name: trimmedQuery, type: 'cumulative' };
    update({ supplement: choice });
  }

  const selected = state.supplement;
  const canContinue = state.goal !== null && selected !== null;

  return (
    <Scaffold
      testID="goal-picker-screen"
      footer={
        <Button
          label="Set up experiment"
          testID="goal-continue"
          onPress={() => router.push('/experiment-setup')}
          disabled={!canContinue}
        />
      }
    >
      <View>
        <SectionHeader title="What are you hoping to improve?" />
        <View style={styles.chipRow}>
          {GOALS.map((goal) => (
            <Chip
              key={goal}
              testID={`goal-${goal}`}
              label={goalLabel(goal)}
              selected={state.goal === goal}
              onPress={() => selectGoal(goal)}
            />
          ))}
        </View>
      </View>

      <View style={styles.searchBlock}>
        <SectionHeader
          title="Pick a supplement"
          caption="Search the list, or add your own with “Other”."
        />
        <TextInput
          testID="supplement-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search supplements"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          style={styles.search}
        />
      </View>

      <View style={styles.list}>
        {filtered.map((s) => (
          <ListRow
            key={s.id}
            testID={`supplement-${s.id}`}
            title={s.name}
            subtitle={s.evidenceSummary}
            badge={s.type}
            selected={selected?.kind === 'curated' && selected.supplementId === s.id}
            onPress={() => selectCurated(s)}
          />
        ))}
        {showOther ? (
          <ListRow
            testID="supplement-other"
            title={`Other: “${trimmedQuery}”`}
            subtitle="Not in the list. No evidence summary is shown."
            selected={selected?.kind === 'other'}
            onPress={selectOther}
          />
        ) : null}
        {filtered.length === 0 && !showOther ? (
          <Text style={styles.empty}>No supplements match your search.</Text>
        ) : null}
      </View>
    </Scaffold>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  searchBlock: {
    gap: spacing.sm,
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  list: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  empty: {
    padding: spacing.lg,
    fontSize: fontSize.footnote,
    color: colors.textMuted,
    textAlign: 'center',
    backgroundColor: colors.surface,
  },
});
