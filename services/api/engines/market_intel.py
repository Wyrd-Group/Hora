"""
market_intel.py — Geopolitical-to-Market Signal Bridge

Translates MAVEN's live military/geopolitical intelligence into structured
market opportunity signals consumable by trading systems (quadratic-ip).

Signal architecture:
  - GeoTrigger: a detected condition (chokepoint activity, hostile surge, etc.)
  - MarketSignal: directional thesis for a specific asset/sector
  - MarketOpportunity: ranked trade idea with rationale, confidence, time horizon

Sector mapping based on academic literature:
  - Merton (1973), Fama-French sector rotation
  - SIPRI Arms Trade data → defense correlation
  - EIA Petroleum Intelligence Weekly → energy/shipping correlation
  - BIS Quarterly Review → currency/conflict studies

Integration points:
  - Consumed by /api/v1/ai/markets endpoint
  - Bridge: quadratic-ip pulls this endpoint to inject geopol signals into
    its signalEngine.js macro category (MAVEN_GEOPOL_WEIGHT = 0.15)
"""
from __future__ import annotations

import math
import time
import logging
from dataclasses import dataclass, field, asdict
from typing import Any

log = logging.getLogger("mss.market_intel")

# ── Sector and asset universe ─────────────────────────────────────────────────

# Sectors with representative ETF/proxy symbols (tradeable in quadratic-ip universe)
SECTOR_MAP = {
    "defense":    {"symbols": ["LMT", "NOC", "RTX", "GD", "BA"],    "etf": "ITA"},
    "energy":     {"symbols": ["XOM", "CVX", "COP", "OXY", "SLB"],  "etf": "XLE"},
    "shipping":   {"symbols": ["ZIM", "DAC", "GOGL"],                 "etf": "BOAT"},
    "commodities":{"symbols": ["WTI", "GOLD", "WHEAT", "CORN"],       "etf": "DJP"},
    "technology": {"symbols": ["NVDA", "AMD", "TSM", "INTC", "ASML"],"etf": "XLK"},
    "financials": {"symbols": ["JPM", "GS", "MS", "C"],              "etf": "XLF"},
    "healthcare": {"symbols": ["JNJ", "PFE", "MRK"],                 "etf": "XLV"},
    "utilities":  {"symbols": ["NEE", "DUK", "SO"],                  "etf": "XLU"},
    "currencies": {"symbols": ["USD", "EUR", "JPY", "GBP"],          "etf": "UUP"},
    "bonds":      {"symbols": ["TLT", "IEF", "SHY"],                 "etf": "TLT"},
    "gold":       {"symbols": ["GLD", "IAU", "GOLD"],                "etf": "GLD"},
    "crypto":     {"symbols": ["BTC", "ETH"],                         "etf": None},
}

# Chokepoint → primary affected sectors + direction
CHOKEPOINT_SECTORS = {
    "Strait of Hormuz": {
        "long":  ["energy", "defense", "gold"],
        "short": ["airlines", "consumer"],
        "macro": "oil_shock",
        "urgency": 1.0,
    },
    "Bab-el-Mandeb": {
        "long":  ["shipping", "energy", "defense"],
        "short": ["technology", "consumer"],
        "macro": "shipping_disruption",
        "urgency": 0.9,
    },
    "Strait of Malacca": {
        "long":  ["defense", "shipping", "energy"],
        "short": ["technology", "consumer"],
        "macro": "asia_trade_disruption",
        "urgency": 0.9,
    },
    "Taiwan Strait": {
        "long":  ["defense", "gold", "bonds"],
        "short": ["technology", "financials"],
        "macro": "semiconductor_shock",
        "urgency": 1.0,
    },
    "Suez Canal": {
        "long":  ["shipping", "energy", "defense"],
        "short": ["consumer", "technology"],
        "macro": "shipping_disruption",
        "urgency": 0.85,
    },
    "Panama Canal": {
        "long":  ["shipping", "energy"],
        "short": ["consumer"],
        "macro": "shipping_disruption",
        "urgency": 0.7,
    },
    "Strait of Gibraltar": {
        "long":  ["defense", "energy"],
        "short": [],
        "macro": "european_tension",
        "urgency": 0.65,
    },
    "Danish Straits": {
        "long":  ["defense", "energy"],
        "short": [],
        "macro": "nato_escalation",
        "urgency": 0.6,
    },
}

