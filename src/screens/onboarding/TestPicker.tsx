import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/brand';
import { tapLight } from '@/components/game';
import type { Goal } from '@/engines/onboarding';
import {
  canRemove,
  estimateMinutes,
  formatMinutes,
  LONG_ROUTINE_MINUTES,
  REQUIRED_TEST,
  TEST_CATALOG,
  TEST_IDS,
  toggleTest,
  type TestId,
} from '@/features/battery';
import { brand, fonts } from '@/ui';

/**
 * The battery picker on the setup screen: every test in the catalog as a row,
 * with what it measures and how long it takes. The goal's own test is locked
 * on; a running total keeps the daily time in view.
 */
export function TestPicker({
  goal,
  tests,
  onChange,
}: {
  goal: Goal;
  tests: TestId[];
  onChange: (tests: TestId[]) => void;
}) {
  const minutes = estimateMinutes(tests);
  const long = minutes > LONG_ROUTINE_MINUTES;

  return (
    <View style={styles.wrap} testID="test-picker">
      {TEST_IDS.map((id) => {
        const test = TEST_CATALOG[id];
        const on = tests.includes(id);
        const required = REQUIRED_TEST[goal] === id;
        const locked = on && !canRemove(goal, tests, id);
        return (
          <Pressable
            key={id}
            testID={`test-${id}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: locked }}
            accessibilityHint={required ? 'Needed for your goal' : undefined}
            onPress={() => {
              if (locked) return;
              tapLight();
              onChange(toggleTest(goal, tests, id));
            }}
            style={({ pressed }) => [styles.row, on ? styles.rowOn : null, pressed && !locked ? styles.rowPressed : null]}
          >
            <View style={[styles.badge, on ? styles.badgeOn : null]}>
              <Icon name={test.icon} size={20} color={on ? brand.ink : brand.muted} />
            </View>
            <View style={styles.text}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{test.name}</Text>
                {required ? (
                  <View style={styles.goalTag}>
                    <Text style={styles.goalTagText}>Your goal</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.meta}>{`${test.measures} · ${test.seconds}s`}</Text>
              {on ? <Text style={styles.blurb}>{test.blurb}</Text> : null}
            </View>
            <View style={[styles.check, on ? styles.checkOn : null]}>
              {required ? (
                <Icon name="lock" size={13} color={brand.white} />
              ) : on ? (
                <Icon name="check" size={14} color={brand.white} />
              ) : null}
            </View>
          </Pressable>
        );
      })}

      <View style={[styles.total, long ? styles.totalLong : null]}>
        <Icon name="clock" size={16} color={long ? brand.sunDeep : brand.ink} />
        <Text style={styles.totalText}>
          {`About ${formatMinutes(minutes)} a day · ${tests.length} tests + 3 quick ratings`}
        </Text>
      </View>
      {long ? (
        <Text style={styles.warn}>
          Longer check-ins are harder to keep up for four weeks. Most people do best around 2 minutes.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: brand.line,
    backgroundColor: brand.white,
  },
  rowOn: { borderColor: brand.ink, backgroundColor: brand.paper },
  rowPressed: { transform: [{ scale: 0.99 }] },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: brand.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOn: { backgroundColor: brand.lilac },
  text: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontFamily: fonts.semibold, color: brand.ink },
  goalTag: { backgroundColor: brand.tangSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  goalTagText: { fontSize: 11, fontFamily: fonts.semibold, color: brand.tangDeep },
  meta: { fontSize: 13, fontFamily: fonts.medium, color: brand.muted },
  blurb: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: brand.ink, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: brand.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: brand.ink, borderColor: brand.ink },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    backgroundColor: brand.paper,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  totalLong: { backgroundColor: brand.sunSoft },
  totalText: { fontSize: 13, fontFamily: fonts.semibold, color: brand.ink, flex: 1 },
  warn: { fontSize: 12, lineHeight: 17, fontFamily: fonts.regular, color: brand.sunDeep },
});
