/**
 * altDataEngine.ts — Alternative Data Signals (Pure Functions + Gemma Enhancement)
 *
 * Ported from MVP altDataEngine.js. All functions are pure.
 *
 * Processes: sentiment, social momentum, insider activity,
 * satellite imagery, supply chain, ESG scores.
 *
 * Gemma-enhanced variants add semantic sentiment narratives.
 */

import { enhanceSentimentAnalysis, isOllamaAvailable } from './gemmaOllamaBridge';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewsItem {
  headline: string;
  sentiment: number; // -1 to 1
  weight?: number;
  timestamp?: number;
}

export interface SentimentResult {
  aggregate: number;
  trend: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
}

export interface InsiderTrade {
  direction: 'buy' | 'sell';
  amount: number;
  role?: string;
}

export interface InsiderSignal {
  signal: string;
  confidence: number;
  netFlow: number;
  buyRatio: number;
}

export interface SatelliteData {
  parkingCapacityRatio?: number;
  factoryUtilization?: number;
  vesselCount?: number;
  vesselBaseline?: number;
  nightLightIntensity?: number;
  emissionsIndex?: number;
  cloudCover?: number;
}

export interface SupplyChainNode {
  id: string;
  dependents: string[];
  concentration: number; // 0-1 HHI
  leadTime: number;      // days
}

