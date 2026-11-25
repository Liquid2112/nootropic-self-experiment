import {
  QUIZ_QUESTIONS,
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

describe('planMilestones', () => {
  it('dates the baseline, start, halfway and verdict', () => {
    const m = planMilestones(new Date(2026, 10, 25), 28);
    expect(m.map((x) => x.date.getDate())).toEqual([25, 28, 12, 26]);
    expect(m[3]?.date.getMonth()).toBe(11);
  });
});
