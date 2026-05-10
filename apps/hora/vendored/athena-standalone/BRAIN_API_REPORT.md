# Brain API audit — actual vs. spec §6.3

> Date: 2026-04-27 — performed at vendor time as part of Phase 0.
> Source file inspected: `vendored/athena-standalone/brain/athenaBrain.mjs`
> (copied verbatim from `~/Downloads/Athena-Standalone/brain/athenaBrain.mjs`).

The Substrate spec §6.3 names six canonical brain methods that every Substrate
engine, NPC, telemetry emitter, and analytics consumer should use. This audit
records what the upstream brain *actually* exports, where the contract is
identical, where it diverges, and how the AEGIS-side wrapper at
`src/lib/brain.ts` papers over the gaps.

## Summary

| Method | Spec §6.3 | Actual upstream | Wrapper status |
|---|---|---|---|
| `learn(engineName, eventType, payload)` | ✅ | ✅ identical | Pass-through |
| `recall(query, filters)` | ✅ | ✅ identical (filter keys: `type`, `source`, `limit`) | Pass-through |
| `publishInsight(engineName, insightObj)` | ✅ | ✅ identical | Pass-through |
| `getSharedInsight(engineName)` | ✅ | ⚠️ shape divergence — see below | Pass-through (caller adapts) |
| `getConsensusPrediction(symbol)` | ✅ | ✅ identical (arg name `asset` upstream) | Pass-through |
| `sync()` | ✅ | ⚠️ requires prior `connectCloud(supabaseClient)` | Pass-through with note |

**Bottom line:** all six canonical methods exist with the spec's names. Two
have minor signature/behaviour divergences that the wrapper documents in
JSDoc rather than papering over — paper-over would silently change semantics
and that's worse than a documented quirk. No methods are missing. No issues
need filing upstream per §17.9.

## Method-by-method

### 1. `learn(source, type, data)` — spec §6.3 ✅ matches

Upstream signature (`brain.learn`):

```js
async function learn(source, type, data)
```

- `source` — engine or app ID (e.g., `'macroEngine'`, `'athenaChat'`,
  `'aegis_substrate'`)
- `type` — learning type
- `data` — arbitrary JSON-serialisable payload

Returns the stored memory object. Side effects: writes to vector store
(LanceDB via `sharedBrainDB`) **and** the in-process KV map. KV gets trimmed
to 10K entries.

**Spec match:** identical.

### 2. `recall(query, filters)` — spec §6.3 ✅ matches

Upstream signature (`brain.recall`):

```js
async function recall(query, { type, source, limit = 10 } = {})
```

Returns up to `limit` memory objects. Vector search is attempted first;
falls back to KV substring match if the vector store fails or returns thin
results.

**Spec match:** identical. Filter keys are `type` and `source`; the spec
text says "filters" generically and these two are sufficient.

### 3. `publishInsight(engineId, output)` — spec §6.3 ✅ matches

Upstream signature (`brain.publishInsight`):

```js
function publishInsight(engineId, output)
```

Synchronous. Side effects: updates the engine's belief vector (if `output`
contains `beliefs` or `marketState`), pushes to the per-engine ring buffer
(max 100 entries), and auto-calls `learn(...)` if the insight is "significant"
(`output.confidence > 0.7` or `output.signal === 'strong'`).

**Spec match:** identical.

### 4. `getSharedInsight(engineId)` — spec §6.3 ⚠️ shape divergence

Upstream signature:

```js
function getSharedInsight(engineId)
```

The **spec text** suggests reading "aggregated signals" by engine name
(simple call site). The **actual upstream** returns:

```js
{
  engines: { [engineId: string]: { [marketState: string]: number } },
  consensus: { bullish: number, bearish: number, volatile: number, ranging: number, crisis: number },
  engineCount: number,
}
```

That is, `getSharedInsight(engineId)` returns aggregated beliefs from every
**other** engine (not the one you passed), so the caller asking
"what is `aegis_substrate`'s shared view" gets back "what every engine that
isn't `aegis_substrate` thinks". This is the design — engines look outward
to learn what their peers believe.

The spec's `'market_sentiment'` example call (`brain.getSharedInsight('market_sentiment', { domain })`)
does **not** match upstream — there is no `(query, filters)` overload. To get
filtered sentiment, the caller composes `recall()` plus `getSharedInsight()`
manually.

