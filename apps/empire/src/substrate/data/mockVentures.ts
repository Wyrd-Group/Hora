/**
 * substrate/data/mockVentures.ts — eight mock VentureSpec payloads.
 *
 * Per AEGIS_BUILD_SPEC.md §5.2 + the Phase 1 build brief task B, NCOE
 * isn't running locally yet, so this file simulates the weekly drop of
 * ventures the L0.5 commercialisation layer would otherwise push into
 * AEGIS. Every record conforms to the canonical contract at
 * `vendored/ncoe-contracts/venture_spec.ts` (re-exported via
 * `substrate/types.ts`). When the real backend lights up, this file
 * gets replaced by an API fetch — the consumers (`VentureList.tsx`,
 * etc.) keep the same types.
 *
 * Distribution choices (per the brief):
 *   - 3 B2B + 3 B2C + 2 BOTH
 *   - difficulty mix 1..5
 *   - domains: optimisation, software, engineering, chemistry,
 *     marketing, finance
 *   - target_eta_mvp_days, starting_capital, top_objections,
 *     n_already_developing variety
 *
 * Note on `n_already_developing`: this is NOT a field on the canonical
 * `VentureSpec` contract — it's an AEGIS-side surfacing hint for the
 * Venture List ("Crowded" / "Active" / etc. labels per §5.2). We
 * attach it as a sibling field on the wrapper record so the list UI
 * can read it without polluting the wire contract. The wrapper type is
 * called `MockVentureRecord`.
 *
 * Firewall reminder (§4.1): no field here references academy_* /
 * ecfl_*. British English in player-facing copy.
 */

import type { VentureSpec } from '../types';

/**
 * Wrapper around `VentureSpec` that carries the AEGIS-side surfacing
 * hint `n_already_developing` (count of player ventures currently
 * working on this idea). The pure `VentureSpec` part is what crosses
 * the contract; the `n_already_developing` field is local UI dressing.
 */
export interface MockVentureRecord {
  spec: VentureSpec;
  /** AEGIS-side hint for Venture List qualitative surfacing. */
  n_already_developing: number;
}

const NOW = '2026-04-27T00:00:00Z';

// ── Helper: build a TelemetryCapture with everything on ────────────
const ALL_CAPTURE = {
  athena_chat_logs: true,
  code_versions: true,
  pricing_decisions: true,
  customer_telemetry: true,
  pivot_events: true,
  ui_iteration_count: true,
  per_piece_metrics: true,
  generation_metadata: true,
};

const BALANCED_SCORING = {
  outcome_quality: 0.35,
  originality: 0.20,
  adoption_in_compile: 0.20,
  peer_engagement: 0.15,
  time_invested: 0.10,
};

const PT_SPINOUT = {
  spinout_eligible: true,
  contributor_equity_pool: 0.10,
  top_contributors_invited: 5,
  jurisdiction: 'PT' as const,
};

// ── Records ────────────────────────────────────────────────────────

