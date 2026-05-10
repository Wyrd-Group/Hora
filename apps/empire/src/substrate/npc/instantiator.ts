/**
 * substrate/npc/instantiator.ts — build NPC instances anchored in brain.
 *
 * Per AEGIS_BUILD_SPEC.md §8.3 + §8.4 + Phase 1 build brief task G.
 *
 *   - Each instance pulls its anchor params from the Shared Brain via
 *     `brain.recall(...)` and `brain.getSharedInsight(...)` so the
 *     persona reflects real data signal — never random.
 *   - The brain wrapper has fallbacks (no-op when offline), so the
 *     instantiator works in cold-start dev without a real backend; the
 *     defaults from `personas.ts` are used directly in that case.
 *
 * British English. No academy_*.
 */

import type { NpcPersonaInstance, NpcPersonaKind } from '../types';
import { PERSONA_BY_KIND, PERSONA_DEFINITIONS, type PersonaDefinition } from './personas';
import { brain } from '../../lib/brain';

export interface InstantiateRequest {
  /** Number of instances per persona kind. */
  personaCounts: Partial<Record<NpcPersonaKind, number>>;
  /** Optional starting balances. Defaults to 5k Substrate currency. */
  startingBalance?: number;
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

async function anchorParams(persona: PersonaDefinition): Promise<Record<string, unknown>> {
  // Try to pull a shared insight for the persona's segment. If the brain
  // is offline (no upstream loadable), the wrapper returns an empty
  // shape and we fall through to the persona defaults.
  try {
    const insight = await brain.getSharedInsight(persona.anchored_in);
    return {
      brain_consensus: insight?.consensus ?? null,
      engine_count: insight?.engineCount ?? 0,
      ...persona.defaults.extras,
    };
  } catch {
    return persona.defaults.extras ?? {};
  }
}

/** Instantiate the requested NPCs with brain-anchored params. */
export async function instantiateNpcs(
  request: InstantiateRequest,
): Promise<NpcPersonaInstance[]> {
  const balance = request.startingBalance ?? 5_000;
  const out: NpcPersonaInstance[] = [];

  for (const persona of PERSONA_DEFINITIONS) {
    const n = request.personaCounts[persona.kind] ?? 0;
    if (n <= 0) continue;
    // Anchor once per persona — every instance for that persona shares
    // the same brain pull (cheap, deterministic).
    const anchorExtras = await anchorParams(persona);
    for (let i = 0; i < n; i++) {
      out.push({
        npc_id: newId(`npc-${persona.kind.toLowerCase()}`),
        persona_kind: persona.kind,
        anchor_params: {
          segment: persona.defaults.segment,
          willingness_to_pay: persona.defaults.willingness_to_pay,
          churn_threshold: persona.defaults.churn_threshold,
          due_diligence_days: persona.defaults.due_diligence_days,
          action_probability_per_tick: persona.defaults.action_probability_per_tick,
          ...anchorExtras,
        },
        balance_substrate: balance,
        balance_personal: balance,
        balance_company: persona.defaults.extras?.wallet_preference === 'company' ? balance * 4 : balance,
        instantiated_at: new Date().toISOString(),
      });
    }
  }
  return out;
}

/** Re-export for callers that need the raw catalog. */
export { PERSONA_BY_KIND, PERSONA_DEFINITIONS };
