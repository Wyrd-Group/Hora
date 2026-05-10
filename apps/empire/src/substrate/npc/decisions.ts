/**
 * substrate/npc/decisions.ts — deterministic NPC decision logic.
 *
 * Per AEGIS_BUILD_SPEC.md §8.4 + §8.7 + Phase 1 build brief task G.
 *
 *   - Rules first (cheap), LLM only when context warrants — Phase 1
 *     ships only the rule path. The optional LLM hook is documented
 *     for Phase 2 but not invoked here.
 *   - Returns an `NpcDecision` (kind, severity, payload, recommendation,
 *     ts) — same shape as Sentinel's `Alert` dataclass.
 *
 * British English. No academy_* couplings.
 */

import type { MarketplaceListing, MarketplaceSubscription } from '../marketplace';
import type { NpcDecision, NpcPersonaInstance, NpcPersonaKind } from '../types';

export interface DecisionContext {
  /** Active listings the NPC can see. */
  listings: MarketplaceListing[];
  /** Subscriptions the NPC currently holds. */
  subscriptions: MarketplaceSubscription[];
  /** Current tick number. */
  tick: number;
}

// ── Per-persona rule heads ──────────────────────────────────────────

function decidePriceSensitiveConsumer(
  npc: NpcPersonaInstance,
  ctx: DecisionContext,
): NpcDecision {
  const wtp = (npc.anchor_params.willingness_to_pay as number) ?? 12;
  const churnT = (npc.anchor_params.churn_threshold as number) ?? 18;

  // First, see if we should churn out of any current subscription.
  for (const sub of ctx.subscriptions) {
    if (sub.tier_price > churnT) {
      return {
        kind: 'cancel',
        severity: 'medium',
        payload: { sub_id: sub.sub_id },
        rationale: `Price ${sub.tier_price} exceeds churn threshold ${churnT}.`,
        ts: Date.now(),
      };
    }
  }

  // Otherwise consider B2C / 'personal' wallet listings within wtp.
  const candidates = ctx.listings.filter((l) =>
    (l.target_buyer === 'B2C' || l.target_buyer === 'BOTH') &&
    l.pricing_tiers.some(
      (t) => t.accepts_wallets.includes('personal') && t.price <= wtp,
    ),
  );
  if (candidates.length === 0) {
    return { kind: 'noop', severity: 'low', payload: {}, rationale: 'No affordable B2C listing.', ts: Date.now() };
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const tier =
    pick.pricing_tiers.find((t) => t.price <= wtp && t.accepts_wallets.includes('personal'))!;
  return {
    kind: 'subscribe',
    severity: 'low',
    payload: { listing_id: pick.listing_id, tier: tier.id },
    rationale: `B2C listing at €${tier.price} within WTP €${wtp}.`,
    ts: Date.now(),
  };
}

function decideEnterpriseBuyer(
  npc: NpcPersonaInstance,
  ctx: DecisionContext,
): NpcDecision {
  const wtp = (npc.anchor_params.willingness_to_pay as number) ?? 200;
  const churnT = (npc.anchor_params.churn_threshold as number) ?? 320;

  for (const sub of ctx.subscriptions) {
    if (sub.tier_price > churnT) {
      return {
        kind: 'cancel',
        severity: 'medium',
        payload: { sub_id: sub.sub_id },
        rationale: 'Risk team flagged price spike. Cancelling.',
        ts: Date.now(),
      };
    }
  }

  const candidates = ctx.listings.filter(
    (l) =>
      (l.target_buyer === 'B2B' || l.target_buyer === 'BOTH') &&
      l.pricing_tiers.some(
        (t) => t.accepts_wallets.includes('company') && t.price <= wtp,
      ),
  );
  if (candidates.length === 0) {
    return { kind: 'evaluate', severity: 'low', payload: {}, rationale: 'No B2B listing meets WTP.', ts: Date.now() };
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const tier = pick.pricing_tiers.find(
    (t) => t.price <= wtp && t.accepts_wallets.includes('company'),
  )!;
  return {
    kind: 'subscribe',
    severity: 'medium',
    payload: { listing_id: pick.listing_id, tier: tier.id },
    rationale: `B2B listing at €${tier.price}/seat — within budget €${wtp}.`,
    ts: Date.now(),
  };
}

function decideCompetitorDesk(
  _npc: NpcPersonaInstance,
  _ctx: DecisionContext,
): NpcDecision {
  // Phase 1 stub: emit a publish_listing intent at low frequency. The
  // marketplace tick will sample these and the prototype runs without
  // them in the loop.
  return {
    kind: 'publish_listing',
    severity: 'low',
    payload: { mimic: true },
    rationale: 'Competitor desk shadows player pricing.',
    ts: Date.now(),
  };
}

function decideRegulatorAuditor(
  _npc: NpcPersonaInstance,
  ctx: DecisionContext,
): NpcDecision {
  if (ctx.listings.length === 0) {
    return { kind: 'noop', severity: 'low', payload: {}, rationale: 'No listing to audit.', ts: Date.now() };
  }
  const target = ctx.listings[Math.floor(Math.random() * ctx.listings.length)];
  return {
    kind: 'audit_objection',
    severity: 'high',
    payload: { listing_id: target.listing_id },
    rationale: 'Compliance review flag — manual investigation requested.',
    ts: Date.now(),
  };
}

function decideDistributionChannel(
  npc: NpcPersonaInstance,
  ctx: DecisionContext,
): NpcDecision {
  // Aggregator: subscribes to at most one listing at a time at a
  // negotiated margin.
  if (ctx.subscriptions.length > 0) {
    return { kind: 'noop', severity: 'low', payload: {}, rationale: 'Already aggregating.', ts: Date.now() };
  }
  const wtp = (npc.anchor_params.willingness_to_pay as number) ?? 80;
  const margin = (npc.anchor_params.demands_margin as number) ?? 0.20;
  const adjustedWtp = wtp * (1 - margin);
  const candidates = ctx.listings.filter((l) =>
    l.pricing_tiers.some((t) => t.price <= adjustedWtp),
  );
  if (candidates.length === 0) {
    return { kind: 'noop', severity: 'low', payload: {}, rationale: 'No listing meets margin requirement.', ts: Date.now() };
  }
  const pick = candidates[0];
  const tier = pick.pricing_tiers.find((t) => t.price <= adjustedWtp)!;
  return {
    kind: 'subscribe',
    severity: 'medium',
    payload: { listing_id: pick.listing_id, tier: tier.id },
    rationale: `Aggregator subscribes at €${tier.price} after ${(margin * 100).toFixed(0)}% margin.`,
    ts: Date.now(),
  };
}

// ── Dispatcher ──────────────────────────────────────────────────────

export function decide(npc: NpcPersonaInstance, ctx: DecisionContext): NpcDecision {
  // Action-probability gate per persona.
  const p = (npc.anchor_params.action_probability_per_tick as number) ?? 0.10;
  if (Math.random() > p) {
    return { kind: 'noop', severity: 'low', payload: {}, rationale: 'Action probability not met this tick.', ts: Date.now() };
  }
  try {
    switch (npc.persona_kind as NpcPersonaKind) {
      case 'PriceSensitiveConsumer':
        return decidePriceSensitiveConsumer(npc, ctx);
      case 'EnterpriseBuyer':
        return decideEnterpriseBuyer(npc, ctx);
      case 'CompetitorDesk':
        return decideCompetitorDesk(npc, ctx);
      case 'RegulatorAuditor':
        return decideRegulatorAuditor(npc, ctx);
      case 'DistributionChannel':
        return decideDistributionChannel(npc, ctx);
      default:
        return { kind: 'noop', severity: 'low', payload: {}, rationale: 'Unknown persona kind.', ts: Date.now() };
    }
  } catch (err) {
    // Sentinel-pattern defensive try/catch — one bad decision doesn't
    // crash the engine.
    return {
      kind: 'noop',
      severity: 'low',
      payload: { error: (err as Error)?.message ?? 'unknown' },
      rationale: 'Decision threw; defaulting to noop per Sentinel pattern.',
      ts: Date.now(),
    };
  }
}
