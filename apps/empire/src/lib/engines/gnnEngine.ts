/**
 * gnnEngine.ts — Graph Neural Network & Systemic Risk Engine (Pure Functions + Gemma Enhancement)
 *
 * Ported from MVP gnnEngine.js. All functions are pure.
 *
 * Algorithms: PageRank, Louvain community detection,
 * DebtRank systemic risk, correlation matrix.
 *
 * Gemma-enhanced variants add systemic risk narratives.
 */

import { enhanceNetworkAnalysis, isOllamaAvailable } from './gemmaOllamaBridge';

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_DAMPING = 0.85;
const DEFAULT_ITERATIONS = 100;
const DEFAULT_LOUVAIN_ITER = 10;
const CONVERGENCE_TOL = 1e-6;

// ─── PageRank ────────────────────────────────────────────────────────────────

/**
 * Compute PageRank scores via power iteration on an adjacency matrix.
 *
 * PR(v) = (1-d)/N + d * sum_{u->v} PR(u) / out_degree(u)
 *
 * @param adjacency - N x N weighted adjacency matrix (adjacency[i][j] = weight of edge i->j)
 * @param damping - Damping factor (default 0.85)
 * @param iterations - Maximum power iteration steps (default 100)
 * @returns Array of PageRank scores (same order as adjacency rows)
 */
export function pageRank(
  adjacency: number[][],
  damping: number = DEFAULT_DAMPING,
  iterations: number = DEFAULT_ITERATIONS,
): number[] {
  const N = adjacency.length;
  if (N === 0) return [];

  let pr = new Array(N).fill(1 / N);

  // Precompute out-weights for each node
  const outWeight: number[] = adjacency.map(row => row.reduce((s, w) => s + w, 0));

  for (let iter = 0; iter < iterations; iter++) {
    const prNew = new Array(N).fill((1 - damping) / N);
    let diff = 0;

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        if (adjacency[i][j] > 0 && outWeight[i] > 0) {
          prNew[j] += damping * pr[i] * (adjacency[i][j] / outWeight[i]);
        }
      }
    }

    for (let i = 0; i < N; i++) {
      diff += Math.abs(prNew[i] - pr[i]);
    }

    pr = prNew;
    if (diff < CONVERGENCE_TOL) break;
  }

  // Normalize
  const total = pr.reduce((s, v) => s + v, 0);
  if (total > 0) {
    for (let i = 0; i < N; i++) pr[i] /= total;
  }

  return pr;
}

// ─── Louvain Community Detection ─────────────────────────────────────────────

/**
 * Louvain method for community detection on an undirected weighted graph.
 * Maximizes modularity Q = sum_{ij} [A_ij - k_i*k_j/(2m)] * delta(c_i, c_j) / (2m)
 *
 * @param adjacency - N x N symmetric weighted adjacency matrix
 * @returns Array of community assignments (integer label per node)
 */
export function louvainClustering(adjacency: number[][]): number[] {
  const N = adjacency.length;
  if (N === 0) return [];

  // Degree vector and total edge weight
  const k = new Float64Array(N);
  let m = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      k[i] += adjacency[i][j];
      m += adjacency[i][j];
    }
  }
  m /= 2;

  if (m === 0) {
    return Array.from({ length: N }, (_, i) => i);
  }

  // Initialize: each node in its own community
  const comm = new Int32Array(N);
  for (let i = 0; i < N; i++) comm[i] = i;

  const sigmaTot = new Float64Array(N);
  for (let i = 0; i < N; i++) sigmaTot[i] = k[i];
  const sigmaIn = new Float64Array(N);

  let improved = true;
  for (let pass = 0; pass < DEFAULT_LOUVAIN_ITER && improved; pass++) {
    improved = false;

    for (let i = 0; i < N; i++) {
      const ci = comm[i];

      // Sum weights from i to each community
      const weightToComm = new Map<number, number>();
      for (let j = 0; j < N; j++) {
        if (j !== i && adjacency[i][j] > 0) {
          const cj = comm[j];
          weightToComm.set(cj, (weightToComm.get(cj) ?? 0) + adjacency[i][j]);
        }
      }

      // Remove i from ci temporarily
      const kiCi = weightToComm.get(ci) ?? 0;
      sigmaTot[ci] -= k[i];
      sigmaIn[ci] -= 2 * kiCi;

      let bestComm = ci;
      let bestDeltaQ = 0;

      for (const [c, kiC] of weightToComm) {
        const dQ = kiC / m - (sigmaTot[c] * k[i]) / (2 * m * m);
        if (dQ > bestDeltaQ) {
          bestDeltaQ = dQ;
          bestComm = c;
        }
      }

      // Insert i into bestComm
      comm[i] = bestComm;
      const kiNew = weightToComm.get(bestComm) ?? 0;
      sigmaTot[bestComm] += k[i];
      sigmaIn[bestComm] += 2 * kiNew;

      if (bestComm !== ci) improved = true;
    }
  }

  return Array.from(comm);
}

