/**
 * substrate/marketplace/index.ts — Substrate-side marketplace wrapper.
 *
 * Per AEGIS_BUILD_SPEC.md §11 + §6.2 (vendor, don't modify) + Phase 1
 * build brief task F:
 *
 * The vendored `api/community-features.mjs` is a generic feature
 * marketplace. The Substrate marketplace adds three pieces of behaviour
 * on top of it:
 *
 *   1. **B2B vs B2C wallet semantics** (§11.2) — listings declare which
 *      wallet kinds each tier accepts; subscribe() picks the right
 *      wallet on the buyer.
 *
 *   2. **NPC participation** (§8 + §11.3) — NPCs can publish listings
 *      and subscribe; flagged via `actor.kind = 'npc'` everywhere.
 *
 *   3. **Substrate-currency isolation** (§4.2) — all transactions go
 *      through `substrate/economy/wallet.ts`, never Campaign wallets.
 *
 *   4. **Per-tick subscription debit/credit** (§11.1) — the AEGIS game
 *      tick calls `tickSubscriptions(currentTick)`; each active
 *      subscription debits the buyer (gross) and credits the seller
 *      (net = gross - platform fee, via `applyTransactionFee`).
 *
 * **Do NOT modify** `vendored/athena-standalone/api/community-features.mjs`.
 * All AEGIS-specific behaviour lives here.
 *
 * Firewall: no academy_*, no ecfl_*. British English in copy.
 */

import type { Listing, PricingTier, Subscription, WalletKind } from '../types';
import { applyChurnPressure, applyTransactionFee } from '../economy/sinks';
import { credit, debit } from '../economy/wallet';
import { emit, SUBSTRATE_EVENTS } from '../telemetry/events';

// ── Listing primitives ─────────────────────────────────────────────

export interface ListingSpec {
  title: string;
  description: string;
  kind: Listing['kind'];
  pricing_tiers: PricingTier[];
  domain?: string;
  target_buyer?: 'B2B' | 'B2C' | 'BOTH';
  /** Optional Phase 2 field. Hidden in the UI for now. */
  interface_handle?: string | null;
}

export interface MarketplaceListing extends Listing {}

export interface ListingFilters {
  domain?: string;
  target_buyer?: 'B2B' | 'B2C' | 'BOTH' | 'all';
  /** Filter by seller kind. Default: include both. */
  seller_kind?: 'player' | 'npc' | 'all';
}

export interface ListingsBackend {
  insert(listing: MarketplaceListing): Promise<void>;
  list(filters: ListingFilters): Promise<MarketplaceListing[]>;
  byId(id: string): Promise<MarketplaceListing | undefined>;
  setStatus(id: string, status: Listing['status']): Promise<void>;
}

export interface SubscriptionsBackend {
  insert(sub: MarketplaceSubscription): Promise<void>;
  list(buyer_id?: string): Promise<MarketplaceSubscription[]>;
  active(): Promise<MarketplaceSubscription[]>;
  setCanceled(sub_id: string, ts: string): Promise<void>;
  setLastSettled(sub_id: string, ts: string): Promise<void>;
}

export interface MarketplaceSubscription extends Subscription {
  /** Materialised price the per-tick settler debits. */
  tier_price: number;
  /** Snapshot of seller_id from the originating listing. */
  seller_id: string;
}

// ── In-memory default backend (used by tests + cold-start prototype) ─

class MemoryListingsBackend implements ListingsBackend {
  private rows = new Map<string, MarketplaceListing>();

  async insert(listing: MarketplaceListing): Promise<void> {
    this.rows.set(listing.listing_id, listing);
  }

  async list(filters: ListingFilters): Promise<MarketplaceListing[]> {
    const all = Array.from(this.rows.values()).filter((l) => l.status === 'active');
    return all.filter((l) => {
      if (filters.domain && filters.domain !== 'all' && l.domain !== filters.domain) return false;
      if (filters.target_buyer && filters.target_buyer !== 'all') {
        if (l.target_buyer && l.target_buyer !== filters.target_buyer && l.target_buyer !== 'BOTH')
          return false;
      }
      if (filters.seller_kind && filters.seller_kind !== 'all') {
        if (l.seller_kind !== filters.seller_kind) return false;
      }
      return true;
    });
  }

  async byId(id: string): Promise<MarketplaceListing | undefined> {
    return this.rows.get(id);
  }