const ventures: MockVentureRecord[] = [
  // 1. B2B — optimisation — Demanding (4)
  {
    n_already_developing: 31,
    spec: {
      venture_id: 'mv-001-helios-cargo-routing',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'optimization', seed: 1001 },
      pitch: 'Helios Cargo Routing — mid-market fleet optimiser for European urban delivery firms.',
      description:
        'A SaaS platform that ingests delivery fleet GPS + order data and emits optimised routes hourly. Targets 50–500 vehicle operators where commercial route optimisers are too expensive but Excel + manual dispatch is too slow.',
      market_summary:
        'EU urban last-mile is fragmented; ~14k operators in this size band. Current alternatives: spreadsheets (free, slow) or enterprise tools (€2k/seat/month). Mid-band pricing of €170/seat/month is the validated wedge.',
      top_objections: [
        'Operators distrust black-box routing and need an explainable override.',
        'Existing TMS integrations are a slog — most operators run on bespoke ERP exports.',
        'Diesel cost volatility makes static optimisation models drift quickly.',
      ],
      difficulty: 4,
      starting_capital: 80_000,
      target_eta_mvp_days: 60,
      target_buyer: 'B2B',
      implementation_pieces_required: [
        { kind: 'business_automation', purpose: 'Route solver core', required: true },
        { kind: 'data_feed', purpose: 'GPS + order ingestion', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'ui_panel', purpose: 'Driver mobile dispatch view', required: false },
      ],
      substrate_briefings: [
        {
          title: 'Route Optimisation 101 for Dispatchers',
          purpose: 'Educate operators on solver explainability so they trust outputs.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 90,
        survive_days: 180,
        profitability_ratio_target: 1.4,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['logistics', 'optimisation', 'eu', 'mid-market'],
    },
  },

  // 2. B2C — software — Light (1)
  {
    n_already_developing: 0,
    spec: {
      venture_id: 'mv-002-budget-buddy',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'software', seed: 1002 },
      pitch: 'A weekly cash-flow nudge app for self-employed creatives.',
      description:
        'Reads bank transactions, surfaces the three numbers a freelancer actually needs (runway, owed VAT, available to pay self), and nudges weekly. No charts, no dashboards. Just three numbers on a Sunday morning.',
      market_summary:
        '4M+ self-employed creatives across the UK + EU. Existing accounting software (Xero, QuickBooks) over-serves; Notion templates under-serve. Sweet spot: £8/month, low-friction onboarding.',
      top_objections: [
        'Bank-data integrations break frequently; trust erodes fast on stale data.',
        'Freelancers are notoriously fragile payers — 3-month free trial is usually needed to convert.',
      ],
      difficulty: 1,
      starting_capital: 25_000,
      target_eta_mvp_days: 30,
      target_buyer: 'B2C',
      implementation_pieces_required: [
        { kind: 'ui_panel', purpose: 'Three-number weekly digest', required: true },
        { kind: 'data_feed', purpose: 'Open banking transaction ingest', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'substrate_briefing', purpose: 'Tax calendar primer', required: false },
      ],
      substrate_briefings: [
        {
          title: 'Reading Your Three Numbers',
          purpose: 'Plain-language guide to runway, owed VAT, and available-to-pay-self.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 45,
        survive_days: 120,
        profitability_ratio_target: 1.2,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['fintech', 'self-employed', 'consumer', 'uk-eu'],
    },
  },

  // 3. BOTH — engineering — Moderate (2)
  {
    n_already_developing: 7,
    spec: {
      venture_id: 'mv-003-drone-insurance',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'engineering', seed: 1003 },
      pitch: 'Per-flight drone insurance with telematics-priced premiums.',
      description:
        'Embedded in flight-planning tools: pilot files a flight plan, gets an instant quote priced on telemetry (weather, airspace, prior incidents). Single-flight cover for hobbyists; annual policies for commercial operators.',
      market_summary:
        'EU drone market growing ~22% YoY post-EASA Class C. Existing insurance is annual-only and over-priced for casual flyers. Commercial operators want telemetry-discounted premiums.',
      top_objections: [
        'Reinsurance partners are wary of new actuarial models without 3+ years of loss data.',
        'EASA regulatory shifts could invalidate pricing models mid-policy.',
        'Commercial fleet operators want fleet-level rather than per-flight pricing.',
      ],
      difficulty: 2,
      starting_capital: 50_000,
      target_eta_mvp_days: 45,
      target_buyer: 'BOTH',
      implementation_pieces_required: [
        { kind: 'financial_product', purpose: 'Per-flight policy contract', required: true },
        { kind: 'data_feed', purpose: 'Weather + airspace telemetry', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'ui_panel', purpose: 'Pilot quote-flow embed', required: false },
        { kind: 'business_automation', purpose: 'Claims triage agent', required: false },
      ],
      substrate_briefings: [
        {
          title: 'Drone Risk in Plain Language',
          purpose: 'Demystify telemetry-priced premiums for hobbyist pilots.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 60,
        survive_days: 180,
        profitability_ratio_target: 1.3,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['insurtech', 'drones', 'telematics', 'eu'],
    },
  },

  // 4. B2B — chemistry — Daunting (5)
  {
    n_already_developing: 1,
    spec: {
      venture_id: 'mv-004-formulation-suite',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'chemistry', seed: 1004 },
      pitch: 'Formulation lab agent for indie cosmetics chemists.',
      description:
        'AI-assisted formulation recommendation system that suggests stable surfactant + emulsifier combinations given target product properties (e.g. "cream, pH 5.5, fragrance-free, EU compliant"). Targets indie chemists who lack the budget for full LIMS.',
      market_summary:
        'Indie cosmetics ~€2.4B in EU; ~3k formulators in this band. Replaces hours of literature search with seconds of suggestion + safety check.',
      top_objections: [
        'Liability is high — a bad formulation suggestion can trigger product recalls.',
        'EU CPNP regulatory data is hard to keep current.',
        'Indie chemists are protective of formulations and slow to upload IP.',
      ],
      difficulty: 5,
      starting_capital: 120_000,
      target_eta_mvp_days: 90,
      target_buyer: 'B2B',
      implementation_pieces_required: [
        { kind: 'ai_agent', purpose: 'Formulation recommender', required: true },
        { kind: 'data_feed', purpose: 'CPNP + ingredient registry mirror', required: true },
        { kind: 'ui_panel', purpose: 'Lab notebook view', required: true },
      ],
      implementation_pieces_optional: [],
      substrate_briefings: [
        {
          title: 'CPNP Compliance: A Working Reference',
          purpose: 'Practical primer for indie chemists on EU registration.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 120,
        survive_days: 240,
        profitability_ratio_target: 1.5,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['chemistry', 'cosmetics', 'eu-regulated', 'ai-agent'],
    },
  },

  // 5. B2C — marketing — Heavy (4)
  {
    n_already_developing: 14,
    spec: {
      venture_id: 'mv-005-creator-clipper',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'marketing', seed: 1005 },
      pitch: 'Auto-clip generator that turns long-form livestreams into short-form social posts.',
      description:
        'A creator can upload (or live-stream into) the tool; it transcribes, identifies high-engagement segments, generates captions + thumbnails, and queues to TikTok / Reels / Shorts. Targets creators with > 5h/week of long-form content.',
      market_summary:
        '~600k EU creators with sustained long-form content. Existing tools (Opus, Vizard) start at $30/mo. Wedge: a € pricing tier + native EU tax handling.',
      top_objections: [
        'Existing US incumbents have model-quality lead from larger training corpora.',
        'Platform terms (TikTok, YouTube) shift quarterly and can deprecate features overnight.',
        'Creators are price-sensitive and churn fast on monthly billing.',
      ],
      difficulty: 4,
      starting_capital: 70_000,
      target_eta_mvp_days: 60,
      target_buyer: 'B2C',
      implementation_pieces_required: [
        { kind: 'ai_agent', purpose: 'Highlight detection + caption generation', required: true },
        { kind: 'business_automation', purpose: 'Multi-platform publishing pipeline', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'ui_panel', purpose: 'Highlight review queue', required: false },
        { kind: 'substrate_briefing', purpose: 'Short-form algorithm 101', required: false },
      ],
      substrate_briefings: [
        {
          title: 'Why Short-Form Beats Long-Form (For Now)',
          purpose: 'Honest take on platform incentive structures for creators.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 60,
        survive_days: 150,
        profitability_ratio_target: 1.25,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['creator-economy', 'ai', 'short-form', 'eu'],
    },
  },

  // 6. B2C — finance — Moderate (2)
  {
    n_already_developing: 4,
    spec: {
      venture_id: 'mv-006-pension-planner',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'finance', seed: 1006 },
      pitch: 'Cross-border pension planner for EU expatriates.',
      description:
        'Helps EU citizens with pension contributions split across multiple member states understand effective tax + transferability. Read-only tooling first; brokered transfers later.',
      market_summary:
        '~3M EU citizens with cross-border pension exposure. Underserved by national-only providers. Pricing: €15/month sub + per-event fee for brokered moves.',
      top_objections: [
        'Tax + pension regs vary materially across all 27 member states; coverage edge cases are huge.',
        'Brokered transfers are heavily regulated; the brokerage flow needs MiFID II review.',
        'Pension data is sensitive and requires GDPR-DPIA review per use case.',
      ],
      difficulty: 2,
      starting_capital: 35_000,
      target_eta_mvp_days: 45,
      target_buyer: 'B2C',
      implementation_pieces_required: [
        { kind: 'financial_product', purpose: 'Effective-rate calculator', required: true },
        { kind: 'ui_panel', purpose: 'Multi-jurisdiction summary', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'data_feed', purpose: 'Tax-treaty diff feed', required: false },
      ],
      substrate_briefings: [
        {
          title: 'Pension Portability in 5 Minutes',
          purpose: 'Plain-English summary of EU pension transferability rights.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 60,
        survive_days: 180,
        profitability_ratio_target: 1.3,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['fintech', 'pensions', 'expatriate', 'eu'],
    },
  },

  // 7. B2B — software — Demanding (3)
  {
    n_already_developing: 18,
    spec: {
      venture_id: 'mv-007-compliance-coach',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'software', seed: 1007 },
      pitch: 'GDPR + EU AI Act compliance coach for SMB operators.',
      description:
        'Inline coaching agent embedded in tools SMBs already use (Slack, Notion, GitHub). Surfaces compliance risk in plain language at the moment of action ("you are about to share a customer list externally — here is the lawful basis to check").',
      market_summary:
        'EU AI Act enforcement landing in 2026; ~280k EU SMBs in scope. Existing tools (OneTrust, etc.) start at €4k/month and require a compliance officer. Wedge: €99/month, no-officer-needed positioning.',
      top_objections: [
        'Compliance signal quality is hard — false positives create alert fatigue, false negatives create real fines.',
        'Many SMBs treat compliance as a tick-box rather than a strategic concern.',
        'Tooling integrations break with platform API changes.',
      ],
      difficulty: 3,
      starting_capital: 60_000,
      target_eta_mvp_days: 50,
      target_buyer: 'B2B',
      implementation_pieces_required: [
        { kind: 'ai_agent', purpose: 'Inline coaching agent', required: true },
        { kind: 'business_automation', purpose: 'Audit-trail recorder', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'ui_panel', purpose: 'Compliance dashboard', required: false },
      ],
      substrate_briefings: [
        {
          title: 'EU AI Act for Operators',
          purpose: 'What changes for an SMB after 2026 enforcement.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 75,
        survive_days: 200,
        profitability_ratio_target: 1.35,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['compliance', 'ai-act', 'gdpr', 'smb'],
    },
  },

  // 8. BOTH — finance — Demanding (3)
  {
    n_already_developing: 9,
    spec: {
      venture_id: 'mv-008-energy-hedger',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'finance', seed: 1008 },
      pitch: 'Energy-bill hedging product for households and small operators.',
      description:
        'Lets households + small operators lock in 6-month effective rates for electricity + gas via a structured-product wrapper. Settlement uses public day-ahead price indices; counterparty is the platform.',
      market_summary:
        'EU energy bills volatile through 2026 decommission cycle. Households + corner-shop operators are uniquely exposed. Existing hedging desks ignore this segment.',
      top_objections: [
        'Counterparty exposure scales fast in a bad winter — capital adequacy is non-trivial.',
        'BaFin and CMVM oversight differ on retail structured products.',
        'Pricing transparency is low — buyers will distrust without independent benchmarks.',
      ],
      difficulty: 3,
      starting_capital: 100_000,
      target_eta_mvp_days: 75,
      target_buyer: 'BOTH',
      implementation_pieces_required: [
        { kind: 'financial_product', purpose: '6-month rate-lock structured product', required: true },
        { kind: 'data_feed', purpose: 'Day-ahead price index mirror', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'trading_algorithm', purpose: 'Hedge book rebalancer', required: false },
      ],
      substrate_briefings: [
        {
          title: 'How Energy Hedging Actually Works',
          purpose: 'Plain primer on structured products for retail buyers.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 90,
        survive_days: 240,
        profitability_ratio_target: 1.4,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['energy', 'fintech', 'structured-products', 'retail'],
    },
  },

  // 9. B2B — engineering — Demanding (3) — Tessera Inspection
  {
    n_already_developing: 6,
    spec: {
      venture_id: 'mv-009-tessera-inspection',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'engineering', seed: 1009 },
      pitch: 'Computer-vision facade inspections for managing agents.',
      description:
        'Property managing agents upload drone or rope-access photos; the system flags spalling, render cracks, and water ingress with timestamped evidence. Generates Section 20 evidence packs and chases capex approvals.',
      market_summary:
        '~110k UK + EU managing agents handle facade inspection cycles; current spend is £3-12k per block per cycle. Wedge: software at £180/block/year + agent triage time.',
      top_objections: [
        'Surveyors gatekeep the diagnosis step and are unwilling to be overridden by software.',
        'Insurance underwriters want validated chains of evidence, not raw model output.',
        'Building stocks vary widely; one ML model rarely generalises across regions.',
      ],
      difficulty: 3,
      starting_capital: 65_000,
      target_eta_mvp_days: 55,
      target_buyer: 'B2B',
      implementation_pieces_required: [
        { kind: 'ai_agent', purpose: 'Defect-classifier vision model', required: true },
        { kind: 'business_automation', purpose: 'Section 20 evidence pack generator', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'ui_panel', purpose: 'Surveyor sign-off dashboard', required: false },
      ],
      substrate_briefings: [
        {
          title: 'Reading Facade Defects',
          purpose: 'Visual primer for managing agents on common defect classes.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 75,
        survive_days: 200,
        profitability_ratio_target: 1.35,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['proptech', 'computer-vision', 'compliance', 'b2b'],
    },
  },

  // 10. B2B — finance — Demanding (3) — Prism Signals (the canonical example)
  {
    n_already_developing: 11,
    spec: {
      venture_id: 'mv-010-prism-signals',
      spec_version: '1.0',
      generated_at: NOW,
      source: { pipeline: 'ncoe_multi_agent', pipeline_version: '0.9.1', domain: 'finance', seed: 1010 },
      pitch: 'Cross-asset signal feed for boutique systematic desks.',
      description:
        'Subscription feed of probabilistic signals across equities, FX, and rates, calibrated for desks running €5-50M AUM that cannot afford Bloomberg-tier analytics. Per-seat licensing with a focus on signal explainability.',
      market_summary:
        '~1.4k boutique systematic desks across the EU underserved by enterprise vendors. Existing seat-based feeds start at €1.2k/seat/month. Wedge: validated mid-band pricing of €170/seat/month.',
      top_objections: [
        'Trust takes a quarter of paper-traded data before a desk will fund-route a signal feed.',
        'Risk teams want full backtest provenance — the feed cannot ship as a black box.',
        'Customer concentration is high; losing one desk hurts disproportionately.',
      ],
      difficulty: 3,
      starting_capital: 75_000,
      target_eta_mvp_days: 60,
      target_buyer: 'B2B',
      implementation_pieces_required: [
        { kind: 'data_feed', purpose: 'Cross-asset signal feed core', required: true },
        { kind: 'trading_algorithm', purpose: 'Signal generator + confidence scoring', required: true },
      ],
      implementation_pieces_optional: [
        { kind: 'ui_panel', purpose: 'Signal-explainability dashboard', required: false },
        { kind: 'substrate_briefing', purpose: 'Signal QA in plain language', required: false },
      ],
      substrate_briefings: [
        {
          title: 'How To Read A Probabilistic Signal',
          purpose: 'Plain-English primer for systematic desks new to probabilistic outputs.',
          estimated_minutes: 5,
          format: '5_min_read',
        },
      ],
      win_conditions: {
        first_revenue_within_days: 90,
        survive_days: 240,
        profitability_ratio_target: 1.45,
      },
      telemetry_capture: ALL_CAPTURE,
      contribution_scoring: BALANCED_SCORING,
      spinout_policy: PT_SPINOUT,
      tags: ['fintech', 'systematic-trading', 'b2b', 'signals'],
    },
  },
];

export const MOCK_VENTURES: ReadonlyArray<MockVentureRecord> = ventures;

/** Map for direct id lookup. */
export const MOCK_VENTURES_BY_ID: ReadonlyMap<string, MockVentureRecord> = new Map(
  ventures.map((v) => [v.spec.venture_id, v]),
);

/** Convenience: just the specs, in deterministic order. */
export const MOCK_VENTURE_SPECS: ReadonlyArray<VentureSpec> = ventures.map((v) => v.spec);