// ─── DebtRank Systemic Risk ──────────────────────────────────────────────────

export interface DebtRankResult {
  systemicRisk: number;
  vulnerableNodes: number[];
  nodeScores: number[];
}

/**
 * DebtRank: measures systemic importance via propagated economic loss.
 * Based on Battiston et al. (2012).
 *
 * R(i) = sum_{j!=i} h_j(T) * v_j
 * where h_j(T) is distress after i defaults, v_j is economic value.
 *
 * @param exposures - N x N matrix of exposure weights (exposures[i][j] = i's exposure to j)
 * @param equity - Array of equity values for each node (used as economic value proxy)
 * @returns Systemic risk score, vulnerable node indices, and per-node scores
 */
export function debtRank(
  exposures: number[][],
  equity: number[],
): DebtRankResult {
  const N = exposures.length;
  if (N === 0) return { systemicRisk: 0, vulnerableNodes: [], nodeScores: [] };

  const totalEquity = equity.reduce((s, v) => s + v, 0);
  if (totalEquity === 0) return { systemicRisk: 0, vulnerableNodes: [], nodeScores: [] };

  // Economic value: proportional to equity share
  const value = equity.map(e => e / totalEquity);

  const nodeScores = new Array(N).fill(0);
  const maxSteps = 10;

  for (let shocked = 0; shocked < N; shocked++) {
    // Distress levels: 0 = healthy, 1 = fully distressed
    const h = new Array(N).fill(0);
    const propagated = new Array(N).fill(false);
    h[shocked] = 1;
    propagated[shocked] = true;

    for (let step = 0; step < maxSteps; step++) {
      const hNew = [...h];
      let changed = false;

      for (let j = 0; j < N; j++) {
        if (propagated[j]) continue;

        let incoming = 0;
        for (let k = 0; k < N; k++) {
          if (k === j) continue;
          // Propagate distress from k to j weighted by exposure
          const totalExposure = exposures[j].reduce((s, v) => s + v, 0);
          const w = totalExposure > 0 ? exposures[j][k] / totalExposure : 0;
          incoming += w * h[k];
        }

        hNew[j] = Math.min(1, h[j] + incoming);
        if (hNew[j] > h[j] + 0.001) changed = true;
        if (hNew[j] > 0.5) propagated[j] = true;
      }

      for (let j = 0; j < N; j++) h[j] = hNew[j];
      if (!changed) break;
    }

    // DebtRank of shocked node = sum of distress * value for all other nodes
    let dr = 0;
    for (let j = 0; j < N; j++) {
      if (j !== shocked) dr += h[j] * value[j];
    }
    nodeScores[shocked] = dr;
  }

  // Overall systemic risk = max DebtRank
  const systemicRisk = Math.max(...nodeScores);

  // Vulnerable nodes: those with DebtRank > 0.3
  const vulnerableNodes = nodeScores
    .map((score, idx) => ({ score, idx }))
    .filter(({ score }) => score > 0.3)
    .sort((a, b) => b.score - a.score)
    .map(({ idx }) => idx);

  return { systemicRisk, vulnerableNodes, nodeScores };
}

// ─── Correlation Matrix ──────────────────────────────────────────────────────

/**
 * Compute the Pearson correlation matrix from multiple price histories.
 *
 * @param priceHistories - Array of price history arrays (one per asset).
 *                         Each inner array should have the same length.
 * @returns N x N correlation matrix
 */
