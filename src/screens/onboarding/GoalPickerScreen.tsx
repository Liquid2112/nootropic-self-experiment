import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase, supplements, type Supplement } from '@/db';
import type { Goal, SupplementChoice } from '@/engines/onboarding';
import { GOALS, goalLabel } from '@/engines/onboarding';
import { Button, ListRow, Scaffold, brand, fonts } from '@/ui';
import { Icon, type IconName } from '@/brand';
import { tapLight } from '@/components/game';
import { useOnboarding } from './OnboardingContext';

const GOAL_ICON: Record<Goal, IconName> = {
  focus: 'target',
  memory: 'brain',
  calm: 'smile',
  sleep: 'moon',
};

const GOAL_HINT: Record<Goal, string> = {
  focus: 'Faster, steadier attention',
  memory: 'Hold more in mind',
  calm: 'Less wired, better mood',
  sleep: 'Wake up with more energy',
};

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
    tapLight();
    // A new goal starts from that goal's own default tests.
    update({ goal, battery: null });
  }

  function selectCurated(s: Supplement) {
    const choice: SupplementChoice = {
      kind: 'curated',
      supplementId: s.id,
      type: s.type,
      name: s.name,
    };
    tapLight();
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
      <View style={styles.stepHeader}>
        <Text style={styles.step}>Step 1 of 2</Text>
        <Text style={styles.title}>Pick your goal</Text>
        <Text style={styles.subtitle}>Then choose the supplement you want to put to the test.</Text>
      </View>

      <View style={styles.goalGrid}>
        {GOALS.map((goal) => {
          const on = state.goal === goal;
          return (
            <Pressable
              key={goal}
              testID={`goal-${goal}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={goalLabel(goal)}
              onPress={() => selectGoal(goal)}
              style={({ pressed }) => [styles.goal, on && styles.goalOn, pressed && styles.pressed]}
            >
              <View style={[styles.goalIcon, on && styles.goalIconOn]}>
                <Icon name={GOAL_ICON[goal]} size={22} color={brand.ink} />
              </View>
              <Text style={[styles.goalTitle, on && styles.goalTitleOn]}>{goalLabel(goal)}</Text>
              <Text style={[styles.goalHint, on && styles.goalHintOn]}>{GOAL_HINT[goal]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchBlock}>
        <Text style={styles.sectionTitle}>Supplement</Text>
        <Text style={styles.sectionCaption}>Search the list, or add your own with Other.</Text>
        <View style={styles.search}>
          <Icon name="search" size={18} color={brand.faint} />
          <TextInput
            testID="supplement-search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search supplements"
            placeholderTextColor={brand.faint}
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
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
            title={`Other: ${trimmedQuery}`}
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
  stepHeader: { gap: 6 },
  step: { fontSize: 13, fontFamily: fonts.semibold, color: brand.tangInk },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.7, fontFamily: fonts.display, color: brand.ink },
  subtitle: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, color: brand.muted },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goal: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: brand.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: brand.line,
    padding: 14,
    gap: 4,
  },
  goalOn: { backgroundColor: brand.ink, borderColor: brand.ink },
  pressed: { opacity: 0.7 },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  goalIconOn: { backgroundColor: brand.lilac },
  goalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: brand.ink },
  goalTitleOn: { color: brand.white },
  goalHint: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, color: brand.muted },
  goalHintOn: { color: 'rgba(255,255,255,0.7)' },
  searchBlock: { gap: 4, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontFamily: fonts.displayBold, color: brand.ink },
  sectionCaption: { fontSize: 13, fontFamily: fonts.regular, color: brand.muted, marginBottom: 8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: brand.white,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: brand.ink,
  },
  list: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  empty: {
    padding: 16,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.muted,
    textAlign: 'center',
  },
});
