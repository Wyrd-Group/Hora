/**
 * VentureSpec — Data contract between NCOE and AEGIS Empire.
 *
 * NCOE generates VentureSpec objects (one per startup idea). AEGIS reads them
 * and renders them as Venture Board cards inside Substrate Mode / Campaign.
 * AEGIS sends VentureAttempt telemetry back to Quadratic for compilation.
 *
 * SCOPE: This contract is for Substrate Mode only. Academy is a separate
 * AEGIS in-game mode with its own data model, its own curriculum, and its
 * own ECFL certification path — it does NOT cross this boundary. Content
 * generated inside Substrate Mode (Briefings, ventures, etc.) lives
 * entirely within Substrate Mode.
 *
 * The schema is the single source of truth — both Python (NCOE) and TypeScript
 * (AEGIS) sides MUST match. When updating, edit BOTH files in lockstep.
 */

// ── Toolkit categories ────────────────────────────────────────────

export type ToolkitKind =
  | "business_automation"   // workflow agent (e.g. fleet routing optimizer)
  | "ai_agent"              // an Athena variant tuned to a domain
  | "data_feed"             // curated/processed in-game data stream
  | "financial_product"     // contract: insurance, derivative, structured
  | "ui_panel"              // a custom panel/UI players see in-game
  | "substrate_briefing"    // short practical module — NOT ECFL-eligible
  | "trading_algorithm";    // automated trading logic

// (Academy / ECFL are intentionally NOT modelled here. They are pristine
// and live entirely outside this contract. This schema only describes
// Substrate Mode artefacts. There is no field in this contract that
// references, indexes, promotes to, or otherwise contaminates Academy
// content. If you find yourself reaching for one, you are in the wrong
// data model — Academy has its own.)


// ── Per-piece interface contract ──────────────────────────────────

export interface InterfaceSpec {
  /** Who can call/consume this piece. */
  visibility: "public" | "subscribers" | "owner_only";
  /** Whether other player-built code can invoke this piece. */
  callable_by_other_code: boolean;
  /** JSON Schema for input shape, when applicable. */
  input_schema?: object;
  /** JSON Schema for output shape, when applicable. */
  output_schema?: object;
  /** Min refresh / max latency, in seconds (data feeds, real-time pieces). */
  refresh_seconds_min?: number;
  /** Service-level expectation. */
  sla?: "best_effort" | "subscribed" | "premium";
}


// ── Implementation pieces ────────────────────────────────────────

export interface ToolkitPiece {
  /** Stable category identifier — see ToolkitKind. */
  kind: ToolkitKind;
  /** Short purpose phrase (e.g. "fleet routing optimizer"). */
  purpose: string;
  /** Whether the player MUST build this piece to ship the venture. */
  required: boolean;
  /** Player-facing explanation. */
  description?: string;
  /** Programmatic interface contract — only for code-bearing pieces. */
  interface?: InterfaceSpec;
}


// ── Substrate Briefings (player-generated educational content) ───

export interface SubstrateBriefingSpec {
  title: string;
  purpose: string;
  estimated_minutes: number;
  format: "5_min_read" | "interactive_module" | "video" | "scenario";
  /** Optional seed prompt Athena uses when co-creating with the player. */
  athena_prompt_seed?: string;
  // NOTE: Briefings live exclusively in Substrate Mode. They do not, and
  // will never, carry an Academy/ECFL eligibility flag. Academy content
  // is authored in a separate pipeline with its own governance.
}


// ── Win conditions / success criteria ────────────────────────────

export interface WinPredicate {
  /** Identifier the venture engine dispatches on. */
  type: string;
  /** Threshold/target — depends on `type`. */
  value: number | string;
  description?: string;
}

export interface WinConditions {
  /** Days until first in-game revenue counts as a "success". */
  first_revenue_within_days?: number;
  /** Days the venture must remain operational without abandoning. */
  survive_days?: number;
  /** revenue/cost ratio threshold for "profitable". */
  profitability_ratio_target?: number;
  /** Exit valuation as multiple of starting_capital. */
  exit_multiple_target?: number;
  /** Free-form additional predicates evaluated by the venture engine. */
  custom?: WinPredicate[];
}


// ── What gets logged for compilation later ───────────────────────

export interface TelemetryCapture {
  athena_chat_logs: boolean;
  code_versions: boolean;
  pricing_decisions: boolean;
  customer_telemetry: boolean;
  pivot_events: boolean;
  ui_iteration_count: boolean;
  per_piece_metrics: boolean;
  generation_metadata: boolean;
}