# FRED series → market regime classification
FRED_REGIME_RULES = [
    # (series_id, condition, regime_label, affected_sectors_long, affected_sectors_short)
    ("VIXCLS",              ">25",  "risk_off",      ["gold", "bonds", "utilities"],     ["technology", "crypto"]),
    ("VIXCLS",              "<15",  "risk_on",       ["technology", "crypto", "financials"], ["gold", "bonds"]),
    ("WTISPLC",             ">80",  "oil_elevated",  ["energy", "defense"],              ["airlines", "consumer"]),
    ("WTISPLC",             "<60",  "oil_depressed", ["airlines", "consumer"],           ["energy"]),
    ("BAMLH0A0HYM2",        ">5",   "credit_stress", ["bonds", "gold"],                  ["financials", "crypto"]),
    ("T10Y2Y",              "<0",   "yield_invert",  ["utilities", "bonds", "gold"],     ["financials", "technology"]),
    ("GOLDAMGBD228NLBM",    ">2000","gold_elevated", ["gold", "commodities"],            []),
    ("DEXRUSL",             ">80",  "rub_weak",      ["commodities", "defense"],         []),
    ("DEXCHUS",             ">7.2", "cny_weak",      ["commodities"],                    ["technology"]),
]

# Threat level → market regime
THREAT_MARKET_MAP = {
    "CRITICAL": {"long": ["defense", "gold", "bonds"], "short": ["technology", "crypto"], "urgency": 1.0},
    "HIGH":     {"long": ["defense", "gold"],          "short": ["technology"],           "urgency": 0.8},
    "MEDIUM":   {"long": ["defense"],                  "short": [],                       "urgency": 0.5},
    "LOW":      {"long": [],                           "short": [],                       "urgency": 0.2},
}

# Conflict region → affected commodity/currency
REGION_COMMODITY_MAP = {
    "middle_east":    {"long": ["energy", "gold"], "short": ["consumer"]},
    "east_asia":      {"long": ["defense", "gold"], "short": ["technology", "shipping"]},
    "eastern_europe": {"long": ["defense", "commodities", "gold"], "short": ["currencies"]},
    "africa":         {"long": ["commodities"], "short": []},
    "south_asia":     {"long": ["defense", "energy"], "short": []},
}


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class GeoTrigger:
    trigger_type: str          # chokepoint_activity | hostile_surge | fred_signal | conflict_event
    source:       str          # which data source fired this
    severity:     float        # 0-1
    label:        str          # human readable
    details:      dict = field(default_factory=dict)


@dataclass
class MarketSignal:
    sector:    str
    direction: str             # LONG | SHORT
    strength:  float           # 0-1
    trigger:   str             # what caused this
    symbols:   list[str] = field(default_factory=list)
    etf:       str | None = None


@dataclass
class MarketOpportunity:
    id:            str
    title:         str
    thesis:        str
    direction:     str         # LONG | SHORT
    sector:        str
    symbols:       list[str]
    etf:           str | None
    confidence:    float       # 0-1
    time_horizon:  str         # IMMEDIATE (hours) | SHORT (days) | MEDIUM (weeks)
    triggers:      list[str]   # GeoTrigger labels that support this
    strength:      float       # composite signal strength 0-1
    category:      str         # military | economic | geopolitical | combined
    created_at:    float = field(default_factory=time.time)


@dataclass
class MarketIntelReport:
    opportunities:  list[MarketOpportunity]
    triggers:       list[GeoTrigger]
    macro_regime:   str        # risk_off | risk_on | neutral | oil_shock | semiconductor_shock
    regime_signals: list[str]
    geopol_score:   float      # 0-100 composite geopolitical market risk
    summary:        str
    generated_at:   float = field(default_factory=time.time)


# ── Analysis functions ────────────────────────────────────────────────────────

