"""
Maven Intelligence Engine — AI-powered analysis layer for Aegis MSS.

Architecture:
  • Template engine  — always available, structured ACH-format assessments
  • LLM layer        — Ollama (local) or any OpenAI-compatible API (Groq, etc.)
  • Fusion scorer    — cross-domain signal correlation (military × macro × geo)

Inference priority:
  1. Ollama at localhost:11434   (local, private, free)
  2. Groq API                    (free tier, 14,400 req/day, very fast)
  3. Any OpenAI-compatible URL   (configurable via MSS_LLM_URL env var)
  4. Template-only fallback      (structured, no LLM needed)

Intelligence outputs follow US IC standards:
  - Confidence levels: LOW / MODERATE / HIGH  (like CIA/DIA assessments)
  - Source attribution: lists which data domains contributed
  - ACH format: lists competing hypotheses with evidence weights
"""
from __future__ import annotations

import os
import time
import json
import math
import logging
import statistics
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

import httpx

log = logging.getLogger("mss.intelligence")

# ── LLM configuration ─────────────────────────────────────────────────────────

OLLAMA_URL  = os.getenv("MSS_OLLAMA_URL",  "http://localhost:11434")
GROQ_URL    = "https://api.groq.com/openai/v1"
GROQ_KEY    = os.getenv("MSS_GROQ_API_KEY", "")
LLM_URL     = os.getenv("MSS_LLM_URL", "")   # override any OpenAI-compat endpoint
LLM_KEY     = os.getenv("MSS_LLM_KEY", "")
# Preferred Ollama models: deepseek-r1 (reasoning/ACH), qwen2.5 (structured JSON), llama3.2 (fallback)
_OLLAMA_PREFERRED = ["deepseek-r1:14b", "deepseek-r1:8b", "qwen2.5:14b", "qwen2.5:7b",
                     "llama3.3:70b", "llama3.2:3b", "mistral:7b", "llama3:8b"]
LLM_MODEL   = os.getenv("MSS_LLM_MODEL", "")   # auto-detected from Ollama if not set
# Groq: llama-3.3-70b-versatile (131K context, 280 t/sec) is the top free-tier model
GROQ_MODEL  = os.getenv("MSS_GROQ_MODEL", "llama-3.3-70b-versatile")

LLM_TIMEOUT = 30  # seconds


# ── Geopolitical knowledge base ───────────────────────────────────────────────

ADVERSARY_STATES = {"IRN", "RUS", "PRK", "CHN"}   # ISO-3 codes
ALLIED_STATES    = {"USA", "GBR", "FRA", "DEU", "AUS", "CAN", "JPN", "KOR", "ISR",
                    "ITA", "ESP", "NLD", "POL", "NOR", "DNK"}
NEUTRAL_STATES   = {"SAU", "ARE", "QAT", "TUR", "IND", "PAK", "EGY", "BRA", "ZAF"}

STRATEGIC_CHOKEPOINTS = {
    "Strait of Hormuz":     {"lat_c": 26.5,  "lon_c": 56.3,  "radius_nm": 30,  "criticality": 10},
    "Bab-el-Mandeb":        {"lat_c": 12.5,  "lon_c": 43.5,  "radius_nm": 25,  "criticality":  9},
    "Strait of Malacca":    {"lat_c":  1.2,  "lon_c": 103.8, "radius_nm": 40,  "criticality":  9},
    "Taiwan Strait":        {"lat_c": 24.0,  "lon_c": 119.5, "radius_nm": 60,  "criticality": 10},
    "Suez Canal":           {"lat_c": 30.5,  "lon_c": 32.4,  "radius_nm": 20,  "criticality":  9},
    "Panama Canal":         {"lat_c":  9.0,  "lon_c": -79.6, "radius_nm": 25,  "criticality":  8},
    "Strait of Gibraltar":  {"lat_c": 35.9,  "lon_c": -5.6,  "radius_nm": 15,  "criticality":  8},
    "Danish Straits":       {"lat_c": 56.0,  "lon_c": 10.5,  "radius_nm": 50,  "criticality":  7},
}

# Conflict escalation indicators (leading indicators in order of concern)
ESCALATION_INDICATORS = [
    "dark_vessel_concentration",   # multiple AIS-off vessels in same area
    "military_aircraft_surge",     # abnormal concentration of military flights
    "economic_capital_flight",     # currency devaluation + FX outflows
    "internet_censorship_spike",   # OONI-based
    "humanitarian_displacement",   # IOM/UNHCR spike
    "energy_price_shock",          # EIA oil price anomaly
    "shipping_route_deviation",    # vessels avoiding normal lanes
    "gps_jamming_expansion",       # GPSJAM coverage growing
    "airlift_surge",               # unusual military airlift patterns
]

