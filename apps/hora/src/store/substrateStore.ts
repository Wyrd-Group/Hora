/**
 * substrateStore.ts — Zustand store for Substrate Mode (Phase 1).
 *
 * Per AEGIS_BUILD_SPEC.md §16 + the Phase 1 build brief task A. Patterned
 * after `empireStore.ts` but isolated:
 *
 *   - Substrate currency is **isolated from Campaign** (§4.2).
 *     `substrateBalance` lives only in this store; the empire store's
 *     `companyBalance` / `personalBalance` never receive credits or
 *     debits from here.
 *
 *   - Every currency move calls the sinks layer (`substrate/economy/sinks.ts`)
 *     so the §4.5 fees / churn / upkeep / tax / agent-card-cost pipe
 *     emits `economy_sink_event` telemetry. Sinks are also where the
 *     inflation guard lives (§4.5).
 *
 *   - No academy_*, no ecfl_*, no `academy_promoted` flags. Per §4.1.
 *
 * State shape (per the build brief):
 *
 *   currentVenture       — the VentureAttempt the player is actively
 *                          working in (Athena chat / Briefings scope).
 *   myVentures           — every VentureAttempt the player owns.
 *   myListings           — every Listing the player has published.
 *   mySubscriptions      — every Subscription the player holds.
 *   substrateBalance     — Substrate-only currency.
 *   tosAccepted          — mirror of substrate_tos_acceptances; reduces
 *                          server round-trips on each render.
 *   npcDebugView         — dev toggle that distinguishes NPCs from real
 *                          players in marketplace surfaces (§8.6).
 *
 * Actions:
 *
 *   adoptVenture          — create a VentureAttempt + debit grant or
 *                           starting capital from substrateBalance.
 *   pivotVenture          — append a PivotEvent to a VentureAttempt.
 *   publishListing        — push a Listing record into myListings.
 *   cancelListing         — flip status to 'archived'.
 *   subscribeToListing    — create a Subscription record + first debit.
 *   cancelSubscription    — set canceled_at on the subscription.
 *   creditSubstrate       — credit balance, fire economy event.
 *   debitSubstrate        — debit balance, fire economy event.
 *
 * Persistence: persisted to localStorage via `createPersistedStore`.
 * Hydration restores the wallet, ToS state, and the local
 * VentureAttempt / Listing / Subscription mirrors so the UI works
 * offline (Phase 1 still talks to Supabase too — both layers stay in
 * sync).
 *
 * Ergonomics: actions are organised so consumers can do
 *   `useSubstrateStore((s) => s.adoptVenture)` without re-rendering on
 * every tick.
 */

import { createPersistedStore } from './createPersistedStore';
import type {
  Briefing,
  EconomySinkEvent,
  Listing,
  NpcPersonaInstance,
  PivotEvent,
  Subscription,
  VentureAttempt,
  WalletKind,
} from '../substrate/types';
import { recordEconomySink } from '../substrate/economy/sinks';

// ── Phase 1 default grant (§15 default 1) ──────────────────────────

/**
 * First-time Substrate Mode entrants get a one-off €50K grant from a
 * Substrate-only pool. Per AEGIS_BUILD_SPEC.md §15 default 1 + the
 * Phase 1 build brief task D.
 */
export const SUBSTRATE_FIRST_GRANT_AMOUNT = 50_000;

// ── State + actions ────────────────────────────────────────────────

export interface SubstrateState {
  // ── Player state ───────────────────────────────────────────────
  currentVenture: VentureAttempt | null;
  myVentures: VentureAttempt[];
  myListings: Listing[];
  mySubscriptions: Subscription[];

  /** Substrate-only currency. NOT linked to Campaign wallets per §4.2. */
  substrateBalance: number;

  /** Mirror of `substrate_tos_acceptances` for the current user. */
  tosAccepted: boolean;

