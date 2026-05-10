/**
 * brain.ts — AEGIS-side TypeScript wrapper around the vendored Athena
 * Shared Brain (`vendored/athena-standalone/brain/athenaBrain.mjs`).
 *
 * Per AEGIS_BUILD_SPEC.md §6.3, every Substrate Mode engine, NPC, telemetry
 * emitter, and analytics consumer talks to the brain — not to upstream
 * internals directly. This file is the single integration surface AEGIS
 * sees; the vendored brain stays untouched per §6.2.
 *
 * Design points:
 *
 * 1. **Lazy load.** The vendored `athenaBrain.mjs` imports
 *    `../quadratic-ip/vectorStore.mjs` and `../quadratic-ip/logger.mjs`,
 *    neither of which is vendored (they are large, optional, and only
 *    needed at runtime against a real backend). Loading the brain via
 *    `import()` keeps the static bundler from crawling those paths so
 *    `npm run build` succeeds without them. If the runtime load fails
 *    (e.g. running Phase 0 in CI), every method here returns a no-op
 *    fallback rather than throwing.
 *
 * 2. **Spec parity, with documented divergences.** The six canonical
 *    methods named in spec §6.3 (`learn`, `recall`, `publishInsight`,
 *    `getSharedInsight`, `getConsensusPrediction`, `sync`) all exist
 *    upstream and pass through verbatim. Two have minor signature
 *    quirks vs. the spec text — both are noted on the corresponding
 *    method JSDoc and in
 *    `vendored/athena-standalone/BRAIN_API_REPORT.md`.
 *
 * 3. **Strong types.** AEGIS callers get TypeScript ergonomics; the
 *    upstream module is plain JS. Types here are the contract AEGIS
 *    relies on — when upstream changes, the wrapper either adapts or
 *    breaks loudly at typecheck.
 *
 * 4. **No direct engine calls.** Per §17.9, AEGIS code that wants
 *    cross-engine signal must go through this wrapper. If a needed
 *    capability is missing, add it to the brain interface upstream and
 *    refresh — never bypass.
 */

// ── Types ────────────────────────────────────────────────────────────

/** Market regime tags the upstream brain reasons over. */
export type MarketState =
  | 'bullish'
  | 'bearish'
  | 'volatile'
  | 'ranging'
  | 'crisis';

/** A single learning emitted by `learn(...)`. */
export interface BrainMemory {
  source: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  text: string;
}

/** Filter shape accepted by `recall(...)`. */
export interface RecallFilters {
  type?: string;
  source?: string;
  limit?: number;
}

/** What `getSharedInsight(...)` actually returns upstream — see §4 of BRAIN_API_REPORT.md. */
export interface SharedInsight {
  /**
   * Beliefs from every engine *other than* the one passed in. The keys are
   * engine IDs; the inner object maps each `MarketState` to a probability.
   */
  engines: Record<string, Partial<Record<MarketState, number>>>;
  /** QMIX-weighted consensus across the `engines` map. */
  consensus: Record<MarketState, number>;
  engineCount: number;
}

/** Shape returned by `getConsensusPrediction(asset)`. */
export interface ConsensusPrediction {
  asset: string;
  marketState: MarketState;
  probabilities: Record<MarketState, number>;
  /** 0..1 — how much the dominant state exceeds uniform. */
  confidence: number;
  activeEngines: number;
  totalEngines: number;
  assetPredictions: Array<{ engine: string; predictions: unknown[] }>;
  timestamp: number;
}

/** Phase 1 will replace this with the AEGIS Supabase client type. */
export type SupabaseClient = unknown;

// ── Lazy loader ──────────────────────────────────────────────────────

interface BrainModule {
  brain: {
    learn: (
      source: string,
      type: string,
      data: Record<string, unknown>,
    ) => Promise<BrainMemory | undefined>;
    recall: (query: string, filters?: RecallFilters) => Promise<BrainMemory[]>;
    publishInsight: (engineId: string, output: Record<string, unknown>) => void;
    getSharedInsight: (engineId: string) => SharedInsight;
    getConsensusPrediction: (asset: string) => ConsensusPrediction;
    sync: () => Promise<{ synced: boolean; reason?: string; beliefs?: number; memories?: number }>;
    pull: () => Promise<{ pulled: boolean; reason?: string }>;
    connectCloud: (client: SupabaseClient) => void;
    diagnostics: () => Record<string, unknown>;
    getBeliefs: () => Record<string, Partial<Record<MarketState, number>>>;
    getMixWeights: () => Record<string, number>;
    reportOutcome: (engineId: string, correct: boolean) => void;
    ENGINE_IDS: readonly string[];
    MARKET_STATES: readonly MarketState[];
  };
}