# System prompt for the intelligence AI
MAVEN_SYSTEM_PROMPT = """You are MAVEN, an advanced artificial intelligence analyst embedded in the Aegis Multi-Source Intelligence System. You were trained on military doctrine, geopolitical history, intelligence tradecraft, and open-source intelligence methodologies.

Your analytical framework follows US Intelligence Community standards:
- Confidence levels: LOW CONFIDENCE / MODERATE CONFIDENCE / HIGH CONFIDENCE
- Source attribution: always cite which data domains support your assessment
- ACH methodology: consider competing hypotheses before reaching judgments
- Key Intelligence Questions (KIQs): structure analysis around decision-relevant questions
- Deny/confirm: explicitly state what would confirm or deny your assessment

Your tone is precise, professional, and direct — like a DIA or CIA finished intelligence product. Avoid hedging language like "maybe" or "could potentially". Use IC-standard formulations: "We assess with HIGH CONFIDENCE...", "Available indicators suggest...", "Absent other information..."

You have access to real-time data from: ADS-B aircraft tracking, AIS maritime surveillance, CoT/ATAK tactical feeds, GDELT/OSINT news analysis, NASA FIRMS thermal detection, USGS seismic monitoring, NOAA weather, armed conflict databases (ACLED), and macroeconomic indicators (World Bank, IMF, FRED).

When generating assessments, always structure your output as:
1. SITUATION SUMMARY (2-3 sentences)
2. KEY FINDINGS (bullet points with confidence levels)
3. THREAT ASSESSMENT (scored 0-100)
4. INDICATORS & WARNINGS (what to watch)
5. COLLECTION GAPS (what additional data would improve confidence)"""


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class Intelligence:
    """A finished intelligence product."""
    title:          str
    classification: str          = "UNCLASSIFIED // OPEN SOURCE"
    summary:        str          = ""
    keyFindings:    list[str]    = field(default_factory=list)
    threatScore:    int          = 0        # 0–100
    confidence:     str          = "LOW"    # LOW / MODERATE / HIGH
    sources:        list[str]    = field(default_factory=list)
    indicators:     list[str]    = field(default_factory=list)    # I&W
    hypotheses:     list[dict]   = field(default_factory=list)    # ACH
    collectionGaps: list[str]    = field(default_factory=list)
    llmNarrative:   str          = ""       # free-text from LLM
    generatedAt:    str          = field(default_factory=lambda: datetime.now(timezone.utc).isoformat() + "Z")

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class CrossDomainSignal:
    """A single cross-domain correlation signal."""
    domains:     list[str]     # which data domains are involved
    signal:      str           # description of the correlation
    strength:    float         # 0–1 correlation strength
    direction:   str           # "escalatory" / "de-escalatory" / "ambiguous"
    confidence:  str           # LOW/MODERATE/HIGH

    def as_dict(self) -> dict:
        return asdict(self)


# ── LLM client ────────────────────────────────────────────────────────────────

def _llm_available() -> tuple[str, str, str]:
    """
    Returns (base_url, api_key, model) for the first available LLM endpoint.
    Order: custom > Groq > Ollama.
    Returns ("", "", "") if none available.
    """
    if LLM_URL:
        return LLM_URL, LLM_KEY, LLM_MODEL or "default"
    if GROQ_KEY:
        return GROQ_URL, GROQ_KEY, GROQ_MODEL
    # Check if Ollama is running — prefer reasoning models for intelligence work
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        if r.status_code == 200:
            available = [m["name"] for m in r.json().get("models", [])]
            if available:
                # Pick highest-priority preferred model that's installed
                for preferred in _OLLAMA_PREFERRED:
                    match = next((m for m in available if m.startswith(preferred.split(":")[0])), None)
                    if match:
                        return f"{OLLAMA_URL}/v1", "", match
                return f"{OLLAMA_URL}/v1", "", available[0]
    except Exception:
        pass
    return "", "", ""


async def _llm_chat(messages: list[dict], max_tokens: int = 1024) -> str:
    """Send a chat completion request to the configured LLM. Returns empty string on failure."""
    base_url, api_key, model = _llm_available()
    if not base_url:
        return ""

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model":      model,
        "messages":   messages,
        "max_tokens": max_tokens,
        "temperature": 0.3,   # lower = more factual/consistent
    }

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            r = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if r.status_code == 200:
                return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        log.debug("LLM call failed: %s", e)
    return ""


# ── Template-based assessment (no LLM required) ───────────────────────────────

def _haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3440.065
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _chokepoint_proximity(lat: float, lon: float) -> list[tuple[str, float]]:
    """Returns list of (chokepoint_name, distance_nm) within 200nm."""
    results = []
    for name, cp in STRATEGIC_CHOKEPOINTS.items():
        d = _haversine_nm(lat, lon, cp["lat_c"], cp["lon_c"])
        if d <= 200:
            results.append((name, round(d, 1)))
    return sorted(results, key=lambda x: x[1])