def _detect_chokepoint_triggers(entities: list[dict]) -> list[GeoTrigger]:
    """Detect hostile activity near strategic chokepoints."""
    from engines.intelligence import STRATEGIC_CHOKEPOINTS
    triggers = []

    hostile_entities = [e for e in entities if e.get("affiliation") == "hostile"]

    for name, cp in STRATEGIC_CHOKEPOINTS.items():
        nearby = []
        for e in hostile_entities:
            lat = e.get("latitude") or e.get("lat") or 0
            lon = e.get("longitude") or e.get("lon") or 0
            if lat == 0 and lon == 0:
                continue
            dist = math.sqrt((lat - cp["lat_c"])**2 + (lon - cp["lon_c"])**2) * 60
            if dist < cp["radius_nm"] * 2:
                nearby.append(e)

        if nearby:
            criticality = cp["criticality"] / 10.0
            severity = min(1.0, (len(nearby) / 3.0) * criticality)
            triggers.append(GeoTrigger(
                trigger_type="chokepoint_activity",
                source=f"entity_tracker:{name}",
                severity=severity,
                label=f"Hostile activity near {name} ({len(nearby)} units)",
                details={"chokepoint": name, "entity_count": len(nearby), "criticality": cp["criticality"]},
            ))

    return triggers


def _detect_threat_triggers(threats: list[dict]) -> list[GeoTrigger]:
    """Map current threat assessments to market triggers."""
    triggers = []
    by_level: dict[str, int] = {}
    for t in threats:
        lvl = t.get("level") or t.get("threat_level", "LOW")
        by_level[lvl] = by_level.get(lvl, 0) + 1

    for lvl, count in by_level.items():
        if lvl in ("CRITICAL", "HIGH"):
            triggers.append(GeoTrigger(
                trigger_type="hostile_surge",
                source="threat_engine",
                severity=1.0 if lvl == "CRITICAL" else 0.7,
                label=f"{count} {lvl} threat(s) active",
                details={"level": lvl, "count": count},
            ))
    return triggers


def _detect_fred_triggers(fred_data: dict) -> list[GeoTrigger]:
    """Classify FRED economic series against regime rules."""
    triggers = []
    indicators = fred_data.get("indicators") or {}

    for series_id, cond, regime, _, _ in FRED_REGIME_RULES:
        ind = indicators.get(series_id)
        if not ind:
            continue
        val = ind.get("value")
        if val is None:
            continue

        threshold = float(cond[1:])
        operator  = cond[0]
        fired = (operator == ">" and val > threshold) or (operator == "<" and val < threshold)
        if not fired:
            continue

        # Severity: how far past threshold
        deviation = abs(val - threshold) / (threshold + 1e-9)
        severity  = min(1.0, deviation * 2)

        triggers.append(GeoTrigger(
            trigger_type="fred_signal",
            source=f"fred:{series_id}",
            severity=severity,
            label=f"{series_id} {cond} (current: {val:.2f})",
            details={"series_id": series_id, "value": val, "regime": regime},
        ))

    return triggers


def _detect_gdelt_triggers(gdelt_events: list[dict]) -> list[GeoTrigger]:
    """Map GDELT conflict events to market triggers by region."""
    triggers = []
    if not gdelt_events:
        return triggers

    # Classify events by region
    region_counts: dict[str, int] = {}
    for ev in gdelt_events:
        lat = ev.get("lat") or ev.get("latitude", 0)
        lon = ev.get("lon") or ev.get("longitude", 0)

        region = _classify_region(lat, lon)
        if region:
            region_counts[region] = region_counts.get(region, 0) + 1

    for region, count in region_counts.items():
        if count >= 2:
            severity = min(1.0, count / 10.0)
            triggers.append(GeoTrigger(
                trigger_type="conflict_event",
                source=f"gdelt:{region}",
                severity=severity,
                label=f"{count} conflict events in {region.replace('_', ' ')}",
                details={"region": region, "event_count": count},
            ))

    return triggers


