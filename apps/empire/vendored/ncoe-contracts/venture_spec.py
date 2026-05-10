"""
VentureSpec — Python dataclasses mirroring contracts/venture_spec.ts.

This is the NCOE side of the data contract with AEGIS. NCOE constructs
``VentureSpec`` instances and serialises them to JSON; AEGIS consumes the JSON
via the TypeScript types in venture_spec.ts.

SCOPE: This contract is for Substrate Mode only. Academy is a separate
AEGIS in-game mode with its own data model, its own curriculum, and its
own ECFL certification path. **Academy MUST stay pristine** — no field
in this schema references, indexes, or promotes content into Academy.
If you need to express anything Academy-related, you are in the wrong
data model.

Validation rules enforced here:
    - ContributionScoring weights must sum to 1.0
    - SpinoutPolicy.contributor_equity_pool must be in [0, 1)
    - difficulty must be 1..5

When updating: keep this file and venture_spec.ts in lockstep — same
field names, same enum values, same defaults where they appear.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal, Optional


# ── Enums (mirrored as Literals for typing) ──────────────────────

ToolkitKind = Literal[
    "business_automation",
    "ai_agent",
    "data_feed",
    "financial_product",
    "ui_panel",
    "substrate_briefing",
    "trading_algorithm",
]

VisibilityKind = Literal["public", "subscribers", "owner_only"]
SLALevel = Literal["best_effort", "subscribed", "premium"]
BriefingFormat = Literal[
    "5_min_read", "interactive_module", "video", "scenario"]
BriefingStatus = Literal["draft", "published", "featured", "archived"]
TargetBuyer = Literal["B2B", "B2C", "BOTH"]
PivotKind = Literal["pricing", "segment", "packaging", "gtm", "feature"]
AttemptStatus = Literal[
    "in_progress", "shipped", "abandoned", "failed", "exited"]


# ── InterfaceSpec ────────────────────────────────────────────────

@dataclass
class InterfaceSpec:
    visibility: VisibilityKind = "public"
    callable_by_other_code: bool = False
    input_schema: Optional[dict[str, Any]] = None
    output_schema: Optional[dict[str, Any]] = None
    refresh_seconds_min: Optional[float] = None
    sla: SLALevel = "best_effort"


# ── ToolkitPiece ─────────────────────────────────────────────────

@dataclass
class ToolkitPiece:
    kind: ToolkitKind
    purpose: str
    required: bool
    description: Optional[str] = None
    interface: Optional[InterfaceSpec] = None


# ── SubstrateBriefingSpec ────────────────────────────────────────

@dataclass
class SubstrateBriefingSpec:
    """Player + Athena co-generated educational module, scoped entirely
    to Substrate Mode.

    Briefings live exclusively in Substrate Mode. They do not, and will
    never, carry an Academy/ECFL eligibility flag — Academy is a separate
    pristine pipeline with its own governance. If you find yourself
    wanting to add an Academy-related field here, you are in the wrong
    data model.
    """
    title: str
    purpose: str
    estimated_minutes: int
    format: BriefingFormat
    athena_prompt_seed: Optional[str] = None


# ── Win conditions ───────────────────────────────────────────────

@dataclass
class WinPredicate:
    type: str
    value: float | str
    description: Optional[str] = None


@dataclass
class WinConditions:
    first_revenue_within_days: Optional[int] = None
    survive_days: Optional[int] = None
    profitability_ratio_target: Optional[float] = None
    exit_multiple_target: Optional[float] = None
    custom: list[WinPredicate] = field(default_factory=list)


# ── Telemetry capture flags ──────────────────────────────────────

@dataclass
class TelemetryCapture:
    athena_chat_logs: bool = True
    code_versions: bool = True
    pricing_decisions: bool = True
    customer_telemetry: bool = True
    pivot_events: bool = True
    ui_iteration_count: bool = True
    per_piece_metrics: bool = True
    generation_metadata: bool = True


# ── Contribution scoring (weights MUST sum to 1.0) ───────────────

@dataclass
class ContributionScoring:
    outcome_quality: float = 0.30
    originality: float = 0.25
    adoption_in_compile: float = 0.20
    peer_engagement: float = 0.15
    time_invested: float = 0.10

    def __post_init__(self):
        total = (self.outcome_quality + self.originality
                 + self.adoption_in_compile + self.peer_engagement
                 + self.time_invested)
        if abs(total - 1.0) > 1e-6:
            raise ValueError(
                f"ContributionScoring weights must sum to 1.0; got {total:.6f}. "
                f"Current weights: outcome={self.outcome_quality} "
                f"originality={self.originality} "
                f"adoption={self.adoption_in_compile} "
                f"peer={self.peer_engagement} "
                f"time={self.time_invested}"
            )


# ── Spinout policy ───────────────────────────────────────────────

@dataclass
class SpinoutPolicy:
    """Real-world spinout config.

    The default 10% pool reserved for top contributors matches the
    designed equity-on-spinout structure. Distribution to specific
    players happens at spinout time, not gameplay time, to keep the
    in-game promise out of unregistered-securities territory. See
    contracts/README.md and the ToS for the legal framing.
    """
    spinout_eligible: bool = True
    contributor_equity_pool: float = 0.10
    top_contributors_invited: int = 10
    jurisdiction: str = "PT"

    def __post_init__(self):
        if not 0.0 <= self.contributor_equity_pool < 1.0:
            raise ValueError(
                f"contributor_equity_pool must be in [0, 1); "
                f"got {self.contributor_equity_pool}"
            )
        if self.top_contributors_invited < 1:
            raise ValueError(
                f"top_contributors_invited must be >= 1; "
                f"got {self.top_contributors_invited}"
            )


# ── Source metadata ──────────────────────────────────────────────

@dataclass
class VentureSource:
    pipeline: str = "ncoe_multi_agent"
    pipeline_version: str = "0.1.0"
    domain: str = "optimization"
    seed: Optional[int] = None
    problem_hash: Optional[str] = None


# ── The top-level VentureSpec ────────────────────────────────────

@dataclass
class VentureSpec:
    venture_id: str
    pitch: str
    description: str
    market_summary: str
    starting_capital: float
    target_eta_mvp_days: int
    target_buyer: TargetBuyer
    difficulty: int
    implementation_pieces_required: list[ToolkitPiece]
    spec_version: str = "1.0"
    generated_at: str = field(default_factory=lambda:
        datetime.now(timezone.utc).isoformat())
    source: VentureSource = field(default_factory=VentureSource)
    top_objections: list[str] = field(default_factory=list)
    implementation_pieces_optional: list[ToolkitPiece] = field(default_factory=list)
    substrate_briefings: list[SubstrateBriefingSpec] = field(default_factory=list)
    win_conditions: WinConditions = field(default_factory=WinConditions)
    telemetry_capture: TelemetryCapture = field(default_factory=TelemetryCapture)
    contribution_scoring: ContributionScoring = field(default_factory=ContributionScoring)
    spinout_policy: SpinoutPolicy = field(default_factory=SpinoutPolicy)
    tags: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not 1 <= self.difficulty <= 5:
            raise ValueError(
                f"difficulty must be in 1..5; got {self.difficulty}")
        if self.starting_capital < 0:
            raise ValueError(
                f"starting_capital must be >= 0; got {self.starting_capital}")
        if self.target_eta_mvp_days < 1:
            raise ValueError(
                f"target_eta_mvp_days must be >= 1; "
                f"got {self.target_eta_mvp_days}")
        if not self.implementation_pieces_required:
            raise ValueError(
                "VentureSpec must have at least one required toolkit piece")

    def to_json(self, **kwargs) -> str:
        """Serialise to JSON for sending across the NCOE→AEGIS boundary."""
        return json.dumps(asdict(self), **kwargs)


# ── Telemetry payloads (AEGIS → Quadratic) ───────────────────────

@dataclass
class ToolkitPieceAttempt:
    piece_kind: ToolkitKind
    artifact_hash: str
    version_count: int
    last_updated_at: str
    metrics: dict[str, float] = field(default_factory=dict)


@dataclass
class SubstrateBriefingAttempt:
    briefing_id: str
    title: str
    format: BriefingFormat
    rating_count: int = 0
    views: int = 0
    avg_rating: Optional[float] = None
    status: BriefingStatus = "draft"


@dataclass
class VentureMetrics:
    total_revenue: float = 0.0
    subscriber_count: int = 0
    first_revenue_at: Optional[str] = None
    distinct_buyers: int = 0
    customer_b2b_ratio: float = 0.0
    retention_30d: float = 0.0


@dataclass
class PivotEvent:
    at: str
    kind: PivotKind
    before: str
    after: str
    notes: Optional[str] = None


@dataclass
class VentureAttempt:
    attempt_id: str
    venture_id: str
    player_id: str
    company_id: str
    started_at: str
    status: AttemptStatus
    ended_at: Optional[str] = None
    pieces: list[ToolkitPieceAttempt] = field(default_factory=list)
    briefings: list[SubstrateBriefingAttempt] = field(default_factory=list)
    metrics: VentureMetrics = field(default_factory=VentureMetrics)
    pivots: list[PivotEvent] = field(default_factory=list)
    contribution_score: Optional[float] = None
    athena_session_ids: list[str] = field(default_factory=list)
