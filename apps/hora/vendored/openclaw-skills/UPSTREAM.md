# openclaw_skills — vendored copy

> **Do not edit these files.** Per `AEGIS_BUILD_SPEC.md` §6.2 and §17.9, the
> only permitted edit is a path adjustment marked with
> `// VENDORED-PATH: <reason>`. Bugs and feature additions go to the original
> upstream codebase, then this vendored copy is refreshed wholesale.

## Source

- **Absolute path:** `/Users/alecdecarvalho/Documents/Quantico Project /Quadratic/openclaw_skills/`
- **Commit/version:** unversioned upstream (working copy at the date below)

## Copy date

`2026-04-27`

## Files copied

| Path (upstream) | Vendored at | What |
|---|---|---|
| `prediction-markets/SKILL.md` | `prediction-markets/SKILL.md` | Polymarket / Manifold / Metaculus / Kalshi arbitrage skill manifest. |
| `sentinel/SKILL.md` | `sentinel/SKILL.md` | Sentinel-daemon control surface skill manifest. |
| `sports-betting/SKILL.md` | `sports-betting/SKILL.md` | Elo / Glicko-2 / Dixon-Coles / Kelly value bet skill manifest. |
| `trading-desk/SKILL.md` | `trading-desk/SKILL.md` | Portfolio optimisation + Chronos-2 / EWMA forecasting skill manifest. |

## Why this is vendored as reference, not as runnable code

These four skill manifests are **already-callable** Claude Code skills that
point at `localhost:8888` (the Athena-Standalone backend). AEGIS-side
Athena can invoke them as-is when the backend is running — the manifests do
not need to be executed by AEGIS itself. They are vendored here purely so the
contract (which skills exist, what arguments they take, what they return) is
locked at the date stamped above.

If upstream renames a skill argument, the vendored manifest here drifts from
reality until the next refresh. Treat the upstream files at
`~/Documents/Quantico Project /Quadratic/openclaw_skills/` as the live
specification; treat this vendored copy as the AEGIS-snapshot for code review
and integration tests.

## Refresh procedure

1. Replace the entire `vendored/openclaw-skills/` directory with a fresh copy
   from `~/Documents/Quantico Project /Quadratic/openclaw_skills/`.
2. Update the **Copy date** above.

## Relevant spec sections

- §6.1 — three sibling Quadratic codebases AEGIS integrates with
- §6.2 — the vendoring rule (non-negotiable)
- §17.9 — common misreading: do NOT modify vendored code
- §19 — Upstream codebases reference list
