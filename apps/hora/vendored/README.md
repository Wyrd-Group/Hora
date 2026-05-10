# vendored/

Source-of-truth third-party (Quadratic-sibling) code that AEGIS Substrate Mode
integrates with. **None of these files are owned by AEGIS** — every directory
here mirrors an upstream codebase that lives elsewhere, has its own consumers,
and has its own update cadence.

## The vendoring rule (non-negotiable)

Per `AEGIS_BUILD_SPEC.md` §6.2 and §17.9:

1. **Copy** the files we need under `apps/hora/vendored/<source-name>/`,
   mirroring upstream structure.
2. **Tag** each vendored directory with an `UPSTREAM.md` documenting source
   absolute path, copy date, files copied, and the do-not-modify notice.
3. **Do not edit** the vendored copies. AEGIS-specific behaviour goes in
   *separate* files alongside (or under `src/`) that import from the vendored
   copy. The Substrate Mode code that wires these in lives at:
     - `src/lib/brain.ts` — TypeScript wrapper around the Shared Brain
     - `src/substrate/` — Substrate Mode root + telemetry + types
     - `src/components/substrate/` — UI surfaces
4. **Refresh on a schedule, not on demand.** When upstream changes
   meaningfully, replace the entire vendored directory and re-test. Don't
   cherry-pick edits.
5. **Push fixes upstream, not into the vendored copy.** If you find a bug in
   `vendored/athena-standalone/core/sandboxWorker.js`, fix it in the original
   upstream file, then refresh the vendored copy. Every consumer stays in
   sync.

The **only permitted edit** to a vendored file is import-path adjustment to
match AEGIS's module resolution. Mark every such change with:

```
// VENDORED-PATH: <reason>
```

Anything else is a violation of §6.2 and will be rejected at review.

## Subdirectories

| Directory | Upstream | Purpose |
|---|---|---|
| `athena-standalone/` | `~/Downloads/Athena-Standalone/` | Shared Brain, sandbox runtime, feature marketplace prototype, code-validation pipeline, Athena state machine |
| `sentinel/` | `~/Documents/Quantico Project /Quadratic/sentinel/` | Autonomous Python scanner pattern — reference architecture for Phase 1 NPC scheduler |
| `openclaw-skills/` | `~/Documents/Quantico Project /Quadratic/openclaw_skills/` | Four already-callable Claude Code skill manifests (prediction-markets, sentinel, sports-betting, trading-desk) |
| `ncoe-contracts/` | `~/Downloads/Substrate Hypothesis/Proof of concept/ncoe/contracts/` | Canonical `VentureSpec` / `VentureAttempt` data contracts (TypeScript + Python) |

See each `UPSTREAM.md` for source paths, copy dates, and file inventories.

## When upstream changes

1. Re-copy the entire affected subdirectory from the source path documented
   in `UPSTREAM.md`.
2. Update the copy date in `UPSTREAM.md`.
3. Re-run `npm run typecheck && npm run build` — if anything breaks, the
   AEGIS-side wrappers (e.g. `src/lib/brain.ts`) must adapt. Do not edit the
   vendored files.
4. Document any contract drift in the wrapper file's JSDoc (see
   `athena-standalone/BRAIN_API_REPORT.md` for the precedent).

## See also

- `AEGIS_BUILD_SPEC.md` §6.1 — the three external Quadratic codebases
- `AEGIS_BUILD_SPEC.md` §6.2 — the vendoring rule, in full
- `AEGIS_BUILD_SPEC.md` §6.3 — the Shared Brain as the integration substrate
- `AEGIS_BUILD_SPEC.md` §17.9 — common misreading: do NOT modify vendored code
