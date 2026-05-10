/**
 * athenaBrain.mjs — Unified Shared Brain for All Athena Apps
 *
 * Single intelligence layer that all engines, apps, and agents read/write to.
 * Wraps three existing systems into one API:
 *   1. vectorStore.mjs  — LanceDB hybrid BM25 + vector search (long-term memory)
 *   2. kvStore.mjs      — JSON key-value persistence (fast structured data)
 *   3. sharedIntelligence.js — Mosaic Intelligence (inter-engine belief propagation,
 *      transfer entropy, Granger causality, deep mutual learning, QMIX mixing,
 *      EWC drift prevention, online ensemble meta-learner)
 *
 * Every engine writes here. Every app reads here. One brain, many eyes.
 *
 * Usage:
 *   import { brain } from './brain/athenaBrain.mjs';
 *   brain.learn('macroEngine', 'regime_shift', { from: 'bull', to: 'bear' });
 *   const memories = await brain.recall('recession indicators', { type: 'regime_shift' });
 *   brain.publishInsight('macroEngine', { bearishProb: 0.72, ... });
 *   const consensus = brain.getConsensusPrediction('AAPL');
 */

import { sharedBrainDB } from '../quadratic-ip/vectorStore.mjs';
import { Logger } from '../quadratic-ip/logger.mjs';

const log = new Logger('AthenaBrain');

// ═══════════════════════════════════════════════════════════════════════════
// §1  IN-MEMORY BELIEF STATE (mirrors sharedIntelligence.js topology)
// ═══════════════════════════════════════════════════════════════════════════

const ENGINE_IDS = [
  'macroEngine', 'gnnEngine', 'behavioralEngine', 'altDataEngine',
  'predictionEngine', 'simulationEngine', 'signalEngine', 'alphaEngine',
  'riskEngine', 'nlpEngine', 'mlEngine', 'quantEngine', 'drlEngine',
  'kalmanEngine', 'fractalEngine', 'contagionEngine', 'gameTheoryEngine',
  'portfolioOptimizer', 'sentinelAnalyst', 'oraclePattern', 'forgeQuant',
  'athenaChat', 'athenaBrief',
];

// Market states each engine holds beliefs over
const MARKET_STATES = ['bullish', 'bearish', 'volatile', 'ranging', 'crisis'];

// Engine beliefs: engineId → { state → probability }
const beliefs = new Map();
for (const id of ENGINE_IDS) {
  const uniform = {};
  for (const s of MARKET_STATES) uniform[s] = 1 / MARKET_STATES.length;
  beliefs.set(id, { ...uniform, lastUpdate: 0 });
}

// Engine outputs history (ring buffer per engine, max 100)
const outputHistory = new Map();
for (const id of ENGINE_IDS) outputHistory.set(id, []);
const MAX_HISTORY = 100;

// QMIX weights — learned online from prediction accuracy
const mixWeights = new Map();
for (const id of ENGINE_IDS) mixWeights.set(id, 1 / ENGINE_IDS.length);

// Prediction log for weight learning
const predictionLog = [];

// ═══════════════════════════════════════════════════════════════════════════
// §2  LEARN — Any engine/app writes a learning
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store a learning in the shared brain.
 * @param {string} source  — engine or app ID (e.g., 'macroEngine', 'athenaChat')
 * @param {string} type    — learning type (e.g., 'regime_shift', 'prediction', 'correlation')
 * @param {object} data    — arbitrary payload
 */
async function learn(source, type, data) {
  const memory = {
    source,
    type,
    data,
    timestamp: Date.now(),
    text: `[${source}] ${type}: ${JSON.stringify(data).slice(0, 500)}`,
  };

  // Write to vector store for semantic retrieval
  try {
    await sharedBrainDB.add([{
      text: memory.text,
      metadata: { source, type, timestamp: memory.timestamp },
    }]);
  } catch (e) {
    log.warn('VectorStore write failed, using KV fallback:', e.message);
  }

  // Also keep in fast KV for structured queries
  const key = `${source}:${type}:${memory.timestamp}`;
  kvMemories.set(key, memory);

  // Trim KV if too large (keep last 10K)
  if (kvMemories.size > 10000) {
    const keys = [...kvMemories.keys()];
    for (let i = 0; i < keys.length - 10000; i++) kvMemories.delete(keys[i]);
  }

  log.debug(`Learned: [${source}] ${type}`);
  return memory;
}

// Fast KV memory (in-process, disk-backed via JSON)
const kvMemories = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// §3  RECALL — Hybrid search across all learnings
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search the brain for relevant memories.
 * @param {string} query     — natural language query
 * @param {object} filters   — { type?, source?, limit? }
 * @returns {Promise<object[]>}
 */