def _classify_region(lat: float, lon: float) -> str | None:
    """Classify lat/lon to a geopolitical region."""
    if not lat and not lon:
        return None
    # Middle East
    if 12 < lat < 42 and 25 < lon < 65:
        return "middle_east"
    # East Asia
    if 0 < lat < 50 and 100 < lon < 145:
        return "east_asia"
    # Eastern Europe / Ukraine
    if 44 < lat < 60 and 20 < lon < 50:
        return "eastern_europe"
    # Africa
    if -35 < lat < 37 and -20 < lon < 52:
        return "africa"
    # South Asia
    if 5 < lat < 37 and 60 < lon < 90:
        return "south_asia"
    return None


def _build_signals(triggers: list[GeoTrigger]) -> list[MarketSignal]:
    """Convert GeoTriggers into directional MarketSignals per sector."""
    signal_map: dict[tuple[str, str], MarketSignal] = {}

    def _add(sector: str, direction: str, strength: float, trigger_label: str):
        key = (sector, direction)
        if key not in signal_map:
            info = SECTOR_MAP.get(sector, {})
            signal_map[key] = MarketSignal(
                sector=sector,
                direction=direction,
                strength=0.0,
                trigger=trigger_label,
                symbols=info.get("symbols", [])[:3],
                etf=info.get("etf"),
            )
        # Weighted average (take max, not sum, to avoid double-counting)
        signal_map[key].strength = max(signal_map[key].strength, strength)

    for trig in triggers:
        if trig.trigger_type == "chokepoint_activity":
            cp = trig.details.get("chokepoint", "")
            cp_map = CHOKEPOINT_SECTORS.get(cp, {})
            urgency = cp_map.get("urgency", 0.5)
            s = trig.severity * urgency
            for sector in cp_map.get("long", []):
                _add(sector, "LONG", s, trig.label)
            for sector in cp_map.get("short", []):
                _add(sector, "SHORT", s * 0.7, trig.label)

        elif trig.trigger_type == "hostile_surge":
            lvl = trig.details.get("level", "HIGH")
            th_map = THREAT_MARKET_MAP.get(lvl, THREAT_MARKET_MAP["LOW"])
            s = trig.severity * th_map["urgency"]
            for sector in th_map.get("long", []):
                _add(sector, "LONG", s, trig.label)
            for sector in th_map.get("short", []):
                _add(sector, "SHORT", s * 0.6, trig.label)

        elif trig.trigger_type == "fred_signal":
            regime = trig.details.get("regime", "")
            for _, cond, r, longs, shorts in FRED_REGIME_RULES:
                if r == regime:
                    s = trig.severity * 0.8
                    for sector in longs:
                        _add(sector, "LONG", s, trig.label)
                    for sector in shorts:
                        _add(sector, "SHORT", s * 0.7, trig.label)

        elif trig.trigger_type == "conflict_event":
            region = trig.details.get("region", "")
            r_map = REGION_COMMODITY_MAP.get(region, {})
            s = trig.severity * 0.65
            for sector in r_map.get("long", []):
                _add(sector, "LONG", s, trig.label)
            for sector in r_map.get("short", []):
                _add(sector, "SHORT", s * 0.5, trig.label)

    return sorted(signal_map.values(), key=lambda x: x.strength, reverse=True)


def _build_opportunities(
    signals: list[MarketSignal],
    triggers: list[GeoTrigger],
) -> list[MarketOpportunity]:
    """Consolidate signals into ranked trade opportunities."""
    opportunities = []
    trigger_labels = [t.label for t in triggers]

    seen_sectors: set[tuple[str, str]] = set()

    for sig in signals:
        key = (sig.sector, sig.direction)
        if key in seen_sectors or sig.strength < 0.15:
            continue
        seen_sectors.add(key)

        # Determine category
        category = "combined"
        supporting = [t for t in triggers if sig.trigger in t.label or
                     any(sig.trigger in tl for tl in trigger_labels)]
        if all(t.trigger_type == "fred_signal" for t in supporting):
            category = "economic"
        elif all(t.trigger_type in ("chokepoint_activity", "hostile_surge") for t in supporting):
            category = "military"
        elif all(t.trigger_type == "conflict_event" for t in supporting):
            category = "geopolitical"

        # Time horizon based on trigger type
        has_military = any(t.trigger_type in ("chokepoint_activity", "hostile_surge") for t in triggers)
        has_fred     = any(t.trigger_type == "fred_signal" for t in triggers)
        if has_military and sig.strength > 0.5:
            horizon = "IMMEDIATE"
        elif has_fred:
            horizon = "MEDIUM"
        else:
            horizon = "SHORT"

        # Confidence = signal strength × trigger diversity
        n_triggers = len(set(t.trigger_type for t in triggers))
        confidence = min(0.95, sig.strength * (0.6 + n_triggers * 0.1))

        # Build thesis
        thesis = _generate_thesis(sig, triggers)

        opp = MarketOpportunity(
            id=f"{sig.sector}_{sig.direction}_{int(sig.strength*100)}",
            title=f"{sig.direction} {sig.sector.replace('_', ' ').title()}",
            thesis=thesis,
            direction=sig.direction,
            sector=sig.sector,
            symbols=sig.symbols,
            etf=sig.etf,
            confidence=round(confidence, 2),
            time_horizon=horizon,
            triggers=trigger_labels[:4],
            strength=round(sig.strength, 2),
            category=category,
        )
        opportunities.append(opp)

    return sorted(opportunities, key=lambda o: o.confidence * o.strength, reverse=True)[:12]