def _affiliation_risk(affiliation: str) -> int:
    return {"hostile": 65, "unknown": 25, "neutral": 8, "friendly": 0}.get(affiliation, 25)


def build_sitrep_template(
    entities:  dict[str, Any],
    threats:   list[dict],
    anomalies: list[dict],
    clusters:  list[dict],
    macro:     dict[str, Any] | None = None,
) -> Intelligence:
    """
    Generate a Situation Report using template logic (no LLM).
    Always works regardless of AI availability.
    """
    total       = len(entities)
    hostile     = sum(1 for e in entities.values() if e.get("affiliation") == "hostile")
    unknown     = sum(1 for e in entities.values() if e.get("affiliation") == "unknown")
    critical_t  = [t for t in threats  if t.get("level") in ("Critical", "High")]
    critical_a  = [a for a in anomalies if a.get("severity") == "critical"]
    dark_ships  = [a for a in anomalies if "DARK_SHIP" in a.get("flags", [])]
    impossible  = [a for a in anomalies if "IMPOSSIBLE_SPEED" in a.get("flags", [])]

    # Chokepoint activity
    chokepoint_hits: dict[str, int] = {}
    for e in entities.values():
        lat, lon = e.get("lat"), e.get("lon")
        if lat and lon:
            for name, dist in _chokepoint_proximity(lat, lon):
                if dist < STRATEGIC_CHOKEPOINTS[name]["radius_nm"] * 2:
                    chokepoint_hits[name] = chokepoint_hits.get(name, 0) + 1

    # Compute composite threat score
    base_score = min(100, hostile * 3 + len(critical_t) * 5 + len(dark_ships) * 8 + len(impossible) * 4)
    chokepoint_bonus = sum(min(10, v * 2) for v in chokepoint_hits.values())
    threat_score = min(100, base_score + chokepoint_bonus)

    # Confidence based on data richness
    if total > 20 and len(threats) > 5:
        confidence = "HIGH"
    elif total > 5:
        confidence = "MODERATE"
    else:
        confidence = "LOW"

    # Build key findings
    findings = []
    if hostile > 0:
        findings.append(f"HIGH CONFIDENCE — {hostile} hostile-affiliated entities tracked across operational area.")
    if unknown > total * 0.4 and total > 5:
        findings.append(f"MODERATE CONFIDENCE — Elevated unknown-affiliation ratio ({unknown}/{total}) indicates possible identification gap or deliberate EMCON.")
    if dark_ships:
        findings.append(f"HIGH CONFIDENCE — {len(dark_ships)} vessel(s) conducting suspicious AIS-off behavior; assess possible sanctions evasion or covert logistics.")
    if impossible:
        findings.append(f"MODERATE CONFIDENCE — {len(impossible)} entity/entities exhibiting physically impossible velocity; possible AIS/ADS-B spoofing activity.")
    if chokepoint_hits:
        cp_list = ", ".join(f"{n} ({c} tracks)" for n, c in sorted(chokepoint_hits.items(), key=lambda x: -x[1]))
        findings.append(f"MODERATE CONFIDENCE — Elevated activity at strategic chokepoints: {cp_list}.")
    if clusters:
        hostile_clusters = [c for c in clusters if c.get("isHostile")]
        if hostile_clusters:
            findings.append(f"HIGH CONFIDENCE — {len(hostile_clusters)} hostile entity cluster(s) detected; potential coordinated operation underway.")
    if not findings:
        findings.append("LOW CONFIDENCE — Nominal operational picture. No significant anomalies detected in current collection window.")

    # ACH hypotheses
    hypotheses = []
    if dark_ships or impossible:
        hypotheses.append({
            "hypothesis":  "Adversary conducting sanctions evasion or covert logistics operation",
            "evidence_for": ["AIS-off behavior", "vessel route deviation", "proximity to sanctioned ports"],
            "evidence_against": ["No confirmed sanctions violation", "technical equipment failure possible"],
            "probability": "MODERATE",
        })
        hypotheses.append({
            "hypothesis":  "Technical equipment failure (AIS transponder malfunction)",
            "evidence_for": ["AIS gap could be equipment issue", "no corroborating OSINT"],
            "evidence_against": ["Pattern matches known sanctions-evasion routes", "multiple concurrent gaps"],
            "probability": "LOW",
        })
    if hostile > 0 and chokepoint_hits:
        hypotheses.append({
            "hypothesis":  "Hostile entity posturing near strategic chokepoint for area denial",
            "evidence_for": [f"Hostile tracks near {list(chokepoint_hits.keys())[0]}", "elevated threat scores"],
            "evidence_against": ["No active engagement indicators", "could be transit"],
            "probability": "MODERATE",
        })

    # Indicators & Warnings
    indicators = []
    if threat_score > 70:
        indicators.append("WATCH: Threat score exceeds WATCHCON threshold. Recommend increased collection posture.")
    if dark_ships:
        indicators.append("WATCH: Dark vessel activity — monitor for port calls at sanctioned facilities.")
    if chokepoint_hits:
        for cp in chokepoint_hits:
            indicators.append(f"WATCH: {cp} — monitor for transit disruption or area denial posturing.")
    if not indicators:
        indicators.append("ROUTINE: Continue normal collection. No immediate indicators of escalation.")

    # Collection gaps
    gaps = []
    if unknown > 0:
        gaps.append(f"Identity resolution required for {unknown} unknown-affiliation entities.")
    if not dark_ships and len([e for e in entities.values() if e.get("source") == "AIS"]) == 0:
        gaps.append("No AIS maritime feed — vessel tracking gap in operational area.")
    gaps.append("Human intelligence (HUMINT) and signals intelligence (SIGINT) required to confirm or deny assessed intent.")

    # Summary
    cp_text = f" Chokepoint activity detected at: {', '.join(chokepoint_hits.keys())}." if chokepoint_hits else ""
    summary = (
        f"Operational area contains {total} tracked entities ({hostile} hostile, {unknown} unknown, "
        f"{total - hostile - unknown} friendly/neutral).{cp_text} "
        f"{'Critical threat indicators present.' if critical_t else 'No critical threat indicators.'} "
        f"Composite threat index: {threat_score}/100."
    )

    sources = ["ADS-B", "AIS", "CoT", "OSINT/GDELT", "FIRMS", "USGS", "ACLED"]
    if macro:
        sources.append("Macroeconomic (WB/IMF/FRED)")

    return Intelligence(
        title       = "SITREP — AEGIS OPERATIONAL PICTURE",
        summary     = summary,
        keyFindings = findings,
        threatScore = threat_score,
        confidence  = confidence,
        sources     = sources,
        indicators  = indicators,
        hypotheses  = hypotheses,
        collectionGaps = gaps,
    )


