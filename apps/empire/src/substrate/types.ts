/**
 * substrate/types.ts — Type contract for Substrate Mode.
 *
 * This file is the AEGIS-side façade over the canonical NCOE data
 * contracts that live in `vendored/ncoe-contracts/`. All Substrate Mode
 * source code imports types from *here* — never directly from the
 * vendored path — so a future contract refresh only requires updating
 * the re-export list in this file (see AEGIS_BUILD_SPEC.md §6.2 +
 * §17.9).
 *
 * Two kinds of type live here:
 *
 *   1. **Re-exports** of the wire types from `venture_spec.ts`. These
 *      are what NCOE produces and AEGIS consumes — every field name,
 *      union member, and JSON shape mirrors the canonical contract
 *      exactly. Editing these means editing the upstream
 *      `venture_spec.ts`/`venture_spec.py` in lockstep per spec §7.
 *
 *   2. **AEGIS-only types** for state that never leaves this app:
 *      ToS acceptance rows, telemetry buffer rows, and the small
 *      AEGIS-side bookkeeping fields layered on top of `VentureAttempt`.
 *      These never appear on the wire to NCOE — anything new that
 *      *does* go on the wire must be added to the canonical contract
 *      first.
 *
 * Firewall reminder (spec §4.1): nothing in this file references,
 * imports from, or joins against Academy / ECFL types. If you find
 * yourself reaching for `academy_*` or `ecfl_*`, you're in the wrong
 * data model — Academy has its own.
 */

// ── 1. Re-exports from the vendored canonical contract ──────────────

// VENDORED-PATH: re-export only — the vendored types are imported via a
// relative path because they live outside `src/` and have no path alias.
// We do not modify the vendored file; we only surface the symbols.
export type {
  // Toolkit / piece primitives
  ToolkitKind,
  ToolkitPiece,
  InterfaceSpec,

  // Substrate Briefings (Substrate-only educational content per §5.7)
  SubstrateBriefingSpec,

  // Win conditions
  WinPredicate,
  WinConditions,

  // Telemetry capture flags (what NCOE asks AEGIS to record)
  TelemetryCapture,

  // Contribution scoring (computed downstream — AEGIS stores, never
  // surfaces a percentage to players per §4.4 / §13.3)
  ContributionScoring,

  // Spinout policy (KYC / cap-table flow — out-of-game per §13)
  SpinoutPolicy,

  // Source provenance
  VentureSource,

  // ── Top-level wire shapes ──
  VentureSpec,
  VentureAttempt,

  // VentureAttempt sub-shapes
  ToolkitPieceAttempt,
  SubstrateBriefingAttempt,
  VentureMetrics,
  PivotEvent,
} from '../../vendored/ncoe-contracts/venture_spec';

// ── 2. AEGIS-only types (never on the wire) ─────────────────────────

/**
 * One row in `substrate_tos_acceptances`. Per spec §4.3, every player
 * must accept the Substrate ToS once before entering the mode. The row
 * is the audit trail.
 */
export interface SubstrateTosAcceptance {
  /** Foreign key to `auth.users.id`. */
  user_id: string;
  /** ISO-8601 timestamp of acceptance. */
  accepted_at: string;
  /** ToS revision. Phase 0 ships `'v1'`; lawyer review per §4.4 will bump this. */
  tos_version: string;
}

/**
 * One row in `substrate_telemetry_events_buffer`. Local buffer for the
 * Phase 1 nightly batch upload to NCOE per spec §12.2.
 *
 * Phase 0 just stubs writes through `emit(...)`; Phase 1 owns the
 * transport flow.
 */
export interface SubstrateTelemetryEvent {
  /** Generated UUID at insert time. */
  id?: string;
  /** Foreign key to `auth.users.id`. */
  user_id: string;
  /** Pseudonymous token used in NCOE-bound payloads (§12.3). */
  player_pseudonym?: string | null;
  /** Event taxonomy key from `telemetry/events.ts`. */
  event_type: string;
  /** Event-specific payload — strongly typed in `telemetry/events.ts`. */
  payload: Record<string, unknown>;
  /** ISO-8601 server-side insert time. */
  created_at?: string;
  /** ISO-8601 timestamp set by the nightly upload worker (Phase 1+). */
  uploaded_at?: string | null;
}

/**
 * Substrate Mode-specific state layered over a server-side
 * `VentureAttempt` for the current player. Phase 0 stubs nothing
 * client-side beyond ToS state; Phase 1 will populate this from
 * Supabase + the brain.
 *
 * Kept here (not in `vendored/ncoe-contracts/`) because it never goes
 * back to NCOE — it is local UX bookkeeping.
 */
export interface SubstrateLocalAttemptState {
  attempt_id: string;
  /** Last time the local UI hydrated this attempt's pieces from server. */
  last_hydrated_at?: string;
  /** Pieces currently being authored / not yet published. */
  drafting_piece_kinds: string[];
}

// ── 3. Phase 0 root view state ──────────────────────────────────────

/**
 * The Phase 0 Substrate root view has only two surfaces: the ToS
 * interstitial and the "coming soon" placeholder. Phase 1 expands this.
 */
export type SubstratePhase0Surface = 'tos' | 'placeholder';

// ── 4. Phase 1 surfaces ────────────────────────────────────────────

