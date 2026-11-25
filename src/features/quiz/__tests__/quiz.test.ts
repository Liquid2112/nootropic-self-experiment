import {
  QUIZ_QUESTIONS,
  baselinePercentile,
  planMilestones,
  quizGoal,
  quizTestWindow,
  stakesLine,
  yearlySpend,
} from '..';

describe('quiz', () => {
  it('has 8 questions with unique ids and at least 3 options each', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(8);
    expect(new Set(QUIZ_QUESTIONS.map((q) => q.id)).size).toBe(8);
    for (const q of QUIZ_QUESTIONS) expect(q.options.length).toBeGreaterThanOrEqual(3);
  });

  it('maps answers onto the experiment setup', () => {
    expect(quizGoal({ goal: 'memory' })).toBe('memory');
    expect(quizGoal({})).toBeNull();
    expect(quizTestWindow({ peak: 'evening' })).toBe('evening');
  });

  it('turns spend into a yearly figure and a stakes line', () => {
    expect(yearlySpend({ spend: '25_75' })).toBe(600);
    expect(yearlySpend({})).toBeNull();
    expect(stakesLine({ spend: '75_150', confidence: 'feel_it' })).toContain('$1,320 a year');
    expect(stakesLine({ confidence: 'no_idea' })).toContain('your money');
  });
});

describe('baselinePercentile', () => {
  it('centres on 300 ms and is monotone, clamped to 1..99', () => {
    expect(baselinePercentile(300)).toBe(50);
    expect(baselinePercentile(250)).toBeGreaterThan(80);
    expect(baselinePercentile(360)).toBeLessThan(15);
    expect(baselinePercentile(100)).toBe(99);
    expect(baselinePercentile(900)).toBe(1);
  });
});

describe('planMilestones', () => {
  it('dates the baseline, start, halfway and verdict', () => {
    const m = planMilestones(new Date(2026, 10, 25), 28);
    expect(m.map((x) => x.date.getDate())).toEqual([25, 28, 12, 26]);
    expect(m[3]?.date.getMonth()).toBe(11);
  });
});
