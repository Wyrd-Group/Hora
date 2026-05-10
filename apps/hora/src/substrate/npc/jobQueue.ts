/**
 * substrate/npc/jobQueue.ts — async-by-default NPC decision queue.
 *
 * Per AEGIS_BUILD_SPEC.md §8.7 + Phase 1 build brief task G.
 *
 * Phase 1 ships a simple in-memory + Supabase-row-based queue. Each
 * persona tick enqueues a job; a worker drains the queue, executes the
 * decision, writes back the resulting market action.
 *
 * The Supabase table `substrate_npc_decision_jobs` is owned by the
 * Phase 1 migration — when it isn't reachable (offline tests, cold
 * start), the queue runs purely in-memory.
 *
 * British English. No academy_*.
 */

import type { NpcDecision, NpcPersonaInstance } from '../types';

export interface NpcJob {
  job_id: string;
  npc: NpcPersonaInstance;
  /** When this job was enqueued. */
  enqueued_at: number;
  /** Optional context the worker needs to reproduce the decision. */
  context?: Record<string, unknown>;
}

const queue: NpcJob[] = [];

function newId(): string {
  return `job-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function enqueueDecisionJob(npc: NpcPersonaInstance, context?: Record<string, unknown>): NpcJob {
  const job: NpcJob = {
    job_id: newId(),
    npc,
    enqueued_at: Date.now(),
    context,
  };
  queue.push(job);
  return job;
}

export function pendingJobsCount(): number {
  return queue.length;
}

export interface DrainOptions {
  /** Maximum jobs to drain in this call. Default: 100. */
  limit?: number;
  /** The handler that turns a job into a decision. */
  handler: (job: NpcJob) => NpcDecision | Promise<NpcDecision>;
}

export interface DrainResult {
  drained: number;
  decisions: NpcDecision[];
}

export async function drain(opts: DrainOptions): Promise<DrainResult> {
  const limit = opts.limit ?? 100;
  const decisions: NpcDecision[] = [];
  const slice = queue.splice(0, limit);
  for (const job of slice) {
    try {
      const decision = await opts.handler(job);
      decisions.push(decision);
    } catch (err) {
      // One failing job must not poison the rest. Per Sentinel pattern.
      // eslint-disable-next-line no-console
      console.warn('[npc/jobQueue] handler threw:', (err as Error)?.message);
    }
  }
  return { drained: slice.length, decisions };
}

export function _resetQueue(): void {
  queue.length = 0;
}