let _modulePromise: Promise<BrainModule | null> | null = null;
let _loadFailed = false;

/**
 * Lazy-import the vendored brain. Memoised — only loads once. Returns null
 * if the upstream module can't be resolved (e.g. its optional `quadratic-ip`
 * dependencies are absent at runtime). Phase 0 deliberately does not block
 * AEGIS startup on this — every wrapper method below tolerates a null.
 */
async function loadBrain(): Promise<BrainModule | null> {
  if (_loadFailed) return null;
  if (!_modulePromise) {
    // The vendored brain has *upstream-relative* imports
    // (`../quadratic-ip/vectorStore.mjs`, `../quadratic-ip/logger.mjs`) that
    // are intentionally not vendored — they are large, optional, and only
    // needed when running against a real backend. We must therefore prevent
    // Rollup from statically resolving the brain's import graph at build
    // time. The trick: build the path at runtime so the bundler's static
    // analyser has nothing to crawl. `@vite-ignore` alone is not enough —
    // Rollup's dependency walker still follows literal dynamic-import
    // strings. A computed path defeats it cleanly.
    const path =
      ['..', '..', 'vendored', 'athena-standalone', 'brain', 'athenaBrain.mjs'].join('/');
    _modulePromise = import(/* @vite-ignore */ path)
      .then((mod) => mod as unknown as BrainModule)
      .catch((err: unknown) => {
        _loadFailed = true;
        // eslint-disable-next-line no-console
        console.warn(
          '[brain.ts] Vendored athenaBrain.mjs unavailable; falling back to no-op stubs. Cause:',
          (err as Error)?.message,
        );
        return null;
      });
  }
  return _modulePromise;
}

const noopMemory: BrainMemory = {
  source: 'aegis_substrate',
  type: 'noop',
  data: {},
  timestamp: 0,
  text: '',
};

const noopSharedInsight: SharedInsight = {
  engines: {},
  consensus: { bullish: 0, bearish: 0, volatile: 0, ranging: 0, crisis: 0 },
  engineCount: 0,
};

const noopConsensus: ConsensusPrediction = {
  asset: '',
  marketState: 'ranging',
  probabilities: { bullish: 0, bearish: 0, volatile: 0, ranging: 0, crisis: 0 },
  confidence: 0,
  activeEngines: 0,
  totalEngines: 0,
  assetPredictions: [],
  timestamp: 0,
};

// ── Six canonical methods (spec §6.3) ────────────────────────────────

/**
 * `brain.learn(...)` — write a learning into the shared brain. Per spec
 * §6.3, this is how AEGIS-side modules emit signal that other engines
 * (including the L0..L-n cascade) can consume.
 *
 * Spec match: identical.
 *
 * @param engineName  source ID, e.g. `'aegis_substrate'`, `'aegis_npc'`
 * @param eventType   learning type
 * @param payload     arbitrary JSON-serialisable payload
 */