  async setStatus(id: string, status: Listing['status']): Promise<void> {
    const cur = this.rows.get(id);
    if (cur) this.rows.set(id, { ...cur, status });
  }

  reset(): void {
    this.rows.clear();
  }
}

class MemorySubscriptionsBackend implements SubscriptionsBackend {
  private rows = new Map<string, MarketplaceSubscription>();

  async insert(sub: MarketplaceSubscription): Promise<void> {
    this.rows.set(sub.sub_id, sub);
  }

  async list(buyer_id?: string): Promise<MarketplaceSubscription[]> {
    const all = Array.from(this.rows.values());
    return buyer_id ? all.filter((s) => s.buyer_id === buyer_id) : all;
  }

  async active(): Promise<MarketplaceSubscription[]> {
    return Array.from(this.rows.values()).filter((s) => s.canceled_at === null);
  }

  async setCanceled(sub_id: string, ts: string): Promise<void> {
    const cur = this.rows.get(sub_id);
    if (cur) this.rows.set(sub_id, { ...cur, canceled_at: ts });
  }

  async setLastSettled(sub_id: string, ts: string): Promise<void> {
    const cur = this.rows.get(sub_id);
    if (cur) this.rows.set(sub_id, { ...cur, last_settled_at: ts });
  }

  reset(): void {
    this.rows.clear();
  }
}

// ── Module-level backends + backend swap ─────────────────────────────

let listingsBackend: ListingsBackend = new MemoryListingsBackend();
let subscriptionsBackend: SubscriptionsBackend = new MemorySubscriptionsBackend();

export function setListingsBackend(b: ListingsBackend): void {
  listingsBackend = b;
}
export function setSubscriptionsBackend(b: SubscriptionsBackend): void {
  subscriptionsBackend = b;
}

/** Reset the default in-memory backends — for tests + cold-start probes. */
export function _resetMarketplaceMemory(): void {
  if (listingsBackend instanceof MemoryListingsBackend) listingsBackend.reset();
  if (subscriptionsBackend instanceof MemorySubscriptionsBackend) subscriptionsBackend.reset();
}

// ── Helpers ─────────────────────────────────────────────────────────

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Public API ──────────────────────────────────────────────────────

export interface VentureAttemptLite {
  attempt_id: string;
  venture_id: string;
  player_id: string;
  company_id: string;
}

export interface SellerActor {
  kind: 'player' | 'npc';
  id: string;
}

export interface BuyerActor {
  kind: 'player' | 'npc';
  id: string;
  wallet: WalletKind;
}

/**
 * Publish a listing into the marketplace.
 *
 * Wraps the vendored community-features behaviour with the AEGIS
 * Substrate-specific fields (seller_kind, target_buyer, wallet
 * acceptance per tier).
 */
export async function publishListing(params: {
  attempt: VentureAttemptLite;
  spec: ListingSpec;
  seller: SellerActor;
}): Promise<MarketplaceListing> {
  const { attempt, spec, seller } = params;
  const listing: MarketplaceListing = {
    listing_id: newId('lst'),
    seller_id: seller.id,
    seller_kind: seller.kind,
    venture_id: attempt.venture_id,
    title: spec.title,
    description: spec.description,
    kind: spec.kind,
    pricing_tiers: spec.pricing_tiers,
    interface_handle: spec.interface_handle ?? null,
    status: 'active',
    created_at: nowIso(),
    domain: spec.domain,
    target_buyer: spec.target_buyer,
  };
  await listingsBackend.insert(listing);
  void emit(SUBSTRATE_EVENTS.PIECE_PUBLISHED, {
    venture_id: attempt.venture_id,
    piece_kind: 'business_automation',
    listing_id: listing.listing_id,
    pricing_tiers: spec.pricing_tiers as unknown as Array<Record<string, unknown>>,
  });
  return listing;
}

/** Discover listings — filterable browse. */
export async function discover(filters: ListingFilters = {}): Promise<MarketplaceListing[]> {
  return listingsBackend.list(filters);
}