def build_entity_assessment(
    entity:    dict[str, Any],
    threat:    dict[str, Any] | None,
    anomaly:   dict[str, Any] | None,
    sightings: list[dict],
    macro:     dict[str, Any] | None = None,
) -> Intelligence:
    """Deep AI assessment of a single entity."""
    uid      = entity.get("uid", "UNKNOWN")
    callsign = entity.get("callsign") or uid[:8]
    etype    = entity.get("entityType", "unknown")
    affil    = entity.get("affiliation", "unknown")
    source   = entity.get("source", "UNKNOWN")
    lat      = entity.get("lat")
    lon      = entity.get("lon")
    speed    = entity.get("speed") or 0
    heading  = entity.get("heading") or 0

    threat_score = threat.get("score", _affiliation_risk(affil)) if threat else _affiliation_risk(affil)
    threat_level = threat.get("level", "Low") if threat else "Low"
    reasons      = threat.get("reasons", []) if threat else []
    flags        = anomaly.get("flags", []) if anomaly else []
    anom_score   = anomaly.get("score", 0) if anomaly else 0

    # Chokepoint proximity
    proximity = _chokepoint_proximity(lat, lon) if lat and lon else []

    # Sighting pattern analysis
    speeds = [s.get("speed", 0) or 0 for s in sightings if s.get("speed") is not None]
    speed_variance = statistics.stdev(speeds) if len(speeds) > 2 else 0
    erratic = speed_variance > 20

    # Build findings
    findings = []
    findings.append(f"Entity {callsign} ({etype.upper()}) classified {affil.upper()} via {source} feed. Threat score: {threat_score}/100 ({threat_level.upper()}).")
    if reasons:
        findings.append(f"Threat factors: {'; '.join(reasons)}.")
    if flags:
        findings.append(f"ANOMALY FLAGS: {', '.join(flags)}. Anomaly severity score: {anom_score:.2f}.")
    if proximity:
        cp_name, dist_nm = proximity[0]
        findings.append(f"Entity is {dist_nm}nm from {cp_name} — a Tier-{STRATEGIC_CHOKEPOINTS[cp_name]['criticality']} strategic chokepoint.")
    if erratic:
        findings.append(f"Speed variance ({speed_variance:.1f} kts σ) across {len(sightings)} sightings indicates erratic movement — possible evasive maneuvering or equipment malfunction.")
    if "DARK_SHIP" in flags:
        findings.append("DARK SHIP: Extended AIS silence. Assess: possible sanctions evasion, covert port call, or deliberate emissions control.")
    if affil == "hostile" and proximity:
        findings.append(f"HOSTILE entity proximate to {proximity[0][0]}. Assess: potential area denial posturing or intelligence collection. Elevated readiness recommended.")

    # Hypotheses
    hypotheses = []
    if affil == "hostile":
        hypotheses.append({
            "hypothesis":  "Deliberate reconnaissance / intelligence collection mission",
            "evidence_for": [f"Hostile affiliation", f"Proximity to {proximity[0][0] if proximity else 'strategic area'}"],
            "evidence_against": ["Normal commercial route possible"],
            "probability": "MODERATE" if threat_score > 50 else "LOW",
        })
    if "DARK_SHIP" in flags:
        hypotheses.append({
            "hypothesis":  "Sanctions evasion — covert cargo transfer or port call",
            "evidence_for": ["AIS silence", "irregular speed pattern"],
            "evidence_against": ["No confirmed cargo manifest", "equipment failure possible"],
            "probability": "MODERATE",
        })

    confidence = "HIGH" if len(sightings) > 10 else ("MODERATE" if len(sightings) > 3 else "LOW")

    return Intelligence(
        title       = f"ENTITY ASSESSMENT — {callsign}",
        summary     = f"{callsign} is a {affil.upper()} {etype} tracked via {source}. Current position: {lat:.4f}N, {lon:.4f}E. Speed: {speed:.1f} kts heading {heading:.0f}°. Threat index: {threat_score}/100.",
        keyFindings = findings,
        threatScore = threat_score,
        confidence  = confidence,
        sources     = [source, "ACLED", "OpenSanctions"],
        indicators  = [f"Monitor {callsign} for route changes, port calls, or rendezvous with other flagged entities."],
        hypotheses  = hypotheses,
        collectionGaps = [
            "Vessel ownership registry cross-check (OpenSanctions/OFAC)",
            "SIGINT correlation for communications activity",
            "Pattern-of-life baseline requires 30+ day track history",
        ],
    )


