/**
 * substrate/npc/scheduler.ts — async-by-default NPC scheduler.
 *
 * Mirrors `vendored/sentinel/daemon.py`'s pattern (§8.8):
 *   - Defensive try/except per persona so one bad decision can't
 *     crash the whole engine.
 *   - Configurable interval per persona.
 *   - Emits work into the job queue (non-blocking).
 *
 * Per AEGIS_BUILD_SPEC.md §8.7 + Phase 1 build brief task G.
 */

import type { MarketplaceListing, MarketplaceSubscription } from '../marketplace';
import type { NpcDecision, NpcPersonaInstance } from '../types';
import { decide } from './decisions';
import { enqueueDecisionJob, drain } from './jobQueue';

export interface SchedulerContext {
  listings: MarketplaceListing[];
  subscriptionsByNpc: Map<string, MarketplaceSubscription[]>;
  tick: number;
}

/** One scheduler step — enqueue a decision job per NPC, then drain. */
export async function runSchedulerTick(
  npcs: NpcPersonaInstance[],
  ctx: SchedulerContext,
): Promise<NpcDecision[]> {
  // Enqueue jobs.
  for (const npc of npcs) {
    enqueueDecisionJob(npc, { tick: ctx.tick });
  }

  // Drain — each job runs decide() with the given context.
  const result = await drain({
    handler: (job) => {
      try {
        return decide(job.npc, {
          listings: ctx.listings,
          subscriptions: ctx.subscriptionsByNpc.get(job.npc.npc_id) ?? [],
          tick: ctx.tick,
        });
      } catch (err) {
        // Sentinel-pattern defence: a thrown decision becomes a noop.
        return {
          kind: 'noop',
          severity: 'low',
          payload: { error: (err as Error)?.message ?? 'unknown' },
          rationale: 'Scheduler caught a thrown decision; defaulted to noop.',
          ts: Date.now(),
        } as NpcDecision;
      }
    },
  });
  return result.decisions;
}