/**
 * The Phase 1 Substrate root view rotates between five tabs (per build
 * brief task O):
 *   - ventures       — VentureList of mock NCOE ventures
 *   - my_ventures    — list of the player's VentureAttempts
 *   - marketplace    — Marketplace tabs ("My listings" / "Browse")
 *   - briefings      — BriefingComposer / BriefingViewer surface
 *   - athena         — AthenaSubstrate chat scoped to current venture
 */
export type SubstratePhase1Tab =
  | 'ventures'
  | 'my_ventures'
  | 'marketplace'
  | 'briefings'
  | 'athena';

// ── 5. Marketplace types ───────────────────────────────────────────

/** Wallets per spec §11.2. */
export type WalletKind = 'personal' | 'company';

/** Listing kinds per spec §11.1. */
export type ListingKind = 'one_time' | 'subscription' | 'usage_based';

/** Listing lifecycle. Phase 1 uses just active/archived. */
export type ListingStatus = 'active' | 'archived';

/** Pricing tier on a listing. */
export interface PricingTier {
  /** Stable id within the listing (e.g. `'starter'`, `'pro'`). */
  id: string;
  /** Player-facing label, e.g. "Starter". */
  name: string;
  /** Price per debit interval in Substrate currency. */
  price: number;
  /** Optional description / inclusions list. */
  description?: string;
  /** Wallet types this tier accepts. Per §11.2. */
  accepts_wallets: WalletKind[];
}

/** A listing published from a venture into the marketplace. */
export interface Listing {
  listing_id: string;
  /** Player or NPC user id. */
  seller_id: string;
  /** Whether the seller is a player or an NPC. Per §11.3. */
  seller_kind: 'player' | 'npc';
  /** The venture this listing came out of. */
  venture_id: string;
  /** Display title for the listing (player-facing). */
  title: string;
  /** Short description / pitch. */
  description: string;
  kind: ListingKind;
  pricing_tiers: PricingTier[];
  /** Optional handle for code-bearing listings (Phase 2+). */
  interface_handle?: string | null;
  status: ListingStatus;
  created_at: string;
  /** Domain tag for browse filters. */
  domain?: string;
  /** Target buyer type (B2B/B2C/BOTH). */
  target_buyer?: 'B2B' | 'B2C' | 'BOTH';
}

/** A subscription instance (player or NPC subscribing to a listing). */
export interface Subscription {
  sub_id: string;
  listing_id: string;
  buyer_id: string;
  buyer_kind: 'player' | 'npc';
  /** Wallet the buyer pays from. Per §11.2. */
  buyer_wallet_kind: WalletKind;
  /** Tier id within the listing. */
  tier: string;
  started_at: string;
  /** Null while active. */
  canceled_at: string | null;
  /** Last per-tick settlement timestamp. */
  last_settled_at: string | null;
}

// ── 6. NPC types ───────────────────────────────────────────────────

/** Five base personas per spec §8.2. */
export type NpcPersonaKind =
  | 'PriceSensitiveConsumer'
  | 'EnterpriseBuyer'
  | 'CompetitorDesk'
  | 'RegulatorAuditor'
  | 'DistributionChannel';

/**
 * One NPC instance. Anchored in a brain insight per spec §8.3 — the
 * `anchor_params` are the persona-specific knobs (segment, jurisdiction,
 * etc.) that get fed into `brain.getSharedInsight(...)` at decide time.
 */
export interface NpcPersonaInstance {
  npc_id: string;
  persona_kind: NpcPersonaKind;
  anchor_params: Record<string, unknown>;
  /** Substrate-only currency (isolated per §4.2). */
  balance_substrate: number;
  /** Personal wallet for B2C purchases. */
  balance_personal: number;
  /** Company wallet for B2B purchases. */
  balance_company: number;
  instantiated_at: string;
}

/** Discrete decision an NPC can take per tick. */
export type NpcDecisionKind =
  | 'subscribe'
  | 'cancel'
  | 'evaluate'
  | 'publish_listing'
  | 'audit_objection'
  | 'noop';

/**
 * What a persona's decide() / tick() function returns. Mirrors
 * Sentinel's Alert dataclass in shape — kind + severity + payload —
 * per spec §8.8 adaptation note.
 */
export interface NpcDecision {
  kind: NpcDecisionKind;
  severity: 'low' | 'medium' | 'high';
  payload: Record<string, unknown>;
  /** Free-form rationale (non-LLM in v1). */
  rationale: string;
  ts: number;
}

// ── 7. Briefings ───────────────────────────────────────────────────

/** Lifecycle states per §5.7 + §4.1 — NO academy_promoted, NO ecfl_eligible. */
export type BriefingStatus = 'draft' | 'published' | 'featured' | 'archived';

/** A Substrate Briefing — markdown educational content tied to a venture. */
export interface Briefing {
  briefing_id: string;
  venture_id: string;
  author_id: string;
  title: string;
  body_md: string;
  format: 'markdown' | '5_min_read' | 'interactive_module' | 'video' | 'scenario';
  status: BriefingStatus;
  created_at: string;
  updated_at: string;
}

// ── 8. Economy sinks ───────────────────────────────────────────────

/** Sink kinds per spec §4.5 / §17.8. */
export type EconomySinkKind =
  | 'churn'
  | 'fee'
  | 'upkeep'
  | 'tax'
  | 'card_cost'
  | 'inflation_guard';

/** One sink event — every currency move emits one of these. */
export interface EconomySinkEvent {
  event_id: string;
  kind: EconomySinkKind;
  amount: number;
  party_id: string;
  ts: number;
  context?: Record<string, unknown>;
}