export interface ESGData {
  environmental: number; // 0-100
  governance: number;    // 0-100
  controversy: number;   // 0-100 (lower = worse)
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mu = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ─── Sentiment Processing ────────────────────────────────────────────────────

/**
 * Process news sentiment data into an aggregate signal.
 *
 * @param newsItems - Array of news items with headline and sentiment score
 * @returns Aggregate sentiment and trend classification
 */
export function processSentiment(newsItems: NewsItem[]): SentimentResult {
  if (newsItems.length === 0) {
    return { aggregate: 0, trend: 'neutral', bullishCount: 0, bearishCount: 0, neutralCount: 0 };
  }

  // Weight-adjusted sentiment average
  let weightedSum = 0;
  let totalWeight = 0;

  for (const item of newsItems) {
    const w = item.weight ?? 1;
    weightedSum += item.sentiment * w;
    totalWeight += w;
  }

  const aggregate = totalWeight > 0 ? clamp(weightedSum / totalWeight, -1, 1) : 0;

  // Count categories
  const bullishCount = newsItems.filter(n => n.sentiment > 0.2).length;
  const bearishCount = newsItems.filter(n => n.sentiment < -0.2).length;
  const neutralCount = newsItems.length - bullishCount - bearishCount;

  // Trend based on recent vs older items
  let trend: string;
  if (newsItems.length >= 4) {
    const half = Math.floor(newsItems.length / 2);
    const olderAvg = mean(newsItems.slice(0, half).map(n => n.sentiment));
    const newerAvg = mean(newsItems.slice(half).map(n => n.sentiment));
    const delta = newerAvg - olderAvg;

    if (delta > 0.15) trend = 'improving';
    else if (delta < -0.15) trend = 'deteriorating';
    else if (aggregate > 0.3) trend = 'bullish';
    else if (aggregate < -0.3) trend = 'bearish';
    else trend = 'neutral';
  } else {
    if (aggregate > 0.3) trend = 'bullish';
    else if (aggregate < -0.3) trend = 'bearish';
    else trend = 'neutral';
  }

  return {
    aggregate: Number(aggregate.toFixed(4)),
    trend,
    bullishCount,
    bearishCount,
    neutralCount,
  };
}

// ─── Social Momentum ─────────────────────────────────────────────────────────

/**
 * Calculate social momentum from mention counts and follower data.
 * Higher values indicate accelerating social attention.
 *
 * @param mentions - Array of daily mention counts (most recent last)
 * @param followers - Array of daily follower counts (most recent last)
 * @returns Momentum score (-1 to 1)
 */
export function socialMomentum(mentions: number[], followers: number[]): number {
  if (mentions.length < 2) return 0;

  // Mention velocity: compare recent half vs older half
  const half = Math.floor(mentions.length / 2);
  const olderMentions = mean(mentions.slice(0, half));
  const newerMentions = mean(mentions.slice(half));

  const mentionVelocity = olderMentions > 0
    ? (newerMentions - olderMentions) / olderMentions
    : newerMentions > 0 ? 1 : 0;

  // Follower growth rate
  let followerGrowth = 0;
  if (followers.length >= 2) {
    const start = followers[0];
    const end = followers[followers.length - 1];
    followerGrowth = start > 0 ? (end - start) / start : 0;
  }

  // Engagement anomaly: z-score of most recent mentions vs history
  const recentMentions = mentions[mentions.length - 1];
  const sigma = std(mentions);
  const mu = mean(mentions);
  const zScore = sigma > 0 ? (recentMentions - mu) / sigma : 0;

  // Composite: velocity + follower growth + anomaly
  const raw = 0.50 * clamp(mentionVelocity, -1, 1) +
              0.25 * clamp(followerGrowth * 10, -1, 1) +
              0.25 * clamp(zScore / 3, -1, 1);

  return Number(clamp(raw, -1, 1).toFixed(4));
}

// ─── Insider Activity ────────────────────────────────────────────────────────

/**
 * Analyze insider trading patterns for directional signal.
 *
 * @param trades - Array of insider trades with direction and amount
 * @returns Signal classification and confidence
 */
export function insiderActivity(trades: InsiderTrade[]): InsiderSignal {
  if (trades.length === 0) {
    return { signal: 'no_data', confidence: 0, netFlow: 0, buyRatio: 0 };
  }

  let buyVolume = 0;
  let sellVolume = 0;

  for (const t of trades) {
    if (t.direction === 'buy') buyVolume += t.amount;
    else sellVolume += t.amount;
  }

  const totalVolume = buyVolume + sellVolume;
  const netFlow = buyVolume - sellVolume;
  const buyRatio = totalVolume > 0 ? buyVolume / totalVolume : 0.5;

  let signal: string;
  let confidence: number;

  if (buyRatio > 0.75) {
    signal = 'strong_buy';
    confidence = Math.min(0.95, 0.5 + trades.length / 20);
  } else if (buyRatio > 0.55) {
    signal = 'mild_buy';
    confidence = Math.min(0.80, 0.3 + trades.length / 30);
  } else if (buyRatio < 0.25) {
    signal = 'strong_sell';
    confidence = Math.min(0.95, 0.5 + trades.length / 20);
  } else if (buyRatio < 0.45) {
    signal = 'mild_sell';
    confidence = Math.min(0.80, 0.3 + trades.length / 30);
  } else {
    signal = 'neutral';
    confidence = 0.3;
  }

  return {
    signal,
    confidence: Number(confidence.toFixed(4)),
    netFlow: Number(netFlow.toFixed(2)),
    buyRatio: Number(buyRatio.toFixed(4)),
  };
}

// ─── Satellite Imagery ───────────────────────────────────────────────────────

/**
 * Process satellite telemetry into a directional signal.
 *
 * @param data - Satellite observation data
 * @returns Signal in range [-1, +1]
 */
export function analyzeSatellite(data: SatelliteData): number {
  const parking = data.parkingCapacityRatio ?? 0.5;
  const factory = data.factoryUtilization ?? 0.5;
  const cloud = clamp(data.cloudCover ?? 0.1, 0, 1);
  const nightLight = data.nightLightIntensity ?? 0.5;
  const emissions = data.emissionsIndex ?? 0.5;

  const vessels = data.vesselCount ?? 0;
  const baseline = data.vesselBaseline ?? Math.max(vessels, 1);
  const vesselDev = baseline > 0 ? (vessels - baseline) / baseline : 0;

  const parkingSig = clamp((parking - 0.5) * 2, -1, 1);
  const factorySig = clamp((factory - 0.5) * 2, -1, 1);
  const vesselSig = clamp(vesselDev, -1, 1);
  const nightSig = clamp((nightLight - 0.5) * 2, -1, 1);
  const emissionSig = clamp((emissions - 0.5) * 1.2, -1, 1);

  const raw =
    0.30 * parkingSig +
    0.25 * factorySig +
    0.20 * vesselSig +
    0.15 * nightSig +
    0.10 * emissionSig;

  // Cloud cover reduces confidence but signal is still returned
  void clamp(1 - cloud * 0.8, 0.1, 1.0);
  return Number(clamp(raw, -1, 1).toFixed(4));
}

// ─── Supply Chain Risk ───────────────────────────────────────────────────────

/**
 * Evaluate supply chain risk from a logistics graph.
 *
 * @param nodes - Array of supply chain nodes
 * @returns Fragility score 0-1 (1 = most fragile)
 */
export function evaluateSupplyChainRisk(nodes: SupplyChainNode[]): number {
  if (nodes.length === 0) return 0;

  // Herfindahl concentration
  const concentrations = nodes.map(n => n.concentration);
  const avgConcentration = mean(concentrations);

  // Lead time risk
  const leadTimes = nodes.map(n => n.leadTime);
  const maxLeadTime = Math.max(...leadTimes, 0);
  const leadTimeRisk = clamp(maxLeadTime / 90, 0, 1); // 90 days = max risk

  // Dependency depth
  const maxDependents = Math.max(...nodes.map(n => n.dependents.length), 0);
  const depthRisk = clamp(maxDependents / 10, 0, 1);

  const fragility = 0.40 * avgConcentration + 0.35 * leadTimeRisk + 0.25 * depthRisk;
  return Number(clamp(fragility, 0, 1).toFixed(4));
}

// ─── ESG Scoring ─────────────────────────────────────────────────────────────

/**
 * Compute composite ESG score.
 *
 * @param data - Environmental, governance, and controversy scores (0-100)
 * @returns Composite score 0-100
 */
export function computeESGScore(data: ESGData): number {
  const weights = { environmental: 0.40, governance: 0.35, controversy: 0.25 };
  const score =
    weights.environmental * (data.environmental ?? 50) +
    weights.governance * (data.governance ?? 50) +
    weights.controversy * (data.controversy ?? 50);
  return Number(clamp(score, 0, 100).toFixed(2));
}

// ─── Gemma-Enhanced Wrappers ────────────────────────────────────────────────

export interface EnhancedSentimentResult extends SentimentResult {
  gemmaAnalysis?: string;
}

/**
 * Gemma-enhanced sentiment: runs pure processSentiment()
 * then adds semantic analysis of the sentiment landscape.
 */
export async function processSentimentWithGemma(
  newsItems: NewsItem[],
): Promise<EnhancedSentimentResult> {
  const result = processSentiment(newsItems);
  if (!isOllamaAvailable() || newsItems.length === 0) return result;

  const bullishHeadlines = newsItems.filter(n => n.sentiment > 0.3).map(n => n.headline);
  const bearishHeadlines = newsItems.filter(n => n.sentiment < -0.3).map(n => n.headline);
  const trendingTopics = newsItems.slice(-5).map(n => n.headline.split(' ').slice(0, 3).join(' '));

  const narrative = await enhanceSentimentAnalysis({
    overallSentiment: result.aggregate,
    topBullish: bullishHeadlines.slice(0, 5),
    topBearish: bearishHeadlines.slice(0, 5),
    trendingTopics,
  });

  return { ...result, gemmaAnalysis: narrative || undefined };
}
