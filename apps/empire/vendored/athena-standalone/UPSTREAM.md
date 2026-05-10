# Athena-Standalone — vendored copy

> **Do not edit these files.** Per `AEGIS_BUILD_SPEC.md` §6.2 and §17.9, the
> only permitted edit is an import-path adjustment marked with
> `// VENDORED-PATH: <reason>`. Bugs and feature additions go to the original
> upstream codebase, then this vendored copy is refreshed wholesale.

## Source

- **Absolute path:** `/Users/alecdecarvalho/Downloads/Athena-Standalone/`
- **Upstream README:** `Athena-Standalone/README.md`
- **Commit/version:** unversioned upstream (working copy at the dates below)

## Copy date

`2026-04-27`

## Files copied

| Path (upstream) | Vendored at | Why |
|---|---|---|
| `brain/athenaBrain.mjs` | `brain/athenaBrain.mjs` | The Shared Brain — single integration substrate per spec §6.3. Every Substrate Mode engine reads/writes through this. |
| `core/athenaStore.ts` | `core/athenaStore.ts` | Athena state machine + 40+ tools. Phase 1 wires the Substrate-context system prompt against this. |
| `core/athenaTools.ts` | `core/athenaTools.ts` | Tool definitions used by `athenaStore.ts`. Co-vendored so the store remains coherent. |
| `core/featureSandbox.ts` | `core/featureSandbox.ts` | Web Worker sandbox manager (lifecycle, resource caps, message passing). Phase 2 in-game code execution wires against this. |
| `core/sandboxWorker.js` | `core/sandboxWorker.js` | The actual isolated execution worker. Pair with `featureSandbox.ts`. |
| `core/featureStore.ts` | `core/featureStore.ts` | "Dynamic feature store (Infinite Engine)" — feature lifecycle, versioning, inventory. Phase 2 publishing flow extends this. |
| `core/eventBridge.ts` | `core/eventBridge.ts` | Typed cross-store event bus. AEGIS-side may subscribe but should prefer the Brain interface. |
| `api/community-features.mjs` | `api/community-features.mjs` | Feature marketplace prototype. Phase 1 marketplace wraps this with B2B/B2C wallet semantics (per spec §11). |
| `api/validate-feature.mjs` | `api/validate-feature.mjs` | Static code-analysis curation pipeline. Phase 2 publish action runs through this. |

## What the AEGIS-side wrappers look like

Per the vendoring rule, AEGIS-specific code is in **separate** files that
import from the vendored copies, never inside them:

- `apps/empire/src/lib/brain.ts` — Thin TypeScript wrapper around
  `brain/athenaBrain.mjs`. Exposes the six canonical methods named in spec
  §6.3 (`learn`, `recall`, `publishInsight`, `getSharedInsight`,
  `getConsensusPrediction`, `sync`) plus diagnostic helpers. Lazy-loaded so
  optional upstream engines (`quadratic-ip/vectorStore.mjs` etc) being
  absent does not break AEGIS at build time.
- `apps/empire/src/substrate/telemetry/events.ts` — Substrate event taxonomy
  (spec §12.1) that emits via `brain.learn('aegis_substrate', ...)`.

## Known upstream import dependencies

The vendored files reference upstream-relative paths that are *not* part of
this vendored set:

- `brain/athenaBrain.mjs` imports from `../quadratic-ip/vectorStore.mjs` and
  `../quadratic-ip/logger.mjs`. The wrapper at `src/lib/brain.ts` lazy-loads
  the brain so AEGIS builds even when those optional engines are absent.
- `core/athenaStore.ts` imports from sibling stores (`empireStore`,
  `agentCardStore`, `matchStore`, etc) that exist upstream but are not
  vendored here. AEGIS does not import this file directly in Phase 0; Phase 1
  wiring will introduce a wrapper following the same pattern as
  `src/lib/brain.ts`.
- `core/featureSandbox.ts` imports from upstream `../store/empireStore`
  and `../store/expansionStore`. Same lazy-wrapper pattern will apply.
- `core/featureStore.ts` imports `./createPersistedStore` and
  `../data/athenaTools`. Same.

These dependencies are known and accepted. They do not block Phase 0 because
Phase 0 only wires the Brain interface; the rest is wired in Phase 1+.

## Refresh procedure

1. Replace the entire `vendored/athena-standalone/` directory with a fresh
   copy from `~/Downloads/Athena-Standalone/`.
2. Update the **Copy date** above.
3. Re-run `npm run typecheck && npm run build`.
4. If a wrapper (`src/lib/brain.ts` etc) breaks, **adapt the wrapper** — do
   not edit the vendored copy. If the upstream API genuinely diverged from
   what AEGIS needs, file an issue against Athena-Standalone and resolve it
   there before the next refresh.
5. See `BRAIN_API_REPORT.md` (this directory) for the spec-vs-actual API
   audit performed at copy time.

## Relevant spec sections

- §6.1 — three sibling Quadratic codebases AEGIS integrates with
- §6.2 — the vendoring rule (non-negotiable)
- §6.3 — the Shared Brain as the integration substrate
- §17.9 — common misreading: do NOT modify vendored code