# ── Cross-domain correlation engine ──────────────────────────────────────────

def correlate_domains(
    entities:  dict[str, Any],
    threats:   list[dict],
    anomalies: list[dict],
    macro:     dict[str, Any] | None,
    events:    list[dict] | None = None,
) -> list[CrossDomainSignal]:
    """
    Detect correlations across military, economic, and political domains.
    Returns list of significant cross-domain signals.
    """
    signals: list[CrossDomainSignal] = []

    hostile_count   = sum(1 for e in entities.values() if e.get("affiliation") == "hostile")
    dark_ships      = sum(1 for a in anomalies if "DARK_SHIP" in (a.get("flags") or []))
    critical_threats = sum(1 for t in threats if t.get("level") in ("Critical", "High"))

    # Signal: Military surge + economic stress
    if macro and hostile_count > 3:
        # Check if key adversary currencies are stressed
        fx = macro.get("fx", {}).get("rates", {})
        iran_rial_proxy = fx.get("IRR")  # Iranian Rial (if available)
        if iran_rial_proxy or hostile_count > 5:
            signals.append(CrossDomainSignal(
                domains    = ["Maritime/Military", "Macroeconomic"],
                signal     = f"Elevated hostile entity count ({hostile_count}) coincides with regional economic stress indicators. Adversary may be conducting covert operations to offset sanctions pressure.",
                strength   = min(1.0, hostile_count * 0.1 + (0.3 if dark_ships > 0 else 0)),
                direction  = "escalatory",
                confidence = "MODERATE",
            ))

    # Signal: Dark ships near chokepoints
    if dark_ships > 0:
        dark_entities = [e for e in entities.values() if
                         any(a.get("entityUid") == e.get("uid") and "DARK_SHIP" in (a.get("flags") or [])
                             for a in anomalies)]
        for entity in dark_entities:
            lat, lon = entity.get("lat"), entity.get("lon")
            if lat and lon:
                nearby = _chokepoint_proximity(lat, lon)
                if nearby and nearby[0][1] < 100:
                    signals.append(CrossDomainSignal(
                        domains    = ["Maritime", "Sanctions/Economic"],
                        signal     = f"Dark vessel near {nearby[0][0]} ({nearby[0][1]}nm). Pattern consistent with sanctions-busting oil transfer or covert logistics support to embargoed actor.",
                        strength   = 0.75,
                        direction  = "escalatory",
                        confidence = "MODERATE",
                    ))

    # Signal: Multiple critical threats = coordinated operation
    if critical_threats >= 3:
        signals.append(CrossDomainSignal(
            domains    = ["Military", "Intelligence"],
            signal     = f"{critical_threats} simultaneous critical-level threats detected. Statistical probability of independent occurrence is low. Assess: possible coordinated multi-domain operation.",
            strength   = min(1.0, critical_threats * 0.15),
            direction  = "escalatory",
            confidence = "HIGH" if critical_threats >= 5 else "MODERATE",
        ))

    if not signals:
        signals.append(CrossDomainSignal(
            domains    = ["All"],
            signal     = "No significant cross-domain correlations detected in current data window. Operational picture is within normal parameters.",
            strength   = 0.0,
            direction  = "ambiguous",
            confidence = "LOW",
        ))

    return signals