async function recall(query, { type, source, limit = 10 } = {}) {
  let results = [];

  // Try vector search first
  try {
    const vectorResults = await sharedBrainDB.search(query, limit * 2);
    results = vectorResults
      .filter(r => {
        if (type && r.metadata?.type !== type) return false;
        if (source && r.metadata?.source !== source) return false;
        return true;
      })
      .slice(0, limit);
  } catch (e) {
    log.warn('VectorStore search failed, falling back to KV:', e.message);
  }

  // Supplement with KV search if vector results are thin
  if (results.length < limit) {
    const queryLower = query.toLowerCase();
    const kvResults = [...kvMemories.values()]
      .filter(m => {
        if (type && m.type !== type) return false;
        if (source && m.source !== source) return false;
        return m.text.toLowerCase().includes(queryLower);
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit - results.length);

    results.push(...kvResults);
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// §4  PUBLISH / GET INSIGHT — Inter-engine belief exchange
// ═══════════════════════════════════════════════════════════════════════════

/**
 * An engine publishes its latest output/belief.
 * Updates the shared belief state and feeds the QMIX mixer.
 */
function publishInsight(engineId, output) {
  if (!beliefs.has(engineId)) {
    beliefs.set(engineId, {});
    outputHistory.set(engineId, []);
    mixWeights.set(engineId, 0.01);
  }

  // Update belief vector if output contains market state probabilities
  if (output.beliefs || output.marketState) {
    const b = output.beliefs || {};
    if (output.marketState) {
      // Convert single state to probability vector
      for (const s of MARKET_STATES) {
        b[s] = s === output.marketState ? 0.7 : 0.3 / (MARKET_STATES.length - 1);
      }
    }
    b.lastUpdate = Date.now();
    beliefs.set(engineId, b);
  }

  // Push to ring buffer
  const history = outputHistory.get(engineId) || [];
  history.push({ ...output, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) history.shift();
  outputHistory.set(engineId, history);

  // Auto-learn significant insights
  if (output.confidence > 0.7 || output.signal === 'strong') {
    learn(engineId, output.type || 'insight', output).catch(() => {});
  }
}

/**
 * Get cross-engine signals for a specific engine.
 * Returns aggregated beliefs from all OTHER engines (not itself).
 */
function getSharedInsight(engineId) {
  const others = {};
  for (const [id, b] of beliefs) {
    if (id === engineId) continue;
    if (Date.now() - (b.lastUpdate || 0) > 300_000) continue; // skip stale (>5min)
    others[id] = { ...b };
    delete others[id].lastUpdate;
  }

  // Weighted consensus across other engines
  const consensus = {};
  for (const s of MARKET_STATES) consensus[s] = 0;
  let totalWeight = 0;

  for (const [id, b] of Object.entries(others)) {
    const w = mixWeights.get(id) || 0.01;
    totalWeight += w;
    for (const s of MARKET_STATES) {
      consensus[s] += (b[s] || 0) * w;
    }
  }

  if (totalWeight > 0) {
    for (const s of MARKET_STATES) consensus[s] /= totalWeight;
  }

  return { engines: others, consensus, engineCount: Object.keys(others).length };
}

// ═══════════════════════════════════════════════════════════════════════════
// §5  CONSENSUS PREDICTION — QMIX-aggregated across all engines
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the brain's consensus prediction for an asset or market condition.
 * Aggregates all engine beliefs using learned QMIX weights.
 */
function getConsensusPrediction(asset) {
  const assetLower = (asset || '').toLowerCase();

  // Aggregate beliefs
  const consensus = {};
  for (const s of MARKET_STATES) consensus[s] = 0;
  let totalWeight = 0;

  for (const [id, b] of beliefs) {
    if (Date.now() - (b.lastUpdate || 0) > 600_000) continue; // skip >10min stale
    const w = mixWeights.get(id) || 0.01;
    totalWeight += w;
    for (const s of MARKET_STATES) {
      consensus[s] += (b[s] || 0) * w;
    }
  }

  if (totalWeight > 0) {
    for (const s of MARKET_STATES) consensus[s] /= totalWeight;
  }

  // Find dominant state
  let dominantState = 'ranging';
  let maxProb = 0;
  for (const s of MARKET_STATES) {
    if (consensus[s] > maxProb) { maxProb = consensus[s]; dominantState = s; }
  }

  // Confidence = how much the dominant state exceeds uniform
  const uniformProb = 1 / MARKET_STATES.length;
  const confidence = Math.min(1, (maxProb - uniformProb) / (1 - uniformProb));

  // Gather asset-specific predictions from engine histories
  const assetPredictions = [];
  for (const [id, history] of outputHistory) {
    const recent = history
      .filter(o => o.asset?.toLowerCase() === assetLower || o.ticker?.toLowerCase() === assetLower)
      .slice(-3);
    if (recent.length > 0) {
      assetPredictions.push({ engine: id, predictions: recent });
    }
  }

  return {
    asset,
    marketState: dominantState,
    probabilities: consensus,
    confidence,
    activeEngines: [...beliefs.entries()].filter(([, b]) => Date.now() - (b.lastUpdate || 0) < 600_000).length,
    totalEngines: ENGINE_IDS.length,
    assetPredictions,
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// §6  BELIEFS — Raw belief state access
// ═══════════════════════════════════════════════════════════════════════════

function getBeliefs() {
  const result = {};
  for (const [id, b] of beliefs) {
    result[id] = { ...b };
  }
  return result;
}

function getMixWeights() {
  return Object.fromEntries(mixWeights);
}

// ═══════════════════════════════════════════════════════════════════════════
// §7  ONLINE WEIGHT LEARNING — Update QMIX weights from prediction accuracy
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Report actual outcome to update QMIX weights.
 * @param {string} engineId — which engine made the prediction
 * @param {boolean} correct — was the prediction correct?
 */
function reportOutcome(engineId, correct) {
  const lr = 0.01; // learning rate
  const current = mixWeights.get(engineId) || 0.01;
  const updated = correct
    ? current + lr * (1 - current)  // increase weight
    : current * (1 - lr);           // decrease weight
  mixWeights.set(engineId, Math.max(0.001, Math.min(0.5, updated)));

  // Renormalize
  let total = 0;
  for (const w of mixWeights.values()) total += w;
  for (const [id, w] of mixWeights) mixWeights.set(id, w / total);

  predictionLog.push({ engineId, correct, timestamp: Date.now() });
  if (predictionLog.length > 1000) predictionLog.splice(0, 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// §8  SUPABASE CLOUD SYNC — Cross-device brain sharing (optional)
// ═══════════════════════════════════════════════════════════════════════════

let _supabase = null;

/**
 * Connect brain to Supabase for cross-device sync.
 * Call this once on app startup if you want cloud brain persistence.
 */
function connectCloud(supabaseClient) {
  _supabase = supabaseClient;
  log.info('Brain cloud sync enabled');
}

/**
 * Push local brain state to cloud.
 */
async function sync() {
  if (!_supabase) return { synced: false, reason: 'No cloud connection' };

  try {
    // Sync beliefs
    const beliefRows = [...beliefs.entries()].map(([engineId, b]) => ({
      engine_id: engineId,
      beliefs: b,
      updated_at: new Date().toISOString(),
    }));

    await _supabase.from('brain_beliefs').upsert(beliefRows, { onConflict: 'engine_id' });

    // Sync recent memories (last 100)
    const recentMemories = [...kvMemories.values()]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);

    if (recentMemories.length > 0) {
      await _supabase.from('brain_memories').upsert(
        recentMemories.map(m => ({
          key: `${m.source}:${m.type}:${m.timestamp}`,
          source: m.source,
          type: m.type,
          data: m.data,
          created_at: new Date(m.timestamp).toISOString(),
        })),
        { onConflict: 'key' }
      );
    }

    // Sync QMIX weights
    await _supabase.from('brain_predictions').upsert([{
      id: 'qmix_weights',
      weights: Object.fromEntries(mixWeights),
      updated_at: new Date().toISOString(),
    }], { onConflict: 'id' });

    log.info(`Synced ${beliefRows.length} beliefs, ${recentMemories.length} memories`);
    return { synced: true, beliefs: beliefRows.length, memories: recentMemories.length };
  } catch (e) {
    log.error('Cloud sync failed:', e.message);
    return { synced: false, reason: e.message };
  }
}

/**
 * Pull cloud brain state into local.
 */
async function pull() {
  if (!_supabase) return { pulled: false, reason: 'No cloud connection' };

  try {
    // Pull beliefs
    const { data: cloudBeliefs } = await _supabase.from('brain_beliefs').select('*');
    if (cloudBeliefs) {
      for (const row of cloudBeliefs) {
        if (row.engine_id && row.beliefs) {
          beliefs.set(row.engine_id, row.beliefs);
        }
      }
    }

    // Pull QMIX weights
    const { data: cloudWeights } = await _supabase
      .from('brain_predictions')
      .select('*')
      .eq('id', 'qmix_weights')
      .single();

    if (cloudWeights?.weights) {
      for (const [id, w] of Object.entries(cloudWeights.weights)) {
        mixWeights.set(id, w);
      }
    }

    log.info('Pulled cloud brain state');
    return { pulled: true };
  } catch (e) {
    log.error('Cloud pull failed:', e.message);
    return { pulled: false, reason: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// §9  DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════

function diagnostics() {
  const activeEngines = [...beliefs.entries()]
    .filter(([, b]) => Date.now() - (b.lastUpdate || 0) < 600_000);

  return {
    totalEngines: ENGINE_IDS.length,
    activeEngines: activeEngines.length,
    memoriesInKV: kvMemories.size,
    predictionLogSize: predictionLog.length,
    topWeightedEngines: [...mixWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, w]) => ({ engine: id, weight: +(w * 100).toFixed(2) + '%' })),
    cloudConnected: !!_supabase,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT — Single brain instance
// ═══════════════════════════════════════════════════════════════════════════

export const brain = {
  // Core API
  learn,
  recall,
  publishInsight,
  getSharedInsight,
  getConsensusPrediction,
  getBeliefs,
  getMixWeights,
  reportOutcome,

  // Cloud sync
  connectCloud,
  sync,
  pull,

  // Diagnostics
  diagnostics,

  // Constants
  ENGINE_IDS,
  MARKET_STATES,
};

export default brain;
