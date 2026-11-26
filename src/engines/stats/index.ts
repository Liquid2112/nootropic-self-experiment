/**
 * Public surface of the stats engine. Pure, UI-free, database-free: callers
 * pass arrays of daily observations and get back effect estimates, confidence
 * intervals, effect sizes, and verdicts. See analyze.ts for the entry point.
 */

export * from './matrix';
export * from './ols';
export * from './hac';
export * from './metrics';
export * from './verdict';
export * from './analyze';
export * from './belief';