# ── LLM-enhanced narrative generation ────────────────────────────────────────

async def enhance_with_llm(intel: Intelligence, context_json: str) -> Intelligence:
    """
    Augments a template-based Intelligence object with LLM-generated narrative.
    Falls back gracefully if no LLM is available.
    """
    base_url, _, model = _llm_available()
    if not base_url:
        intel.llmNarrative = (
            f"[AI OFFLINE — TEMPLATE ANALYSIS ONLY] {intel.summary} "
            f"To enable AI narrative synthesis, install Ollama (ollama.com) and run: "
            f"ollama pull llama3.2:3b — or set MSS_GROQ_API_KEY environment variable."
        )
        return intel

    # Compose the user message
    user_msg = f"""Current operational data:
{context_json}

Pre-computed assessment:
- Threat Score: {intel.threatScore}/100
- Confidence: {intel.confidence}
- Key Findings: {json.dumps(intel.keyFindings)}
- Competing Hypotheses: {json.dumps(intel.hypotheses)}

Generate a finished intelligence assessment following the MAVEN analytical framework. Include:
1. Executive summary (2 sentences, decision-maker grade)
2. Most likely course of action by hostile actors
3. Most dangerous course of action
4. Recommended collection priorities
5. Indicators that would trigger escalation to next threat level

Format as a concise finished intelligence product. Use IC-standard confidence language."""

    messages = [
        {"role": "system", "content": MAVEN_SYSTEM_PROMPT},
        {"role": "user",   "content": user_msg},
    ]

    narrative = await _llm_chat(messages, max_tokens=800)
    if narrative:
        intel.llmNarrative = narrative
        log.info("LLM narrative generated via %s (%s)", base_url, model)
    else:
        intel.llmNarrative = f"[LLM QUERY FAILED — model: {model}] Template analysis available above."

    return intel


# ── MAVEN Tool definitions (OpenAI function-calling format) ───────────────────