export function correlationMatrix(priceHistories: number[][]): number[][] {
  const N = priceHistories.length;
  if (N === 0) return [];

  // Convert prices to returns
  const returns: number[][] = priceHistories.map(prices => {
    const ret: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      ret.push(prices[i - 1] !== 0 ? (prices[i] - prices[i - 1]) / prices[i - 1] : 0);
    }
    return ret;
  });

  // Minimum overlapping length
  const minLen = Math.min(...returns.map(r => r.length));
  if (minLen < 2) return Array.from({ length: N }, () => new Array(N).fill(0));

  // Trim to same length
  const trimmed = returns.map(r => r.slice(0, minLen));

  // Compute means
  const means = trimmed.map(r => r.reduce((s, v) => s + v, 0) / r.length);

  // Compute covariances and variances
  const matrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      let num = 0;
      let di = 0;
      let dj = 0;

      for (let t = 0; t < minLen; t++) {
        const ai = trimmed[i][t] - means[i];
        const aj = trimmed[j][t] - means[j];
        num += ai * aj;
        di += ai * ai;
        dj += aj * aj;
      }

      const denom = Math.sqrt(di * dj);
      const rho = denom > 1e-12 ? num / denom : 0;
      matrix[i][j] = rho;
      matrix[j][i] = rho;
    }
  }

  return matrix;
}

// ── Living World: Network Analysis ──────────────────────────────

export interface WorldNetworkAnalysis {
  centrality: Record<string, number>;       // nodeId → PageRank score
  communities: Record<string, number>;      // nodeId → community index
  communityCount: number;
  systemicRisk: number;                     // 0-1 overall network fragility
  vulnerableNodes: string[];                // nodeIds with high systemic impact
}

/**
 * Analyze the living world venture network.
 * Uses PageRank for centrality, Louvain for communities,
 * and DebtRank for systemic risk assessment.
 *
 * @param nodeIds - Array of world node IDs
 * @param routes - Array of [fromIdx, toIdx, trafficScore] tuples
 */
export function worldNetworkAnalysis(
  nodeIds: string[],
  routes: Array<{ fromIdx: number; toIdx: number; traffic: number }>,
): WorldNetworkAnalysis {
  const n = nodeIds.length;
  if (n === 0) {
    return { centrality: {}, communities: {}, communityCount: 0, systemicRisk: 0, vulnerableNodes: [] };
  }

  // Build adjacency matrix from routes
  const adjacency: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const r of routes) {
    if (r.fromIdx < n && r.toIdx < n) {
      adjacency[r.fromIdx][r.toIdx] = r.traffic;
      adjacency[r.toIdx][r.fromIdx] = r.traffic;
    }
  }

  // PageRank for venture centrality
  const pr = pageRank(adjacency, 0.85, 30);
  const centrality: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    centrality[nodeIds[i]] = pr[i];
  }

  // Louvain for ecosystem detection
  const communityMap = louvainClustering(adjacency);
  const communities: Record<string, number> = {};
  const communitySet = new Set<number>();
  for (let i = 0; i < n; i++) {
    communities[nodeIds[i]] = communityMap[i];
    communitySet.add(communityMap[i]);
  }

  // DebtRank for systemic risk
  // Use traffic scores as "exposure" and uniform equity
  const exposures: number[][] = adjacency.map(row => {
    const total = row.reduce((s, v) => s + v, 0);
    return total > 0 ? row.map(v => v / total) : row;
  });
  const equity = new Array(n).fill(1);

  const dr = debtRank(exposures, equity);

  // Identify vulnerable nodes (top 10% by DebtRank score)
  const threshold = 0.7;
  const vulnerableNodes = Object.entries(dr.nodeScores)
    .filter(([, score]) => score > threshold)
    .map(([idx]) => nodeIds[parseInt(idx, 10)])
    .filter(Boolean);

  return {
    centrality,
    communities,
    communityCount: communitySet.size,
    systemicRisk: dr.systemicRisk,
    vulnerableNodes,
  };
}

// ─── Gemma-Enhanced Wrappers ────────────────────────────────────────────────

export interface EnhancedWorldNetworkAnalysis extends WorldNetworkAnalysis {
  gemmaAnalysis?: string;
}

/**
 * Gemma-enhanced network analysis: runs pure worldNetworkAnalysis()
 * then adds systemic risk narratives and cascade scenario explanations.
 */
export async function worldNetworkAnalysisWithGemma(
  nodeIds: string[],
  routes: Array<{ fromIdx: number; toIdx: number; traffic: number }>,
): Promise<EnhancedWorldNetworkAnalysis> {
  const analysis = worldNetworkAnalysis(nodeIds, routes);
  if (!isOllamaAvailable() || nodeIds.length === 0) return analysis;

  const topPageRank = Object.entries(analysis.centrality)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([nodeId, score]) => ({ nodeId, score }));

  const narrative = await enhanceNetworkAnalysis({
    systemicRisk: analysis.systemicRisk,
    vulnerableNodes: analysis.vulnerableNodes,
    communityCount: analysis.communityCount,
    topPageRank,
  });

  return { ...analysis, gemmaAnalysis: narrative || undefined };
}
