/**
 * behavioralEngine.ts — Behavioral Finance Detection (Pure Functions + Gemma Enhancement)
 *
 * Ported from MVP behavioralEngine.js. All functions are pure.
 *
 * Detects 10 cognitive biases in trading behavior:
 * Disposition Effect, Overconfidence, Loss Aversion, Anchoring,
 * Herding, Recency Bias, Endowment Effect, Confirmation Bias,
 * Gambler's Fallacy, Sunk Cost Fallacy.
 *
 * Gemma-enhanced variants add personalized bias coaching narratives.
 */

import { enhanceBiasCoaching, isOllamaAvailable } from './gemmaOllamaBridge';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Trade {
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  units: number;
  timestamp: number;
  avgCost?: number;
  holdTicks?: number;
  marketReturn?: number;
}

export interface SellRecord {
  symbol: string;
  purchasePrice: number;
  sellPrice: number;
  gain: number;
  holdTicks: number;
}

export interface Holding {
  symbol: string;
  units: number;
  avgCost: number;
  currentPrice: number;
}

export type BiasSeverity = 'low' | 'medium' | 'high';

export interface BiasAlert {
  id?: string;
  type?: string;
  bias: string;
  severity: BiasSeverity;
  score: number;
  description: string;
  suggestion: string;
  lesson: string;
  name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const THRESHOLDS = {
  dispositionRatioThreshold: 1.5,
  maxTradesPerWindow: 15,
  maxPositionPct: 0.40,
  tradingWindow: 50,
  lossReactionMultiplier: 2.0,
  roundNumberProximity: 0.02,
  purchasePriceReturn: 0.01,
  sameDirectionThreshold: 0.70,
};

interface BiasEducation {
  name: string;
  description: string;
  lesson: string;
  remedy: string;
}

const BIAS_EDUCATION: Record<string, BiasEducation> = {
  disposition: {
    name: 'Disposition Effect',
    description: 'You tend to sell winning investments too early and hold losing ones too long.',
    lesson: 'Research by Shefrin & Statman (1985) shows this is one of the most common biases.',
    remedy: 'Use stop-losses for downside protection and let winners run to predetermined targets.',
  },
  overconfidence: {
    name: 'Overconfidence Bias',
    description: 'You are trading more frequently than optimal, suggesting overconfidence in predictions.',
    lesson: 'Barber & Odean (2001) found that the most active traders underperform by 6.5% annually.',
    remedy: 'Reduce trading frequency. Each trade should have a clear thesis with defined entry/exit.',
  },
  lossAversion: {
    name: 'Loss Aversion',
    description: 'You react more strongly to losses than to equivalent gains (Prospect Theory).',
    lesson: 'The pain of a $100 loss is psychologically ~2.5x the pleasure of a $100 gain.',
    remedy: 'Focus on expected value, not emotional response. Frame decisions in terms of total portfolio impact.',
  },
  anchoring: {
    name: 'Anchoring Bias',
    description: 'You are fixating on purchase price or round numbers rather than current fundamentals.',
    lesson: 'Your entry price is irrelevant to the future trajectory of the asset.',
    remedy: 'Ask: "Would I buy this at the current price?" If no, consider selling regardless of your entry.',
  },
  herding: {
    name: 'Herding Behavior',
    description: 'Your trades consistently follow the market direction — you may be following the crowd.',
    lesson: 'Herding amplifies bubbles and crashes. The best opportunities often come from contrarian positions.',
    remedy: 'Develop independent theses. Consider what the market knows that you do not, and vice versa.',
  },
  recency: {
    name: 'Recency Bias',
    description: 'You are overweighting recent market events in your trading decisions.',
    lesson: 'Markets are non-stationary. What happened in the last 10 ticks does not predict the next 10.',
    remedy: 'Look at longer timeframes. Use systematic rules rather than gut reactions to recent price moves.',
  },
  endowment: {
    name: 'Endowment Effect',
    description: 'You value your holdings higher than the market does, making you reluctant to sell.',
    lesson: 'Thaler (1980) showed people demand 2-3x more to sell an item than they would pay to buy it.',
    remedy: 'Regularly re-evaluate: "Would I buy this position at current prices?" If not, reduce it.',
  },
  confirmation: {
    name: 'Confirmation Bias',
    description: 'You tend to only research assets you already own, ignoring contradictory signals.',
    lesson: 'Wason (1960) showed people seek confirming evidence 2:1 over disconfirming evidence.',
    remedy: 'Actively seek bear cases for your positions. Play devil\'s advocate with every thesis.',
  },
  gamblersFallacy: {
    name: "Gambler's Fallacy",
    description: 'You are betting on reversals after a streak, assuming the trend "must" change.',
    lesson: 'Each market tick is largely independent. A stock dropping 5 days does not make day 6 more likely to rise.',
    remedy: 'Focus on fundamentals and regime analysis, not streak patterns.',
  },
  sunkCost: {
    name: 'Sunk Cost Fallacy',
    description: 'You are holding losing positions because of how much you have already invested.',
    lesson: 'Past costs are irrelevant to future decisions. Only marginal costs and benefits matter.',
    remedy: 'Evaluate every position as if you were entering it fresh today. Ignore historical cost.',
  },
};

// ─── Individual Bias Detectors ───────────────────────────────────────────────

function classifySeverity(score: number): BiasSeverity {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function buildSellLog(trades: Trade[]): SellRecord[] {
  return trades
    .filter(t => t.type === 'sell')
    .map(t => ({
      symbol: t.symbol,
      purchasePrice: t.avgCost ?? t.price,
      sellPrice: t.price,
      gain: (t.price - (t.avgCost ?? t.price)) * t.units,
      holdTicks: t.holdTicks ?? 0,
    }));
}

export function detectDispositionEffect(trades: Trade[]): BiasAlert | null {
  const sells = buildSellLog(trades);
  if (sells.length < 5) return null;

  const recent = sells.slice(-20);
  const winners = recent.filter(s => s.gain > 0);
  const losers = recent.filter(s => s.gain <= 0);
  if (winners.length === 0 || losers.length === 0) return null;

  const avgWinHold = winners.reduce((s, w) => s + w.holdTicks, 0) / winners.length;
  const avgLoseHold = losers.reduce((s, l) => s + l.holdTicks, 0) / losers.length;

  if (avgWinHold === 0) return null;
  const ratio = avgLoseHold / avgWinHold;

  let score = 0;
  if (ratio > THRESHOLDS.dispositionRatioThreshold) {
    score = Math.min(100, (ratio - 1) * 40);
  } else {
    const pgrRatio = winners.length / (winners.length + losers.length);
    if (pgrRatio > 0.65) {
      score = Math.min(100, (pgrRatio - 0.5) * 200);
    }
  }

  if (score < 20) return null;

  const edu = BIAS_EDUCATION.disposition;
  return {
    id: `disposition-${Date.now()}`,
    bias: 'disposition',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

export function detectOverconfidence(
  trades: Trade[],
  holdings: Holding[],
  totalPortfolioValue: number,
): BiasAlert | null {
  let score = 0;

  // Trading frequency
  const now = trades.length > 0 ? Math.max(...trades.map(t => t.timestamp)) : 0;
  const windowTrades = trades.filter(t => t.timestamp > now - THRESHOLDS.tradingWindow);
  if (windowTrades.length > THRESHOLDS.maxTradesPerWindow) {
    score += Math.min(50, (windowTrades.length / THRESHOLDS.maxTradesPerWindow - 1) * 30);
  }

  // Position concentration
  if (totalPortfolioValue > 0) {
    const maxPosition = Math.max(...holdings.map(h => h.units * h.currentPrice), 0);
    const maxPct = maxPosition / totalPortfolioValue;
    if (maxPct > THRESHOLDS.maxPositionPct) {
      score += Math.min(50, (maxPct - THRESHOLDS.maxPositionPct) * 200);
    }
  }

  score = Math.min(100, score);
  if (score < 20) return null;

  const edu = BIAS_EDUCATION.overconfidence;
  return {
    id: `overconfidence-${Date.now()}`,
    bias: 'overconfidence',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

export function detectLossAversion(trades: Trade[]): BiasAlert | null {
  const sells = buildSellLog(trades);
  if (sells.length < 10) return null;

  const recent = sells.slice(-20);
  const winners = recent.filter(s => s.gain > 0);
  const losers = recent.filter(s => s.gain <= 0);
  if (winners.length < 2 || losers.length < 2) return null;

  const avgGain = winners.reduce((s, w) => s + Math.abs(w.gain), 0) / winners.length;
  const avgLoss = losers.reduce((s, l) => s + Math.abs(l.gain), 0) / losers.length;
  if (avgGain === 0) return null;

  const ratio = avgLoss / avgGain;
  if (ratio <= THRESHOLDS.lossReactionMultiplier) return null;

  const score = Math.min(100, (ratio - 1) * 35);
  if (score < 20) return null;

  const edu = BIAS_EDUCATION.lossAversion;
  return {
    id: `lossAversion-${Date.now()}`,
    bias: 'lossAversion',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

export function detectAnchoring(trades: Trade[]): BiasAlert | null {
  const sells = buildSellLog(trades);
  if (sells.length < 5) return null;

  const recent = sells.slice(-15);
  let anchoredCount = 0;
  const roundNumbers = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 50000];

  for (const sell of recent) {
    if (sell.purchasePrice > 0) {
      const returnFromPurchase = Math.abs(sell.sellPrice - sell.purchasePrice) / sell.purchasePrice;
      if (returnFromPurchase < THRESHOLDS.purchasePriceReturn) {
        anchoredCount++;
        continue;
      }
    }

    for (const rn of roundNumbers) {
      if (Math.abs(sell.sellPrice - rn) / rn < THRESHOLDS.roundNumberProximity) {
        anchoredCount++;
        break;
      }
    }
  }

  const anchorPct = anchoredCount / recent.length;
  if (anchorPct <= 0.30) return null;

  const score = Math.min(100, (anchorPct - 0.20) * 120);
  if (score < 20) return null;

  const edu = BIAS_EDUCATION.anchoring;
  return {
    id: `anchoring-${Date.now()}`,
    bias: 'anchoring',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

export function detectHerding(trades: Trade[]): BiasAlert | null {
  if (trades.length < 10) return null;

  const recent = trades.slice(-20);
  let sameDirection = 0;

  for (const trade of recent) {
    const marketReturn = trade.marketReturn ?? 0;
    const isBuy = trade.type === 'buy';
    if ((isBuy && marketReturn > 0) || (!isBuy && marketReturn < 0)) {
      sameDirection++;
    }
  }

  const herdPct = sameDirection / recent.length;
  if (herdPct <= THRESHOLDS.sameDirectionThreshold) return null;

  const score = Math.min(100, (herdPct - 0.5) * 150);
  if (score < 20) return null;

  const edu = BIAS_EDUCATION.herding;
  return {
    id: `herding-${Date.now()}`,
    bias: 'herding',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

export function detectRecencyBias(trades: Trade[]): BiasAlert | null {
  if (trades.length < 10) return null;

  // Check if trades cluster in timing (many trades close together)
  const recent = trades.slice(-15);
  const timestamps = recent.map(t => t.timestamp).sort((a, b) => a - b);

  let shortGaps = 0;
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] - timestamps[i - 1] < 3) shortGaps++;
  }

  const reactionPct = shortGaps / (timestamps.length - 1 || 1);
  if (reactionPct <= 0.50) return null;

  const score = Math.min(100, (reactionPct - 0.30) * 120);
  if (score < 20) return null;

  const edu = BIAS_EDUCATION.recency;
  return {
    id: `recency-${Date.now()}`,
    bias: 'recency',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

export function detectGamblersFallacy(
  trades: Trade[],
  assetReturns: Record<string, number[]>,
): BiasAlert | null {
  if (trades.length < 10) return null;

  const recent = trades.slice(-20);
  const buyTrades = recent.filter(t => t.type === 'buy');
  if (buyTrades.length < 3) return null;

  let fallacyCount = 0;
  for (const trade of buyTrades) {
    const returns = assetReturns[trade.symbol] ?? [];
    if (returns.length < 5) continue;
    const lastFive = returns.slice(-5);
    const negativeStreak = lastFive.filter(r => r < 0).length;
    if (negativeStreak >= 4) fallacyCount++;
  }

  const fallacyPct = fallacyCount / buyTrades.length;
  const score = Math.min(100, fallacyPct * 150);
  if (score < 20) return null;

  const edu = BIAS_EDUCATION.gamblersFallacy;
  return {
    id: `gamblersFallacy-${Date.now()}`,
    bias: 'gamblersFallacy',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

export function detectSunkCost(holdings: Holding[]): BiasAlert | null {
  if (holdings.length < 2) return null;

  let sunkCostPositions = 0;
  for (const h of holdings) {
    if (h.units <= 0 || h.avgCost <= 0) continue;
    const unrealizedReturn = (h.currentPrice - h.avgCost) / h.avgCost;
    if (unrealizedReturn < -0.20) sunkCostPositions++;
  }

  const sunkPct = sunkCostPositions / holdings.length;
  const score = Math.min(100, sunkPct * 120);
  if (score < 20) return null;

  const edu = BIAS_EDUCATION.sunkCost;
  return {
    id: `sunkCost-${Date.now()}`,
    bias: 'sunkCost',
    severity: classifySeverity(score),
    score,
    name: edu.name,
    description: edu.description,
    suggestion: edu.remedy,
    lesson: edu.lesson,
  };
}

// ─── Aggregate Detection ─────────────────────────────────────────────────────

// ── Living World: Entrepreneurial Bias Detectors ──────────────────

export interface VentureAction {
  type: 'found' | 'invest' | 'upgrade' | 'partner' | 'franchise';
  nodeId: string;
  sector: string;
  h3Index: string;
  lat: number;
  lng: number;
  timestamp: number;
}

/**
 * Detect home bias: player only founds ventures near their first location.
 */
export function detectHomeBias(
  ventureActions: VentureAction[],
  firstVentureH3?: string,
): BiasAlert | null {
  if (ventureActions.length < 3 || !firstVentureH3) return null;

  const foundings = ventureActions.filter(a => a.type === 'found');
  if (foundings.length < 3) return null;

  const nearHome = foundings.filter(a => a.h3Index === firstVentureH3).length;
  const ratio = nearHome / foundings.length;

  if (ratio > 0.7) {
    return {
      type: 'home_bias',
      bias: 'home_bias',
      name: 'Home Bias',
      description: 'You tend to found companies close to your first location.',
      severity: ratio > 0.85 ? 'high' : 'medium',
      score: ratio,
      lesson: 'You tend to found companies close to your first location. Consider expanding to underserved markets for higher growth potential.',
      suggestion: 'Look for regions with fewer competitors and emerging demand in your sector.',
    };
  }
  return null;
}

/**
 * Detect herd behavior: player only invests in popular ventures.
 */
export function detectHerdBehavior(
  ventureActions: VentureAction[],
  nodeInvestorCounts: Record<string, number>,
): BiasAlert | null {
  const investments = ventureActions.filter(a => a.type === 'invest');
  if (investments.length < 5) return null;

  const popularInvestments = investments.filter(a => (nodeInvestorCounts[a.nodeId] || 0) > 20).length;
  const ratio = popularInvestments / investments.length;

  if (ratio > 0.7) {
    return {
      type: 'herd_behavior',
      bias: 'herd_behavior',
      name: 'Herd Behavior',
      description: 'You mainly invest in already-popular ventures.',
      severity: ratio > 0.85 ? 'high' : 'medium',
      score: ratio,
      lesson: 'You mainly invest in already-popular ventures. High competition means lower margins.',
      suggestion: 'Look for promising ventures with fewer investors — early investment = bigger returns.',
    };
  }
  return null;
}

/**
 * Detect neglect of probability: founding ventures ignoring regional risk events.
 */
export function detectProbabilityNeglect(
  ventureActions: VentureAction[],
  activeEventRegions: Set<string>,
): BiasAlert | null {
  const recentFoundings = ventureActions.filter(
    a => a.type === 'found' && Date.now() - a.timestamp < 3_600_000 * 24
  );
  if (recentFoundings.length < 2) return null;

  const inRiskZone = recentFoundings.filter(a => activeEventRegions.has(a.h3Index)).length;
  const ratio = inRiskZone / recentFoundings.length;

  if (ratio > 0.5) {
    return {
      type: 'probability_neglect',
      bias: 'probability_neglect',
      name: 'Probability Neglect',
      description: 'You are founding companies in regions with active negative events.',
      severity: ratio > 0.75 ? 'high' : 'medium',
      score: ratio,
      lesson: 'You are founding companies in regions with active negative events. Factor macro conditions into your location decisions.',
      suggestion: 'Check regional events before committing capital. Wait for disruptions to pass or find safer regions.',
    };
  }
  return null;
}

/**
 * Detect sunk cost fallacy in ventures: keeps upgrading failing ventures.
 */
export function detectVentureSunkCost(
  ventureActions: VentureAction[],
  nodeIncomes: Record<string, number>,
): BiasAlert | null {
  const upgrades = ventureActions.filter(a => a.type === 'upgrade');
  if (upgrades.length < 3) return null;

  const losingUpgrades = upgrades.filter(a => (nodeIncomes[a.nodeId] || 0) <= 0).length;
  const ratio = losingUpgrades / upgrades.length;

  if (ratio > 0.4) {
    return {
      type: 'venture_sunk_cost',
      bias: 'venture_sunk_cost',
      name: 'Venture Sunk Cost',
      description: 'You are investing more into ventures that are losing money.',
      severity: ratio > 0.6 ? 'high' : 'medium',
      score: ratio,
      lesson: 'You are investing more into ventures that are losing money. Consider pivoting or cutting losses.',
      suggestion: 'Evaluate each venture objectively. Past investment should not dictate future decisions.',
    };
  }
  return null;
}

/**
 * Detect confirmation bias: only partners with same-sector ventures.
 */
export function detectSectorConfirmation(
  ventureActions: VentureAction[],
): BiasAlert | null {
  const partnerships = ventureActions.filter(a => a.type === 'partner');
  if (partnerships.length < 4) return null;

  // Count unique sectors in partnerships
  const sectors = new Set(partnerships.map(a => a.sector));
  const concentration = 1 - (sectors.size / partnerships.length);

  if (concentration > 0.6) {
    return {
      type: 'sector_confirmation',
      bias: 'sector_confirmation',
      name: 'Sector Confirmation',
      description: 'You only partner with companies in the same sector.',
      severity: concentration > 0.8 ? 'high' : 'medium',
      score: concentration,
      lesson: 'You only partner with companies in the same sector. Cross-sector supply chains create stronger businesses.',
      suggestion: 'Consider partnerships with complementary sectors (e.g., tech + manufacturing, finance + pharma).',
    };
  }
  return null;
}

/**
 * Run all bias detectors on the given trade history and holdings.
 * Returns an array of detected bias alerts (only biases that exceed threshold).
 */
export function detectBiases(
  tradeHistory: Trade[],
  holdings: Holding[] = [],
  totalPortfolioValue: number = 0,
  assetReturns: Record<string, number[]> = {},
): BiasAlert[] {
  const alerts: BiasAlert[] = [];

  const disposition = detectDispositionEffect(tradeHistory);
  if (disposition) alerts.push(disposition);

  const overconfidence = detectOverconfidence(tradeHistory, holdings, totalPortfolioValue);
  if (overconfidence) alerts.push(overconfidence);

  const lossAversion = detectLossAversion(tradeHistory);
  if (lossAversion) alerts.push(lossAversion);

  const anchoring = detectAnchoring(tradeHistory);
  if (anchoring) alerts.push(anchoring);

  const herding = detectHerding(tradeHistory);
  if (herding) alerts.push(herding);

  const recency = detectRecencyBias(tradeHistory);
  if (recency) alerts.push(recency);

  const gambler = detectGamblersFallacy(tradeHistory, assetReturns);
  if (gambler) alerts.push(gambler);

  const sunkCost = detectSunkCost(holdings);
  if (sunkCost) alerts.push(sunkCost);

  return alerts;
}

/**
 * Get all bias definitions with educational content.
 */
export function getBiasDefinitions(): Array<{ type: string } & BiasEducation> {
  return Object.entries(BIAS_EDUCATION).map(([type, edu]) => ({
    type,
    ...edu,
  }));
}

// ─── Gemma-Enhanced Wrappers ────────────────────────────────────────────────

export interface EnhancedBiasAlert extends BiasAlert {
  gemmaCoaching?: string;
}

/**
 * Gemma-enhanced bias detection: runs pure detectBiases()
 * then adds personalized coaching narratives for each detected bias.
 */
export async function detectBiasesWithGemma(
  tradeHistory: Trade[],
  holdings: Holding[] = [],
  totalPortfolioValue: number = 0,
  assetReturns: Record<string, number[]> = {},
): Promise<EnhancedBiasAlert[]> {
  const alerts = detectBiases(tradeHistory, holdings, totalPortfolioValue, assetReturns);
  if (!isOllamaAvailable() || alerts.length === 0) return alerts;

  const coaching = await enhanceBiasCoaching(
    alerts.map(a => ({
      type: a.bias,
      symbol: undefined,
      description: a.description,
      severity: a.score / 100,
    })),
  );

  return alerts.map(a => ({
    ...a,
    gemmaCoaching: coaching[a.bias] || undefined,
  }));
}