def _generate_thesis(sig: MarketSignal, triggers: list[GeoTrigger]) -> str:
    """Generate a one-line thesis string for an opportunity."""
    sector = sig.sector.replace("_", " ")
    top_triggers = [t.label for t in sorted(triggers, key=lambda x: x.severity, reverse=True)[:2]]
    trigger_str = " and ".join(top_triggers) if top_triggers else "geopolitical pressure"

    if sig.direction == "LONG":
        phrases = {
            "defense":     f"Escalation from {trigger_str} historically drives defense procurement cycles.",
            "energy":      f"{trigger_str} threatens supply routes, supporting energy price premiums.",
            "gold":        f"Risk-off flows expected as {trigger_str} elevates macro uncertainty.",
            "shipping":    f"Rerouting from {trigger_str} increases freight rates and shipping demand.",
            "bonds":       f"Flight-to-safety bid as {trigger_str} depresses risk appetite.",
            "commodities": f"Supply disruption from {trigger_str} supports commodity prices.",
            "utilities":   f"Defensive rotation into utilities as {trigger_str} triggers risk-off.",
        }
    else:
        phrases = {
            "technology":  f"Semiconductor/supply chain exposure to {trigger_str} pressures tech.",
            "financials":  f"Credit stress from {trigger_str} weighs on financial sector.",
            "consumer":    f"Energy/cost shock from {trigger_str} compresses consumer margins.",
            "crypto":      f"Risk-off regime from {trigger_str} typically weighs on speculative assets.",
            "airlines":    f"Fuel cost spike and route disruption from {trigger_str} hurts airlines.",
        }

    return phrases.get(sig.sector, f"{trigger_str} creates directional pressure in {sector}.")


def _macro_regime(triggers: list[GeoTrigger], fred_data: dict) -> tuple[str, list[str]]:
    """Classify the current macro regime from all signals."""
    fred_regimes = [t.details.get("regime") for t in triggers if t.trigger_type == "fred_signal"]
    has_military = any(t.trigger_type in ("chokepoint_activity", "hostile_surge") for t in triggers)
    has_conflict  = any(t.trigger_type == "conflict_event" for t in triggers)

    # Priority: acute shocks override slow-moving macro
    chokepoints = [t.details.get("chokepoint") for t in triggers
                   if t.trigger_type == "chokepoint_activity"]
    if "Taiwan Strait" in chokepoints:
        regime = "semiconductor_shock"
    elif "Strait of Hormuz" in chokepoints or "Bab-el-Mandeb" in chokepoints:
        regime = "oil_shock"
    elif "risk_off" in fred_regimes:
        regime = "risk_off"
    elif has_military and "oil_elevated" in fred_regimes:
        regime = "stagflation_risk"
    elif "yield_invert" in fred_regimes:
        regime = "recession_watch"
    elif "risk_on" in fred_regimes and not has_military:
        regime = "risk_on"
    elif has_conflict:
        regime = "geopolitical_tension"
    else:
        regime = "neutral"

    signals = []
    stress  = fred_data.get("summary", {}).get("stressScore", 0) if isinstance(fred_data, dict) else 0
    if stress >= 50:
        signals.append(f"FRED stress index elevated ({stress}/100)")
    if has_military:
        signals.append("Active military/hostile entities detected")
    if has_conflict:
        signals.append("Live conflict events (GDELT)")
    for fr in set(fred_regimes):
        if fr:
            signals.append(f"FRED regime: {fr.replace('_', ' ')}")

    return regime, signals[:5]


