/**
 * Public surface of the results + evidence layer. The screens import from
 * "@/results": the adherence calendar model, the verdict wiring that runs the
 * stats engine and persists result rows, the evidence-card model, and the
 * shared compliance copy.
 */

export * from './compliance';
export * from './adherence';
export * from './cost';
export * from './verdict';
export * from './evidence';
