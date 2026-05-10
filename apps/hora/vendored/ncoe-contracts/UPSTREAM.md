# NCOE data contracts — vendored copy

> **Do not edit these files.** They are the canonical schema between NCOE
> (Quadratic backend) and AEGIS (this app). Per `AEGIS_BUILD_SPEC.md` §6.2,
> §7, and §17.9, both sides must move in lockstep — when a field changes, the
> upstream Python is authoritative, `spec_version` is bumped, both files are
> updated, and this vendored copy is refreshed wholesale. The only permitted
> edit is an import-path adjustment marked with `// VENDORED-PATH: <reason>`.

## Source

- **Absolute path:** `/Users/alecdecarvalho/Downloads/Substrate Hypothesis/Proof of concept/ncoe/contracts/`
- **Commit/version:** spec_version `"1.0"` (current at the date below)

## Copy date

`2026-04-27`

## Files copied

| Path (upstream) | Vendored at | Why |
|---|---|---|
| `venture_spec.ts` | `venture_spec.ts` | Canonical TypeScript types for `VentureSpec` and `VentureAttempt`. AEGIS imports these via `src/substrate/types.ts`. |
| `venture_spec.py` | `venture_spec.py` | Canonical Python dataclasses (NCOE side). Treat as **authoritative** if any drift exists between TS and Python — Python runs validators that the TS side must mirror. |
| `example_drone_insurance.json` | `example_drone_insurance.json` | Worked example of a `VentureSpec` payload. Useful for contract tests and Phase 1 fixtures. |
| `README.md` | `README.md` | Contract documentation including tier-separation rules. |

## What the AEGIS-side wrappers look like

- `apps/hora/src/substrate/types.ts` — Re-exports the public types from
  `venture_spec.ts` (so AEGIS source code never imports vendored paths
  directly), plus AEGIS-only types: `VentureAttempt` storage fields beyond
  the wire shape, `SubstrateTosAcceptance`, `SubstrateTelemetryEvent`.

## Critical: firewall enforcement

Per spec §4.1 and the in-file note at the top of `venture_spec.ts`, this
contract describes **Substrate Mode artefacts only**. There is no field that
references, indexes, promotes to, or otherwise contaminates Academy / ECFL
content. If a future contract change introduces an Academy-adjacent field,
**reject it** — Academy has its own pipeline, governance, and data model.

## Refresh procedure

1. Replace the entire `vendored/ncoe-contracts/` directory with a fresh copy
   from `~/Downloads/Substrate Hypothesis/Proof of concept/ncoe/contracts/`.
2. Update the **Copy date** above.
3. If `spec_version` bumped, update the AEGIS-side type guards and runtime
   validators (Phase 1 work — see spec §15 and §16.2).
4. Re-run `npm run typecheck && npm run build` — if `src/substrate/types.ts`
   re-exports break, that signals a real schema change that needs lockstep
   handling per §7.

## Relevant spec sections

- §4.1 — Academy / ECFL firewall (non-negotiable)
- §6.2 — the vendoring rule
- §7 — data contracts
- §17.6 — ECFL is real and trademarked
- §17.9 — common misreading: do NOT modify vendored code