def _geopol_score(triggers: list[GeoTrigger], fred_data: dict) -> float:
    """Composite 0-100 geopolitical market risk score."""
    base = 0.0
    # Trigger contributions
    for t in triggers:
        weight = {"chokepoint_activity": 25, "hostile_surge": 20,
                  "fred_signal": 15, "conflict_event": 10}.get(t.trigger_type, 5)
        base += t.severity * weight

    # FRED stress overlay
    stress = 0
    if isinstance(fred_data, dict):
        stress = fred_data.get("summary", {}).get("stressScore", 0)
    base += stress * 0.2

    return min(100, round(base))


# ── Public API ────────────────────────────────────────────────────────────────

def generate_market_intel(
    entities: list[dict],
    threats:  list[dict],
    fred_data: dict,
    gdelt_events: list[dict] | None = None,
) -> MarketIntelReport:
    """
    Main entry point. Takes live MAVEN data and produces a MarketIntelReport.

    Args:
        entities:     Live MSS entity list
        threats:      Current threat assessments
        fred_data:    Parsed FRED economic data (from /api/v1/ai/economic)
        gdelt_events: Recent GDELT conflict events (optional)

    Returns:
        MarketIntelReport with ranked opportunities, triggers, and regime
    """
    gdelt_events = gdelt_events or []

    # 1. Detect triggers from all data sources
    triggers: list[GeoTrigger] = []
    triggers += _detect_chokepoint_triggers(entities)
    triggers += _detect_threat_triggers(threats)
    triggers += _detect_fred_triggers(fred_data)
    triggers += _detect_gdelt_triggers(gdelt_events)

    # 2. Convert triggers → sector signals
    signals = _build_signals(triggers)

    # 3. Build ranked opportunities
    opportunities = _build_opportunities(signals, triggers)

    # 4. Classify macro regime
    regime, regime_signals = _macro_regime(triggers, fred_data)

    # 5. Composite score
    score = _geopol_score(triggers, fred_data)

    # 6. Summary sentence
    n_opp = len(opportunities)
    top   = opportunities[0].title if opportunities else "no clear opportunities"
    summary = (
        f"Regime: {regime.replace('_', ' ').upper()} · "
        f"{n_opp} market opportunities identified · "
        f"Top signal: {top} · "
        f"Geopolitical risk score: {score}/100"
    )

    return MarketIntelReport(
        opportunities=opportunities,
        triggers=triggers,
        macro_regime=regime,
        regime_signals=regime_signals,
        geopol_score=score,
        summary=summary,
    )


def to_quadratic_signals(report: MarketIntelReport) -> dict:
    """
    Convert a MarketIntelReport to the format expected by quadratic-ip's
    signalEngine.js MAVEN_GEOPOL injection hook.

    Shape:
      {
        regime: string,
        score: number,          // 0-100
        signals: {
          [symbol]: { direction: 'LONG'|'SHORT', strength: number, sector: string }
        },
        timestamp: number
      }
    """
    signals: dict[str, dict] = {}

    for opp in report.opportunities:
        direction = 1.0 if opp.direction == "LONG" else -1.0
        for sym in opp.symbols:
            if sym not in signals or abs(opp.strength * direction) > abs(signals[sym]["strength"]):
                signals[sym] = {
                    "direction": opp.direction,
                    "strength":  round(opp.strength * direction, 3),
                    "sector":    opp.sector,
                    "confidence": opp.confidence,
                    "horizon":   opp.time_horizon,
                }

    return {
        "regime":    report.macro_regime,
        "score":     report.geopol_score,
        "signals":   signals,
        "regime_signals": report.regime_signals,
        "timestamp": report.generated_at,
    }