  /** Dev toggle that visually distinguishes NPCs from real players. §8.6. */
  npcDebugView: boolean;

  /** Whether the first-entry grant has been credited (per §15 default 1). */
  firstGrantReceived: boolean;

  /** Local mirror of NPC instances for dev-only debug surfaces. */
  npcInstances: NpcPersonaInstance[];

  /** Local cache of briefings the player owns or is reading. */
  myBriefings: Briefing[];

  /**
   * Local audit trail of sink events. Server-side `economy_sink_events`
   * is the source of truth; this is a UI dressing buffer so dev
   * surfaces can show recent fee debits without a round-trip.
   */
  recentSinkEvents: EconomySinkEvent[];

  // ── Actions ─────────────────────────────────────────────────────

  /** Move funds in. Routes through the economy/sinks event recorder. */
  creditSubstrate: (amount: number, reason: string, partyId?: string) => void;
  /** Move funds out. Routes through the economy/sinks event recorder. */
  debitSubstrate: (amount: number, reason: string, partyId?: string) => void;

  /**
   * Adopt an NCOE venture into the player's company as a new spinout.
   * Debits the chosen capital from `substrateBalance` and creates a
   * VentureAttempt row.
   */
  adoptVenture: (params: {
    venture_id: string;
    player_id: string;
    company_id: string;
    starting_capital: number;
  }) => VentureAttempt;

  /** Append a PivotEvent to an existing VentureAttempt. */
  pivotVenture: (attempt_id: string, pivot: PivotEvent) => void;

  /** Switch the current scope (e.g. for Athena chat, Briefings). */
  setCurrentVenture: (attempt_id: string | null) => void;

  /** Publish a Listing from a venture into the marketplace. */
  publishListing: (listing: Listing) => void;
  /** Archive a listing the player owns. */
  cancelListing: (listing_id: string) => void;

  /** Subscribe to a listing (player-side). Routes a first-debit through sinks. */
  subscribeToListing: (params: {
    listing_id: string;
    seller_id: string;
    buyer_id: string;
    buyer_wallet_kind: WalletKind;
    tier: string;
    price: number;
  }) => Subscription;

  /** Cancel an active subscription. */
  cancelSubscription: (sub_id: string) => void;

  /** Settlement helper: per-tick subscription debit/credit pair. */
  recordSubscriptionTick: (params: {
    sub_id: string;
    buyer_id: string;
    seller_id: string;
    gross: number;
    net: number;
    fee: number;
  }) => void;

  /** Toggle NPC debug view. */
  setNpcDebugView: (enabled: boolean) => void;

  /** Mirror the server-side `substrate_tos_acceptances` row presence. */
  setTosAccepted: (accepted: boolean) => void;

  /**
   * Mark the first-entry grant credited. Idempotent — re-calls do not
   * re-credit. Returns true when this call performed the credit.
   */
  applyFirstGrantIfMissing: (player_id: string) => boolean;

  /** Replace the local NPC instance list (used by the NPC instantiator). */
  setNpcInstances: (npcs: NpcPersonaInstance[]) => void;

  /** Insert / update a Briefing the player owns. */
  upsertBriefing: (briefing: Briefing) => void;

  /** Append a sink event to the local audit ring buffer (max 200). */
  pushSinkEvent: (ev: EconomySinkEvent) => void;

  /** Reset to fresh state — used by tests. */
  resetToFresh: () => void;
}

// ── Defaults ───────────────────────────────────────────────────────