/** Subscribe a buyer (player or NPC) to a listing's tier. */
export async function subscribe(params: {
  listing: MarketplaceListing;
  tier: string;
  buyer: BuyerActor;
}): Promise<MarketplaceSubscription> {
  const { listing, tier, buyer } = params;
  const tierSpec = listing.pricing_tiers.find((t) => t.id === tier) ?? listing.pricing_tiers[0];
  if (!tierSpec) throw new Error(`Listing ${listing.listing_id} has no pricing tiers.`);

  // Wallet acceptance check per §11.2.
  if (tierSpec.accepts_wallets && tierSpec.accepts_wallets.length > 0) {
    if (!tierSpec.accepts_wallets.includes(buyer.wallet)) {
      throw new Error(
        `Tier ${tier} does not accept ${buyer.wallet} wallet — try a different tier.`,
      );
    }
  }

  const sub: MarketplaceSubscription = {
    sub_id: newId('sub'),
    listing_id: listing.listing_id,
    buyer_id: buyer.id,
    buyer_kind: buyer.kind,
    buyer_wallet_kind: buyer.wallet,
    tier: tierSpec.id,
    started_at: nowIso(),
    canceled_at: null,
    last_settled_at: nowIso(),
    tier_price: tierSpec.price,
    seller_id: listing.seller_id,
  };
  await subscriptionsBackend.insert(sub);

  // First-period settlement runs in the same path as per-tick.
  settleOne(sub);

  void emit(SUBSTRATE_EVENTS.SUBSCRIPTION_CREATED, {
    venture_id: listing.venture_id,
    listing_id: listing.listing_id,
    buyer_kind: buyer.kind,
    buyer_id: buyer.id,
    tier: tierSpec.id,
  });

  return sub;
}

/** Cancel a subscription. Future settlements skipped. */
export async function cancel(sub: MarketplaceSubscription, reason?: string): Promise<void> {
  const ts = nowIso();
  await subscriptionsBackend.setCanceled(sub.sub_id, ts);
  void emit(SUBSTRATE_EVENTS.SUBSCRIPTION_CANCELED, {
    venture_id: '',
    listing_id: sub.listing_id,
    buyer_id: sub.buyer_id,
    reason,
  });
}

/**
 * Per-tick settlement run — called from the AEGIS game loop. Iterates
 * every active subscription, applies the platform fee, debits buyer +
 * credits seller, and emits `transaction_settled` telemetry.
 *
 * Returns aggregate counts for the tick so UI / dev tools can display
 * settlement outcomes.
 */
export interface TickResult {
  tick: number;
  settled: number;
  churned: number;
  totalGross: number;
  totalNet: number;
  totalFees: number;
}

export async function tickSubscriptions(
  currentTick: number,
  options?: {
    /** Optional churn driver — defaults to the §4.5 model. */
    shouldChurn?: (sub: MarketplaceSubscription) => boolean;
  },
): Promise<TickResult> {
  const active = await subscriptionsBackend.active();
  let settled = 0;
  let churned = 0;
  let totalGross = 0;
  let totalNet = 0;
  let totalFees = 0;

  for (const sub of active) {
    // Churn check — default uses the spec §4.5 churn model.
    const shouldChurn = options?.shouldChurn
      ? options.shouldChurn(sub)
      : Math.random() < applyChurnPressure(sub, sub.tier_price);
    if (shouldChurn) {
      await cancel(sub, 'tick_churn');
      churned++;
      continue;
    }

    settleOne(sub);
    settled++;
    totalGross += sub.tier_price;
    const { net, fee } = applyTransactionFee(sub.tier_price, 'platform');
    totalNet += net;
    totalFees += fee;

    await subscriptionsBackend.setLastSettled(sub.sub_id, nowIso());
  }

  return { tick: currentTick, settled, churned, totalGross, totalNet, totalFees };
}

/** Settle one subscription — buyer debit + seller credit + telemetry. */
function settleOne(sub: MarketplaceSubscription): void {
  // Buyer pays gross from chosen wallet.
  debit(sub.buyer_id, sub.tier_price, 'subscription_settle', sub.buyer_wallet_kind);
  // Platform fee comes off the seller's net (per §4.5 — fee debited from seller).
  const { net } = applyTransactionFee(sub.tier_price, 'platform');
  // Seller is credited net to their company wallet by default; if they
  // are an NPC publisher we still credit them so accounting holds. The
  // marketplace UI surfaces net, not gross, when the seller views.
  credit(sub.seller_id, net, 'subscription_settle_net', 'company');
  void emit(SUBSTRATE_EVENTS.TRANSACTION_SETTLED, {
    venture_id: '',
    amount: sub.tier_price,
    parties: { from_id: sub.buyer_id, to_id: sub.seller_id },
  });
}