**Wrapper handling:** the wrapper passes through verbatim and the JSDoc
documents the actual return shape. AEGIS-side callers (e.g. NPC personas in
Phase 1) follow the upstream pattern, not the spec example string.

### 5. `getConsensusPrediction(asset)` — spec §6.3 ✅ matches (arg name)

Upstream signature:

```js
function getConsensusPrediction(asset)
```

Returns:

```js
{
  asset: string,
  marketState: 'bullish' | 'bearish' | 'volatile' | 'ranging' | 'crisis',
  probabilities: Record<string, number>,
  confidence: number,        // 0..1, calibrated against uniform
  activeEngines: number,
  totalEngines: number,
  assetPredictions: Array<{ engine: string, predictions: any[] }>,
  timestamp: number,
}
```

Stale beliefs (>10min) are skipped. Confidence is the QMIX-aggregated belief
above uniform.

**Spec match:** identical (the spec calls the arg `symbol`; upstream uses
`asset` because it's matched case-insensitively against `output.asset` or
`output.ticker`. Functionally equivalent).

### 6. `sync()` — spec §6.3 ⚠️ requires prior cloud connection

Upstream signature:

```js
async function sync()
```

Returns `{ synced: boolean, beliefs?, memories?, reason? }`. **Requires**
`brain.connectCloud(supabaseClient)` to have been called first; otherwise
returns `{ synced: false, reason: 'No cloud connection' }`.

**Wrapper handling:** the wrapper documents the precondition in JSDoc.
Phase 0 does not yet call `connectCloud(...)` — that happens at the AEGIS
auth boundary in Phase 1, when the `useAuthStore` Supabase client is wired
in.

The wrapper exposes `connectCloud(client)` so the auth layer can pair the
brain to AEGIS's Supabase client without touching the vendored brain.

## Methods exposed beyond the spec's six

The upstream brain exports several additional methods. The wrapper passes
them through but they are **not** part of the contract the spec promises:

- `getBeliefs()` — raw belief state for diagnostics.
- `getMixWeights()` — current QMIX weights.
- `reportOutcome(engineId, correct)` — feeds the QMIX online learner.
- `pull()` — reverse of `sync()`. Phase 1 will call this on app startup.
- `diagnostics()` — observability snapshot (active engines, memory count, top
  weights, cloud-connected flag).
- `ENGINE_IDS` / `MARKET_STATES` — constants.

These are useful but not required by Phase 0. The wrapper re-exports them
for Phase 1 NPC engine + diagnostics work.

## What's missing for Phase 1?

Nothing critical. The brain has every method Phase 1 NPCs need
(`learn`, `recall`, `getSharedInsight`, `publishInsight`, `getConsensusPrediction`).

Two soft notes for later phases:

1. The brain has no built-in subscribe/notify mechanism — engines poll via
   `recall()` or `getSharedInsight()`. If Phase 3 needs reactive updates on
   high-velocity events, Athena-Standalone may need a brain-side event bus
   (separate from `core/eventBridge.ts`, which is store-scoped). File
   upstream when needed.
2. The KV store trims to 10K entries. For Phase 3+ NPC volumes (20K+ NPCs),
   AEGIS may need to push high-frequency NPC market events through Supabase
   directly rather than the brain's KV. The brain remains the right place
   for *insights*; raw transactions can bypass it.

## Recommendation per §17.9

**No upstream issues need filing.** The wrapper at `src/lib/brain.ts`:

1. Pass-through for all six canonical methods, with JSDoc on the two that
   diverge from the spec example text (`getSharedInsight`, `sync`).
2. Re-exports the additional helpers (`pull`, `diagnostics`, `connectCloud`,
   etc) for Phase 1 use.
3. Lazy-loads the brain via dynamic import so Phase 0 builds even if the
   upstream `quadratic-ip/vectorStore.mjs` and `quadratic-ip/logger.mjs`
   dependencies aren't present in the AEGIS build context (they are not
   vendored — they are large and only needed when the brain is actually
   exercised at runtime against a real backend).

This is the §17.9 ideal: vendored code untouched, divergences documented,
adaptation lives in the AEGIS-owned wrapper.