function getFreshSubstrateState() {
  return {
    currentVenture: null as VentureAttempt | null,
    myVentures: [] as VentureAttempt[],
    myListings: [] as Listing[],
    mySubscriptions: [] as Subscription[],
    substrateBalance: 0,
    tosAccepted: false,
    npcDebugView: false,
    firstGrantReceived: false,
    npcInstances: [] as NpcPersonaInstance[],
    myBriefings: [] as Briefing[],
    recentSinkEvents: [] as EconomySinkEvent[],
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  // Lightweight UUID-ish id; deterministic enough for tests.
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Store ──────────────────────────────────────────────────────────

export const useSubstrateStore = createPersistedStore<SubstrateState>(
  'substrate',
  (set, get) => ({
    ...getFreshSubstrateState(),

    // ── currency ────────────────────────────────────────────────
    creditSubstrate: (amount, reason, partyId) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      // Sinks layer records every move (positive or negative). For
      // pure credits the kind is the most descriptive available; we
      // use 'inflation_guard' as a benign no-fee marker when no
      // specific kind is given. The reason text disambiguates.
      const ev = recordEconomySink({
        kind: 'inflation_guard',
        amount,
        party_id: partyId ?? 'system',
        context: { direction: 'credit', reason },
      });
      set((s) => ({
        substrateBalance: s.substrateBalance + amount,
        recentSinkEvents: [ev, ...s.recentSinkEvents].slice(0, 200),
      }));
    },

    debitSubstrate: (amount, reason, partyId) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      const ev = recordEconomySink({
        kind: 'fee',
        amount,
        party_id: partyId ?? 'system',
        context: { direction: 'debit', reason },
      });
      set((s) => ({
        substrateBalance: s.substrateBalance - amount,
        recentSinkEvents: [ev, ...s.recentSinkEvents].slice(0, 200),
      }));
    },

    // ── ventures ────────────────────────────────────────────────
    adoptVenture: ({ venture_id, player_id, company_id, starting_capital }) => {
      const attempt: VentureAttempt = {
        attempt_id: makeId('att'),
        venture_id,
        player_id,
        company_id,
        started_at: nowIso(),
        status: 'in_progress',
        pieces: [],
        briefings: [],
        metrics: {
          total_revenue: 0,
          subscriber_count: 0,
          distinct_buyers: 0,
          customer_b2b_ratio: 0,
          retention_30d: 0,
        },
        pivots: [],
        athena_session_ids: [],
      };

      // Debit the starting capital from substrateBalance via the sink
      // recorder. Use kind:'card_cost' to flag this as a deliberate
      // capital expenditure in the audit trail.
      if (starting_capital > 0) {
        const ev = recordEconomySink({
          kind: 'card_cost',
          amount: starting_capital,
          party_id: player_id,
          context: { direction: 'debit', reason: 'venture_adopt', venture_id },
        });
        set((s) => ({
          substrateBalance: s.substrateBalance - starting_capital,
          recentSinkEvents: [ev, ...s.recentSinkEvents].slice(0, 200),
        }));
      }

      set((s) => ({
        myVentures: [attempt, ...s.myVentures],
        currentVenture: attempt,
      }));
      return attempt;
    },

    pivotVenture: (attempt_id, pivot) => {
      set((s) => ({
        myVentures: s.myVentures.map((v) =>
          v.attempt_id === attempt_id ? { ...v, pivots: [...v.pivots, pivot] } : v,
        ),
        currentVenture:
          s.currentVenture?.attempt_id === attempt_id
            ? { ...s.currentVenture, pivots: [...s.currentVenture.pivots, pivot] }
            : s.currentVenture,
      }));
    },

    setCurrentVenture: (attempt_id) => {
      if (!attempt_id) {
        set({ currentVenture: null });
        return;
      }
      const v = get().myVentures.find((x) => x.attempt_id === attempt_id) ?? null;
      set({ currentVenture: v });
    },

    // ── listings ────────────────────────────────────────────────
    publishListing: (listing) => {
      set((s) => ({ myListings: [listing, ...s.myListings] }));
    },

    cancelListing: (listing_id) => {
      set((s) => ({
        myListings: s.myListings.map((l) =>
          l.listing_id === listing_id ? { ...l, status: 'archived' as const } : l,
        ),
      }));
    },

    // ── subscriptions ───────────────────────────────────────────
    subscribeToListing: ({ listing_id, seller_id, buyer_id, buyer_wallet_kind, tier, price }) => {
      const sub: Subscription = {
        sub_id: makeId('sub'),
        listing_id,
        buyer_id,
        buyer_kind: 'player',
        buyer_wallet_kind,
        tier,
        started_at: nowIso(),
        canceled_at: null,
        last_settled_at: nowIso(),
      };
      // First-period debit through the sinks layer.
      const ev = recordEconomySink({
        kind: 'fee',
        amount: price,
        party_id: buyer_id,
        context: { direction: 'debit', reason: 'subscription_first_period', listing_id, seller_id },
      });
      set((s) => ({
        mySubscriptions: [sub, ...s.mySubscriptions],
        substrateBalance: s.substrateBalance - price,
        recentSinkEvents: [ev, ...s.recentSinkEvents].slice(0, 200),
      }));
      return sub;
    },

    cancelSubscription: (sub_id) => {
      set((s) => ({
        mySubscriptions: s.mySubscriptions.map((sub) =>
          sub.sub_id === sub_id ? { ...sub, canceled_at: nowIso() } : sub,
        ),
      }));
    },

    recordSubscriptionTick: ({ sub_id, buyer_id, seller_id, gross, net, fee }) => {
      const feeEv = recordEconomySink({
        kind: 'fee',
        amount: fee,
        party_id: seller_id,
        context: { reason: 'platform_fee', sub_id, gross, net },
      });
      set((s) => ({
        mySubscriptions: s.mySubscriptions.map((sub) =>
          sub.sub_id === sub_id ? { ...sub, last_settled_at: nowIso() } : sub,
        ),
        // If the player IS the buyer, the gross was debited from their
        // wallet at the call site; if the player IS the seller, the
        // net was credited. We track both via the sinks recorder; the
        // store-level balance update is left to the call site so the
        // marketplace settlement flow can apply it correctly per-tick.
        recentSinkEvents: [feeEv, ...s.recentSinkEvents].slice(0, 200),
        // Touch buyer_id so the linter doesn't strip it as unused —
        // it's part of the function signature for future expansion.
        ...((): Record<string, never> => {
          void buyer_id;
          return {} as Record<string, never>;
        })(),
      }));
    },

    // ── toggles ─────────────────────────────────────────────────
    setNpcDebugView: (enabled) => set({ npcDebugView: enabled }),
    setTosAccepted: (accepted) => set({ tosAccepted: accepted }),

    applyFirstGrantIfMissing: (player_id) => {
      if (get().firstGrantReceived) return false;
      const ev = recordEconomySink({
        kind: 'inflation_guard',
        amount: SUBSTRATE_FIRST_GRANT_AMOUNT,
        party_id: player_id,
        context: { reason: 'first_entry_grant', direction: 'credit' },
      });
      set((s) => ({
        substrateBalance: s.substrateBalance + SUBSTRATE_FIRST_GRANT_AMOUNT,
        firstGrantReceived: true,
        recentSinkEvents: [ev, ...s.recentSinkEvents].slice(0, 200),
      }));
      return true;
    },

    setNpcInstances: (npcs) => set({ npcInstances: npcs }),

    upsertBriefing: (briefing) => {
      set((s) => ({
        myBriefings: (() => {
          const idx = s.myBriefings.findIndex((b) => b.briefing_id === briefing.briefing_id);
          if (idx === -1) return [briefing, ...s.myBriefings];
          const next = s.myBriefings.slice();
          next[idx] = briefing;
          return next;
        })(),
      }));
    },

    pushSinkEvent: (ev) => {
      set((s) => ({ recentSinkEvents: [ev, ...s.recentSinkEvents].slice(0, 200) }));
    },

    resetToFresh: () => set(getFreshSubstrateState()),
  }),
);

export type { SubstrateState as SubstrateStoreState };
