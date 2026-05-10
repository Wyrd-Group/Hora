# Sentinel daemon — vendored copy

> **Do not edit these files.** Per `AEGIS_BUILD_SPEC.md` §6.2 and §17.9, the
> only permitted edit is an import-path adjustment marked with
> `// VENDORED-PATH: <reason>`. Bugs and feature additions go to the
> original upstream codebase, then this vendored copy is refreshed wholesale.

## Source

- **Absolute path:** `/Users/alecdecarvalho/Documents/Quantico Project /Quadratic/sentinel/`
- **Upstream README:** `Quadratic/sentinel/README.md` (also vendored here)
- **Commit/version:** unversioned upstream (working copy at the date below)

## Copy date

`2026-04-27`

## Files copied

| Path (upstream) | Vendored at | Why |
|---|---|---|
| `daemon.py` | `daemon.py` | Orchestrator pattern. Phase 1 NPC scheduler at `src/substrate/npc/scheduler.ts` mirrors this design (defensive try/except wrappers, configurable intervals). |
| `alerts.py` | `alerts.py` | `Alert` dataclass + dispatch. Phase 1 reshapes this into `NpcDecision` per spec §8.8. |
| `config.py` | `config.py` | Configurable thresholds pattern (Kelly %, edge %, confidence, bankroll). |
| `README.md` | `README.md` | Architectural overview kept alongside the code for context. |
| `scanners/__init__.py` | `scanners/__init__.py` | Package marker. |
| `scanners/forecast_scanner.py` | `scanners/forecast_scanner.py` | Per-feature scanner pattern. AEGIS NPC personas at `src/substrate/npc/personas/*.ts` follow the same single-responsibility shape. |
| `scanners/macro_scanner.py` | `scanners/macro_scanner.py` | Same. |
| `scanners/portfolio_scanner.py` | `scanners/portfolio_scanner.py` | Same. |
| `scanners/prediction_scanner.py` | `scanners/prediction_scanner.py` | Same. |
| `scanners/sports_scanner.py` | `scanners/sports_scanner.py` | Same. |

> Note: the upstream `data/` cache, `state.json`, `alerts_log.json`, and
> `__pycache__/` are intentionally **not** vendored — they are ephemeral
> runtime artefacts of the daemon, not architectural reference material.

## What this is for

Sentinel is a working autonomous-scanner prototype. AEGIS reuses its **pattern**
(not its code at runtime) for the AI-NPC engine described in spec §8 and §8.8.
Per §6.2, the AEGIS-specific NPC personas are **new TypeScript files** alongside
this vendored Python — not edits to it.

## What the AEGIS-side wrappers look like

Phase 0 establishes the vendoring; the actual NPC engine arrives in Phase 1.
Planned mapping (spec §8.8):

- `daemon.py` orchestrator → `src/substrate/npc/scheduler.ts`
- `scanners/*.py` per-feature → `src/substrate/npc/personas/*.ts`
- `alerts.py` `Alert` dataclass → `src/substrate/npc/decisions.ts` (`NpcDecision` shape)
- `config.py` thresholds pattern → AEGIS uses Brain `getSharedInsight` to read calibration from cross-engine consensus rather than a static config file

## Refresh procedure

1. Replace the entire `vendored/sentinel/` directory with a fresh copy from
   `~/Documents/Quantico Project /Quadratic/sentinel/` (excluding the
   ephemeral runtime artefacts listed above).
2. Update the **Copy date** above.
3. If the upstream `Alert` dataclass shape changes, update the AEGIS-side
   `NpcDecision` mapping at `src/substrate/npc/decisions.ts` — do not edit
   `alerts.py` here.

## Relevant spec sections

- §6.1 — three sibling Quadratic codebases AEGIS integrates with
- §6.2 — the vendoring rule (non-negotiable)
- §8 — AI-NPC client engine
- §8.8 — reuse the Sentinel scanner pattern (vendored, not modified)
- §17.9 — common misreading: do NOT modify vendored code
