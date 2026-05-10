/**
 * substrate/npc/marketplace.ts — NPC participation in the marketplace.
 *
 * Per AEGIS_BUILD_SPEC.md §11.3 + Phase 1 build brief task G.
 *
 * NPCs both publish (acting as suppliers — e.g., "data feed NPC sells
 * crime stats data") and subscribe (acting as buyers — e.g.,
 * "enterprise buyer NPC subscribes to Maria's drone insurance product").
 *
 * The marketplace UI does NOT visually distinguish NPCs from players
 * unless the dev-toggle is on (§8.6). This file's role is to translate
 * `NpcDecision` → marketplace API call.
 *
 * British English. No academy_*.
 */

import {
  cancel as marketCancel,
  discover,
  publishListing,
  subscribe as marketSubscribe,
  type ListingSpec,
  type MarketplaceListing,
  type MarketplaceSubscription,
} from '../marketplace';
import type { NpcDecision, NpcPersonaInstance } from '../types';

/** Translate an NpcDecision → marketplace action. */
export async function applyDecisionToMarketplace(
  npc: NpcPersonaInstance,
  decision: NpcDecision,
  /** All currently active subscriptions belonging to this NPC. */
  npcSubs: MarketplaceSubscription[],
): Promise<void> {
  switch (decision.kind) {
    case 'subscribe': {
      const listingId = decision.payload.listing_id as string;
      const tier = decision.payload.tier as string;
      const all = await discover({});
      const listing = all.find((l) => l.listing_id === listingId);
      if (!listing) return;
      const wallet = (npc.anchor_params.wallet_preference as 'personal' | 'company') ?? 'personal';
      try {
        await marketSubscribe({
          listing,
          tier,
          buyer: { kind: 'npc', id: npc.npc_id, wallet },
        });
      } catch {
        // Wallet/tier mismatch — skip silently, persona logic will retry next tick.
      }
      return;
    }
    case 'cancel': {
      const subId = decision.payload.sub_id as string;
      const sub = npcSubs.find((s) => s.sub_id === subId);
      if (sub) await marketCancel(sub, decision.rationale);
      return;
    }
    case 'publish_listing': {
      // NPC publishes a stock listing tied to a synthetic venture id.
      // Phase 1: lightweight competitor-desk listings to seed supply.
      const spec: ListingSpec = {
        title: `${npc.persona_kind} Reference Feed`,
        description: `Reference data feed published by ${npc.persona_kind} NPC.`,
        kind: 'subscription',
        pricing_tiers: [
          { id: 'standard', name: 'Standard', price: 99, accepts_wallets: ['personal', 'company'] },
        ],
        target_buyer: 'BOTH',
        domain: 'finance',
      };
      const listing: MarketplaceListing = await publishListing({
        attempt: {
          attempt_id: `npc-att-${npc.npc_id}`,
          venture_id: `npc-venture-${npc.npc_id}`,
          player_id: npc.npc_id,
          company_id: `npc-co-${npc.npc_id}`,
        },
        spec,
        seller: { kind: 'npc', id: npc.npc_id },
      });
      // Touch the listing so callers can discover it next tick.
      void listing;
      return;
    }
    case 'audit_objection':
    case 'evaluate':
    case 'noop':
    default:
      return;
  }
}