MAVEN_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_entity_summary",
            "description": "Returns a count summary of all tracked entities grouped by type and affiliation.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_threats",
            "description": "Returns the highest-scoring threat entities with reasons.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Max threats to return (default 10)"},
                    "min_score": {"type": "integer", "description": "Minimum threat score filter (0-100)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies",
            "description": "Returns entities with detected behavioral anomalies (dark ships, impossible speed, heading thrash, loitering).",
            "parameters": {
                "type": "object",
                "properties": {
                    "flag_filter": {"type": "string", "description": "Filter by anomaly flag: DARK_SHIP, IMPOSSIBLE_SPEED, HEADING_THRASH, LOITERING, SPEED_ANOMALY"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_chokepoint_activity",
            "description": "Returns entity counts near each strategic maritime chokepoint (Hormuz, Bab-el-Mandeb, Malacca, Taiwan Strait, Suez, etc.).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_entity_details",
            "description": "Returns detailed information about a specific entity by callsign or UID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "identifier": {"type": "string", "description": "Entity callsign or UID"},
                },
                "required": ["identifier"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cross_domain_signals",
            "description": "Returns cross-domain correlation signals (military × economic × maritime intelligence correlations).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_hostile_entities",
            "description": "Returns all entities classified as hostile with their current positions and threat scores.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def _execute_tool(
    name: str,
    args: dict,
    data_ctx: dict,  # {entities, threats, anomalies, clusters}
) -> str:
    """Execute a MAVEN tool call and return the result as a JSON string."""
    entities  = data_ctx.get("entities", {})
    threats   = data_ctx.get("threats", [])
    anomalies = data_ctx.get("anomalies", [])
    clusters  = data_ctx.get("clusters", [])

    try:
        if name == "get_entity_summary":
            summary = {"total": 0, "by_affiliation": {}, "by_type": {}, "by_source": {}}
            for e in entities.values():
                summary["total"] += 1
                a = e.get("affiliation", "unknown")
                t = e.get("entityType", "unknown")
                s = e.get("source", "UNKNOWN")
                summary["by_affiliation"][a] = summary["by_affiliation"].get(a, 0) + 1
                summary["by_type"][t]        = summary["by_type"].get(t, 0) + 1
                summary["by_source"][s]      = summary["by_source"].get(s, 0) + 1
            return json.dumps(summary)

        elif name == "get_top_threats":
            limit     = args.get("limit", 10)
            min_score = args.get("min_score", 0)
            filtered  = [t for t in threats if t.get("score", 0) >= min_score]
            top       = sorted(filtered, key=lambda x: -x.get("score", 0))[:limit]
            return json.dumps([{
                "callsign": t.get("callsign"),
                "uid":      t.get("uid"),
                "score":    t.get("score"),
                "level":    t.get("level"),
                "reasons":  t.get("reasons", []),
                "affiliation": entities.get(t.get("uid", ""), {}).get("affiliation"),
                "source":      entities.get(t.get("uid", ""), {}).get("source"),
            } for t in top])

        elif name == "get_anomalies":
            flag = args.get("flag_filter")
            out  = [a for a in anomalies if (not flag or flag in (a.get("flags") or []))]
            return json.dumps([{
                "entityUid": a.get("entityUid"),
                "callsign":  entities.get(a.get("entityUid", ""), {}).get("callsign"),
                "score":     a.get("score"),
                "severity":  a.get("severity"),
                "flags":     a.get("flags", []),
                "details":   a.get("details", []),
            } for a in out[:20]])

        elif name == "get_chokepoint_activity":
            activity = {}
            for name_cp, cp in STRATEGIC_CHOKEPOINTS.items():
                count = sum(
                    1 for e in entities.values()
                    if e.get("lat") and _haversine_nm(
                        e["lat"], e.get("lon", 0), cp["lat_c"], cp["lon_c"]
                    ) < cp["radius_nm"] * 2
                )
                hostile_near = sum(
                    1 for e in entities.values()
                    if e.get("lat") and e.get("affiliation") == "hostile"
                    and _haversine_nm(e["lat"], e.get("lon", 0), cp["lat_c"], cp["lon_c"]) < cp["radius_nm"] * 2
                )
                if count > 0:
                    activity[name_cp] = {
                        "total": count,
                        "hostile": hostile_near,
                        "criticality": cp["criticality"],
                    }
            return json.dumps(activity)

        elif name == "get_entity_details":
            identifier = args.get("identifier", "").upper()
            match = next(
                (e for e in entities.values()
                 if (e.get("callsign") or "").upper() == identifier
                 or (e.get("uid") or "").upper() == identifier),
                None,
            )
            if not match:
                return json.dumps({"error": f"Entity '{identifier}' not found"})
            threat = next((t for t in threats if t.get("uid") == match.get("uid")), None)
            anom   = next((a for a in anomalies if a.get("entityUid") == match.get("uid")), None)
            return json.dumps({**match, "threat": threat, "anomaly": anom})

        elif name == "get_cross_domain_signals":
            signals = correlate_domains(entities, threats, anomalies, macro=None)
            return json.dumps([s.as_dict() for s in signals])

        elif name == "get_hostile_entities":
            hostiles = [e for e in entities.values() if e.get("affiliation") == "hostile"]
            result   = []
            for e in hostiles:
                t = next((th for th in threats if th.get("uid") == e.get("uid")), None)
                nearby = _chokepoint_proximity(e.get("lat") or 0, e.get("lon") or 0)
                result.append({
                    "callsign":    e.get("callsign"),
                    "uid":         e.get("uid"),
                    "entityType":  e.get("entityType"),
                    "source":      e.get("source"),
                    "lat":         e.get("lat"),
                    "lon":         e.get("lon"),
                    "speed":       e.get("speed"),
                    "heading":     e.get("heading"),
                    "threatScore": t.get("score") if t else None,
                    "nearChokepoint": nearby[0][0] if nearby and nearby[0][1] < 150 else None,
                })
            return json.dumps(result[:30])

    except Exception as e:
        return json.dumps({"error": str(e)})

    return json.dumps({"error": f"Unknown tool: {name}"})


async def _llm_chat_with_tools(
    messages:   list[dict],
    tools:      list[dict],
    data_ctx:   dict,
    max_tokens: int = 1200,
    max_rounds: int = 5,
) -> str:
    """
    Agentic tool-use loop (Anthropic-style):
    1. Send messages + tool definitions to LLM
    2. If model requests tool calls → execute them → append results → repeat
    3. Return final text response when model stops calling tools
    """
    base_url, api_key, model = _llm_available()
    if not base_url:
        return ""

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    current_messages = list(messages)

    for round_num in range(max_rounds):
        payload = {
            "model":      model,
            "messages":   current_messages,
            "tools":      tools,
            "max_tokens": max_tokens,
            "temperature": 0.3,
        }

        try:
            async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
                r = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if r.status_code != 200:
                    log.debug("LLM tool call failed: %s", r.text[:200])
                    return ""

                resp = r.json()
                choice  = resp["choices"][0]
                message = choice["message"]
                finish  = choice.get("finish_reason", "stop")

                # Done — return text content
                if finish in ("stop", "length") or not message.get("tool_calls"):
                    return message.get("content") or ""

                # Tool calls requested — execute them
                current_messages.append(message)

                tool_results = []
                for tc in message.get("tool_calls", []):
                    fn_name = tc["function"]["name"]
                    fn_args = json.loads(tc["function"].get("arguments", "{}"))
                    log.info("MAVEN tool call: %s(%s)", fn_name, fn_args)
                    result = _execute_tool(fn_name, fn_args, data_ctx)
                    tool_results.append({
                        "role":         "tool",
                        "tool_call_id": tc["id"],
                        "content":      result,
                    })

                current_messages.extend(tool_results)

        except Exception as e:
            log.debug("LLM tool loop error: %s", e)
            return ""

    return ""


async def llm_query(question: str, operational_context: dict) -> str:
    """
    Answer an ad-hoc natural language intelligence question using agentic tool use.
    MAVEN decides which data to fetch, calls tools autonomously, then synthesizes.
    Falls back to simple completion if tools not supported by backend.
    """
    base_url, _, model = _llm_available()
    if not base_url:
        return ("[AI OFFLINE] Install Ollama and run `ollama pull llama3.2:3b` to enable natural language queries. "
                "Or set MSS_GROQ_API_KEY for cloud inference.")

    # Build data context from operational_context (entities/threats/anomalies already computed)
    data_ctx = {
        "entities":  operational_context.get("_entities", {}),
        "threats":   operational_context.get("_threats", []),
        "anomalies": operational_context.get("_anomalies", []),
        "clusters":  operational_context.get("_clusters", []),
    }

    messages = [
        {"role": "system", "content": MAVEN_SYSTEM_PROMPT + "\n\nYou have access to real-time intelligence tools. Use them to gather precise data before answering. Always call at least one tool before providing your assessment."},
        {"role": "user",   "content": f"Intelligence query: {question}"},
    ]

    # Try agentic tool-use first
    result = await _llm_chat_with_tools(messages, MAVEN_TOOLS, data_ctx)

    # Fallback: simple completion with summarised context
    if not result:
        context_summary = {
            "entity_count":     operational_context.get("entity_count", 0),
            "hostile_count":    operational_context.get("hostile_count", 0),
            "critical_threats": operational_context.get("critical_threats", 0),
            "anomaly_count":    operational_context.get("anomaly_count", 0),
            "top_threats":      operational_context.get("top_threats", [])[:5],
        }
        fallback_messages = [
            {"role": "system", "content": MAVEN_SYSTEM_PROMPT},
            {"role": "user",   "content": f"Operational picture: {json.dumps(context_summary)}\n\nAnalyst question: {question}"},
        ]
        result = await _llm_chat(fallback_messages, max_tokens=600)

    return result if result else "[LLM query timed out. Check Ollama status or network connectivity.]"


async def generate_geopolitical_brief(
    entities:  dict[str, Any],
    threats:   list[dict],
    anomalies: list[dict],
    clusters:  list[dict],
    macro:     dict[str, Any] | None,
) -> Intelligence:
    """
    Full pipeline: template assessment → cross-domain correlation → LLM enhancement.
    This is the primary entry point for the /api/v1/ai/brief endpoint.
    """
    # Step 1: Template-based structured assessment
    intel = build_sitrep_template(entities, threats, anomalies, clusters, macro)

    # Step 2: Cross-domain correlation
    signals = correlate_domains(entities, threats, anomalies, macro)
    for sig in signals:
        if sig.direction == "escalatory" and sig.strength > 0.4:
            intel.keyFindings.append(f"CROSS-DOMAIN: {sig.signal}")

    # Step 3: Build compact context for LLM
    context = {
        "entity_count":      len(entities),
        "hostile_count":     sum(1 for e in entities.values() if e.get("affiliation") == "hostile"),
        "critical_threats":  len([t for t in threats if t.get("level") in ("Critical", "High")]),
        "anomaly_count":     len(anomalies),
        "top_threats":       [{"callsign": t.get("callsign"), "score": t.get("score"), "level": t.get("level"), "reasons": t.get("reasons", [])} for t in sorted(threats, key=lambda x: -x.get("score", 0))[:5]],
        "chokepoint_activity": {
            name: sum(1 for e in entities.values()
                      if e.get("lat") and _haversine_nm(e["lat"], e.get("lon", 0), cp["lat_c"], cp["lon_c"]) < cp["radius_nm"] * 2)
            for name, cp in STRATEGIC_CHOKEPOINTS.items()
        },
        "macro_stress": "unavailable" if not macro else "available",
        "correlation_signals": [s.as_dict() for s in signals if s.strength > 0.3],
    }

    # Step 4: LLM narrative (async, falls back if unavailable)
    intel = await enhance_with_llm(intel, json.dumps(context, indent=2))

    return intel


def get_llm_status() -> dict:
    """Returns the current LLM configuration status for the health endpoint."""
    base_url, _, model = _llm_available()
    if base_url:
        source = "Ollama (local)" if "11434" in base_url else ("Groq" if "groq" in base_url else "Custom")
        return {"available": True, "endpoint": source, "model": model}
    return {
        "available": False,
        "setup": "Install Ollama: curl https://ollama.ai/install.sh | sh && ollama pull llama3.2:3b",
        "alternative": "Set MSS_GROQ_API_KEY env var for free Groq cloud inference (llama3-8b-8192)",
    }