// ── Player contribution scoring (for spinout equity pool) ────────

/**
 * Weights MUST sum to 1.0. The Python side validates this at construction;
 * AEGIS should validate before posting to the Quadratic backend.
 */
export interface ContributionScoring {
  outcome_quality: number;
  originality: number;
  adoption_in_compile: number;
  peer_engagement: number;
  time_invested: number;
}


// ── Real-world spinout policy ────────────────────────────────────

export interface SpinoutPolicy {
  /** Whether this venture is eligible for real-world spinout at all. */
  spinout_eligible: boolean;
  /** Equity pool reserved for top contributors (0..1). E.g. 0.10 = 10%. */
  contributor_equity_pool: number;
  /** N players invited to the formal cap table on spinout. */
  top_contributors_invited: number;
  /**
   * Jurisdiction governing the spinout cap table.
   * Default "PT" (Portugal) given founder's incorporation choice.
   */
  jurisdiction: "PT" | "EE" | "US-DE" | "UK" | string;
}


// ── Source metadata (audit trail back to NCOE) ───────────────────

export interface VentureSource {
  pipeline: "ncoe_multi_agent";
  pipeline_version: string;
  domain: "optimization" | "software" | "engineering" | "chemistry"
        | "marketing" | "finance" | string;
  seed?: number;
  /** Hash of the input problem instance, if applicable. */
  problem_hash?: string;
}


// ── The top-level VentureSpec ────────────────────────────────────

export interface VentureSpec {
  venture_id: string;
  spec_version: "1.0";
  generated_at: string;     // ISO-8601 UTC
  source: VentureSource;

  // Player-facing summary
  pitch: string;
  description: string;
  market_summary: string;
  top_objections: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  starting_capital: number;
  target_eta_mvp_days: number;
  target_buyer: "B2B" | "B2C" | "BOTH";

  // What needs to be built
  implementation_pieces_required: ToolkitPiece[];
  implementation_pieces_optional: ToolkitPiece[];
  substrate_briefings: SubstrateBriefingSpec[];

  // Engine config
  win_conditions: WinConditions;
  telemetry_capture: TelemetryCapture;
  contribution_scoring: ContributionScoring;
  spinout_policy: SpinoutPolicy;

  tags: string[];
}


// ── AEGIS → Quadratic telemetry payloads ─────────────────────────

export interface ToolkitPieceAttempt {
  piece_kind: ToolkitKind;
  /** Hash of the latest in-game code/config for this piece. */
  artifact_hash: string;
  /** Number of versions iterated by the player. */
  version_count: number;
  last_updated_at: string;
  /** Per-piece performance metrics — keys depend on `piece_kind`. */
  metrics: Record<string, number>;
}

export interface SubstrateBriefingAttempt {
  briefing_id: string;
  title: string;
  format: SubstrateBriefingSpec["format"];
  avg_rating?: number;     // 0..5
  rating_count: number;
  views: number;
  /** Lifecycle within Substrate Mode (not Academy). */
  status: "draft" | "published" | "featured" | "archived";
}

export interface VentureMetrics {
  total_revenue: number;
  subscriber_count: number;
  first_revenue_at?: string;
  /** Distinct buyer entities (companies + personal wallets, deduped). */
  distinct_buyers: number;
  /** Fraction of revenue from B2B subscribers (0..1). */
  customer_b2b_ratio: number;
  /** 30-day customer retention (0..1). */
  retention_30d: number;
}

export interface PivotEvent {
  at: string;
  kind: "pricing" | "segment" | "packaging" | "gtm" | "feature";
  before: string;
  after: string;
  notes?: string;
}

export interface VentureAttempt {
  attempt_id: string;
  venture_id: string;
  player_id: string;
  /** AEGIS company ID used to develop this venture. */
  company_id: string;
  started_at: string;
  ended_at?: string;
  status: "in_progress" | "shipped" | "abandoned" | "failed" | "exited";
  pieces: ToolkitPieceAttempt[];
  briefings: SubstrateBriefingAttempt[];
  metrics: VentureMetrics;
  pivots: PivotEvent[];
  /** Computed by Quadratic's contribution scorer (0..1). */
  contribution_score?: number;
  /** Athena conversation IDs used during co-creation (for spec extraction). */
  athena_session_ids: string[];
}
