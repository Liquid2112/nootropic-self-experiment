/**
 * Safety guardrail — persistence. Logging a bad reaction pauses the run (an
 * open adverse_event row); resuming or ending the run closes it. The experiment
 * row stays 'active' while paused, so the Today screen still finds it and shows
 * the paused state instead of a dose instruction.
 */
import type { SqlDriver } from '@/db/driver';
import { adverseEvents, experiments } from '@/db/repositories';
import type { AdverseEvent, ReactionSeverity } from '@/db/types';

export type LogReactionInput = {
  experimentId: string;
  severity: ReactionSeverity;
  dayIndex: number | null;
  now?: Date;
  id?: string;
};

function newId(now: Date): string {
  return `ae_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Record a bad reaction and pause the run. Returns the stored event. */
export function logBadReaction(db: SqlDriver, input: LogReactionInput): AdverseEvent {
  const now = input.now ?? new Date();
  const event: AdverseEvent = {
    id: input.id ?? newId(now),
    experimentId: input.experimentId,
    loggedAt: now.toISOString(),
    dayIndex: input.dayIndex,
    severity: input.severity,
    resolvedAt: null,
    resolution: null,
  };
  adverseEvents.insert(db, event);
  return event;
}

/** The event pausing this run, or null when it isn't paused. */
export function activePause(db: SqlDriver, experimentId: string): AdverseEvent | null {
  return adverseEvents.open(db, experimentId) ?? null;
}

/** Lift the pause. The days missed while paused stay as missed. */
export function resumeExperiment(db: SqlDriver, experimentId: string, now: Date = new Date()): void {
  adverseEvents.resolveAll(db, experimentId, 'resumed', now.toISOString());
}

/** Stop the run for good: closes the pause and marks the experiment abandoned. */
export function endExperimentForSafety(db: SqlDriver, experimentId: string, now: Date = new Date()): void {
  adverseEvents.resolveAll(db, experimentId, 'ended', now.toISOString());
  experiments.setStatus(db, experimentId, 'abandoned');
}