export async function learn(
  engineName: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<BrainMemory | undefined> {
  const mod = await loadBrain();
  if (!mod) return noopMemory;
  return mod.brain.learn(engineName, eventType, payload);
}

/**
 * `brain.recall(...)` — semantic + structured search across all
 * learnings. Vector store is tried first; falls back to KV substring
 * match if vector search fails or returns thin results.
 *
 * Spec match: identical. Filter keys: `type`, `source`, `limit`.
 */
export async function recall(
  query: string,
  filters: RecallFilters = {},
): Promise<BrainMemory[]> {
  const mod = await loadBrain();
  if (!mod) return [];
  return mod.brain.recall(query, filters);
}

/**
 * `brain.publishInsight(...)` — synchronous belief update. Side effects:
 * updates the engine's belief vector (if `output` contains `beliefs` or
 * `marketState`), pushes to the per-engine ring buffer, and auto-calls
 * `learn(...)` if the insight is "significant" (confidence > 0.7 or
 * signal === 'strong').
 *
 * Spec match: identical.
 */
export async function publishInsight(
  engineName: string,
  insightObj: Record<string, unknown>,
): Promise<void> {
  const mod = await loadBrain();
  if (!mod) return;
  mod.brain.publishInsight(engineName, insightObj);
}

/**
 * `brain.getSharedInsight(...)` — read aggregated signals from every
 * engine *other than* the one passed in.
 *
 * **Divergence note** (per `BRAIN_API_REPORT.md` §4): the spec text
 * suggests calls like `brain.getSharedInsight('market_sentiment', { domain })`,
 * but upstream takes a single engine-ID arg and returns the aggregated
 * peer view. There is no `(query, filters)` overload. To get filtered
 * sentiment, compose `recall()` plus this function.
 */
export async function getSharedInsight(
  engineName: string,
): Promise<SharedInsight> {
  const mod = await loadBrain();
  if (!mod) return noopSharedInsight;
  return mod.brain.getSharedInsight(engineName);
}

/**
 * `brain.getConsensusPrediction(...)` — QMIX-aggregated regime view for
 * a given asset/symbol. Stale beliefs (>10min) are excluded; the
 * confidence value is calibrated against uniform.
 *
 * Spec match: identical (upstream calls the arg `asset`; spec text says
 * `symbol` — same thing).
 */
export async function getConsensusPrediction(
  symbol: string,
): Promise<ConsensusPrediction> {
  const mod = await loadBrain();
  if (!mod) return { ...noopConsensus, asset: symbol };
  return mod.brain.getConsensusPrediction(symbol);
}

/**
 * `brain.sync()` — push local brain state to Supabase for cross-device
 * sharing.
 *
 * **Divergence note** (per `BRAIN_API_REPORT.md` §6): requires a prior
 * `connectCloud(supabaseClient)` call. Without one, returns
 * `{ synced: false, reason: 'No cloud connection' }`. Phase 0 does not
 * yet wire the cloud connection — that happens in Phase 1 at the auth
 * boundary.
 */
export async function sync(): Promise<{
  synced: boolean;
  reason?: string;
  beliefs?: number;
  memories?: number;
}> {
  const mod = await loadBrain();
  if (!mod) return { synced: false, reason: 'Brain unavailable' };
  return mod.brain.sync();
}

// ── Re-exported helpers (beyond the spec's six) ──────────────────────

/**
 * Pair the brain to AEGIS's Supabase client. Phase 1 calls this from the
 * auth boundary so `sync()` and `pull()` can talk to Supabase. Phase 0 is
 * a no-op.
 */
export async function connectCloud(client: SupabaseClient): Promise<void> {
  const mod = await loadBrain();
  if (!mod) return;
  mod.brain.connectCloud(client);
}

/** Reverse of `sync()` — pull cloud brain state into local. */
export async function pull(): Promise<{ pulled: boolean; reason?: string }> {
  const mod = await loadBrain();
  if (!mod) return { pulled: false, reason: 'Brain unavailable' };
  return mod.brain.pull();
}

/** Observability snapshot. Useful for dev panels. */
export async function diagnostics(): Promise<Record<string, unknown>> {
  const mod = await loadBrain();
  if (!mod) return { available: false };
  return { available: true, ...mod.brain.diagnostics() };
}

/** Feed a prediction outcome back into the QMIX online learner. */
export async function reportOutcome(
  engineName: string,
  correct: boolean,
): Promise<void> {
  const mod = await loadBrain();
  if (!mod) return;
  mod.brain.reportOutcome(engineName, correct);
}

// ── Aggregate object — convenience for the `brain.learn(...)` style ──

/**
 * Convenience aggregate so AEGIS-side callers can write
 * `import { brain } from '../lib/brain'` and use
 * `brain.learn(...)` / `brain.recall(...)` exactly as the spec examples
 * show. Each method on this object is the same wrapper above.
 */
export const brain = {
  learn,
  recall,
  publishInsight,
  getSharedInsight,
  getConsensusPrediction,
  sync,
  pull,
  connectCloud,
  diagnostics,
  reportOutcome,
};

export default brain;
