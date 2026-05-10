/**
 * aiController.ts — AI Orchestrator (Pure Functions + Gemma Enhancement)
 *
 * Combines signals from macro, GNN, behavioral, and alt-data engines
 * into actionable portfolio signals, advice, and risk metrics.
 *
 * Pure functions remain unchanged. Gemma-enhanced versions add
 * natural language narratives without modifying deterministic outputs.
 */

import {
  type MacroData,
  type MacroRegime,
  getMacroRegime,
  sectorRotation,
} from './macroEngine';

import {
  correlationMatrix,
} from './gnnEngine';

import {
  type Trade,
  type Holding,
} from './behavioralEngine';

import {
  type NewsItem,
  processSentiment,
  insiderActivity,
  type InsiderTrade,
} from './altDataEngine';

import {
  enhancePortfolioAdvice,
  enhanceRiskAssessment,
  isOllamaAvailable,
} from './gemmaOllamaBridge';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MarketState {
  macro: MacroData;
  newsItems?: NewsItem[];
  insiderTrades?: Record<string, InsiderTrade[]>;
  priceHistories?: Record<string, number[]>;
  tradeHistory?: Trade[];
  holdings?: Holding[];
  totalPortfolioValue?: number;
}

// ── Living World: Extended state for world simulation ──
export interface WorldMarketState extends MarketState {
  worldNodes?: Array<{ id: string; sector: string; h3_index: string; investor_count: number; base_income: number }>;
  worldRoutes?: Array<{ from_node_id: string; to_node_id: string; route_type: string; traffic_score: number }>;
  worldEvents?: Array<{ event_type: string; region_h3: string | null; sector: string | null; severity: number; effects: Record<string, number> }>;
  playerRegion?: string; // H3 cell of player's primary region
}

export interface Signal {
  type: 'macro' | 'sentiment' | 'insider' | 'correlation' | 'behavioral';
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-1
  source: string;
  description: string;
  symbols?: string[];
}

export interface Advice {
  symbol: string;
  action: 'buy' | 'sell' | 'hold' | 'reduce' | 'add';
  confidence: number;
  reasoning: string[];
}

export interface RiskMetrics {
  var95: number;
  maxDrawdown: number;
  sharpeRatio: number;
  concentrationRisk: number;
  correlationRisk: number;
}

// ─── Signal Generation ───────────────────────────────────────────────────────

/**
 * Generate trading signals from all available market data.
 * Combines macro regime, sentiment, insider activity, and correlation signals.
 */
export function generateSignals(marketState: MarketState): Signal[] {
  const signals: Signal[] = [];

  // 1. Macro regime signals
  const regime = getMacroRegime(marketState.macro);
  signals.push(macroSignal(regime));

  // 2. Yield curve signal
  if (regime.yieldCurve.isInverted) {
    signals.push({
      type: 'macro',
      direction: 'bearish',
      strength: regime.yieldCurve.confidence,
      source: 'yield_curve',
      description: `Yield curve inverted (spread: ${regime.yieldCurve.spread10Y2Y.toFixed(2)}%) — recession risk elevated`,
    });
  }

  // 3. Credit cycle signal
  if (regime.creditPhase.phase === 'ponzi' || regime.creditPhase.phase === 'speculative') {
    signals.push({
      type: 'macro',
      direction: 'bearish',
      strength: regime.creditPhase.phase === 'ponzi' ? 0.9 : 0.6,
      source: 'credit_cycle',
      description: `Credit cycle in ${regime.creditPhase.phase} phase — ${regime.creditPhase.signal}`,
    });
  }

  // 4. Sector rotation signals
  const recommendedSectors = sectorRotation(regime.phase);
  if (recommendedSectors.length > 0) {
    signals.push({
      type: 'macro',
      direction: 'bullish',
      strength: 0.6,
      source: 'sector_rotation',
      description: `Sector rotation favors: ${recommendedSectors.slice(0, 3).join(', ')}`,
      symbols: recommendedSectors,
    });
  }

  // 5. Sentiment signals
  if (marketState.newsItems && marketState.newsItems.length > 0) {
    const sentiment = processSentiment(marketState.newsItems);
    if (Math.abs(sentiment.aggregate) > 0.3) {
      signals.push({
        type: 'sentiment',
        direction: sentiment.aggregate > 0 ? 'bullish' : 'bearish',
        strength: Math.abs(sentiment.aggregate),
        source: 'news_sentiment',
        description: `News sentiment ${sentiment.trend} (score: ${sentiment.aggregate.toFixed(2)})`,
      });
    }
  }

  // 6. Insider activity signals (per symbol)
  if (marketState.insiderTrades) {
    for (const [symbol, trades] of Object.entries(marketState.insiderTrades)) {
      if (trades.length < 2) continue;
      const insider = insiderActivity(trades);
      if (insider.signal !== 'neutral' && insider.signal !== 'no_data') {
        signals.push({
          type: 'insider',
          direction: insider.signal.includes('buy') ? 'bullish' : 'bearish',
          strength: insider.confidence,
          source: 'insider_activity',
          description: `Insider signal for ${symbol}: ${insider.signal} (buy ratio: ${(insider.buyRatio * 100).toFixed(0)}%)`,
          symbols: [symbol],
        });
      }
    }
  }

  // 7. Correlation-based signals
  if (marketState.priceHistories) {
    const symbols = Object.keys(marketState.priceHistories);
    if (symbols.length >= 3) {
      const histories = symbols.map(s => marketState.priceHistories![s]);
      const corrMatrix = correlationMatrix(histories);

      // Check for high systematic correlation (risk-on/risk-off regime)
      let avgCorr = 0;
      let count = 0;
      for (let i = 0; i < corrMatrix.length; i++) {
        for (let j = i + 1; j < corrMatrix.length; j++) {
          avgCorr += Math.abs(corrMatrix[i][j]);
          count++;
        }
      }
      avgCorr = count > 0 ? avgCorr / count : 0;

      if (avgCorr > 0.7) {
        signals.push({
          type: 'correlation',
          direction: 'bearish',
          strength: Math.min(1, (avgCorr - 0.5) * 2),
          source: 'correlation_regime',
          description: `High cross-asset correlation (${(avgCorr * 100).toFixed(0)}%) — diversification benefits reduced`,
        });
      }
    }
  }

  return signals;
}

// ─── Portfolio Advice ────────────────────────────────────────────────────────

/**
 * Generate portfolio advice based on holdings and market state.
 */
export function getPortfolioAdvice(
  holdings: Holding[],
  marketState: MarketState,
): Advice[] {
  const advice: Advice[] = [];
  const signals = generateSignals(marketState);
  const regime = getMacroRegime(marketState.macro);

  for (const holding of holdings) {
    const reasoning: string[] = [];
    let score = 0; // positive = bullish, negative = bearish

    // Check macro phase alignment
    void regime.sectorRotation;
    // Simple heuristic: if macro is contraction, reduce risk
    if (regime.phase === 'contraction') {
      score -= 0.3;
      reasoning.push('Macro in contraction phase — risk reduction recommended');
    } else if (regime.phase === 'expansion') {
      score += 0.2;
      reasoning.push('Macro expansion supports risk assets');
    }

    // Check for insider signals on this holding
    const insiderSignals = signals.filter(
      s => s.type === 'insider' && s.symbols?.includes(holding.symbol),
    );
    for (const sig of insiderSignals) {
      score += sig.direction === 'bullish' ? sig.strength * 0.3 : -sig.strength * 0.3;
      reasoning.push(sig.description);
    }

    // P&L status
    const unrealizedPct = holding.avgCost > 0
      ? (holding.currentPrice - holding.avgCost) / holding.avgCost
      : 0;

    if (unrealizedPct < -0.20) {
      reasoning.push(`Position down ${(unrealizedPct * 100).toFixed(1)}% — consider stop-loss`);
      score -= 0.2;
    } else if (unrealizedPct > 0.50) {
      reasoning.push(`Position up ${(unrealizedPct * 100).toFixed(1)}% — consider taking partial profits`);
    }

    // Determine action
    let action: Advice['action'];
    if (score > 0.3) action = 'add';
    else if (score > 0) action = 'hold';
    else if (score > -0.3) action = 'hold';
    else if (score > -0.5) action = 'reduce';
    else action = 'sell';

    advice.push({
      symbol: holding.symbol,
      action,
      confidence: Math.min(1, Math.abs(score) + 0.3),
      reasoning,
    });
  }

  return advice;
}

// ─── Risk Assessment ─────────────────────────────────────────────────────────

/**
 * Assess portfolio risk using correlation data and holdings.
 *
 * @param portfolio - Current holdings
 * @param correlations - N x N correlation matrix (same order as portfolio)
 * @returns Risk metrics: VaR, max drawdown estimate, Sharpe ratio, concentration
 */
export function riskAssessment(
  portfolio: Holding[],
  correlations: number[][],
): RiskMetrics {
  const N = portfolio.length;

  if (N === 0) {
    return { var95: 0, maxDrawdown: 0, sharpeRatio: 0, concentrationRisk: 0, correlationRisk: 0 };
  }

  // Portfolio weights
  const totalValue = portfolio.reduce((s, h) => s + h.units * h.currentPrice, 0);
  const weights = portfolio.map(h =>
    totalValue > 0 ? (h.units * h.currentPrice) / totalValue : 1 / N,
  );

  // Concentration risk (Herfindahl-Hirschman Index)
  const concentrationRisk = weights.reduce((s, w) => s + w * w, 0);

  // Portfolio variance via correlation matrix
  // Assume 2% daily volatility per asset as base estimate
  const dailyVol = 0.02;
  let portfolioVariance = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const corr = correlations[i]?.[j] ?? (i === j ? 1 : 0);
      portfolioVariance += weights[i] * weights[j] * dailyVol * dailyVol * corr;
    }
  }

  const portfolioVol = Math.sqrt(Math.max(0, portfolioVariance));

  // VaR 95% (parametric, assuming normality)
  const var95 = portfolioVol * 1.645;

  // Max drawdown estimate (rough: 3x daily VaR for monthly horizon)
  const maxDrawdown = Math.min(1, var95 * 3);

  // Sharpe ratio estimate (assume 0 risk-free rate, 8% annualized return target)
  const annualizedVol = portfolioVol * Math.sqrt(252);
  const sharpeRatio = annualizedVol > 0 ? 0.08 / annualizedVol : 0;

  // Average correlation (off-diagonal)
  let avgCorr = 0;
  let count = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      avgCorr += Math.abs(correlations[i]?.[j] ?? 0);
      count++;
    }
  }
  const correlationRisk = count > 0 ? avgCorr / count : 0;

  return {
    var95: Number(var95.toFixed(6)),
    maxDrawdown: Number(maxDrawdown.toFixed(6)),
    sharpeRatio: Number(sharpeRatio.toFixed(4)),
    concentrationRisk: Number(concentrationRisk.toFixed(4)),
    correlationRisk: Number(correlationRisk.toFixed(4)),
  };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

// ─── Gemma-Enhanced Wrappers ────────────────────────────────────────────────

export interface EnhancedAdvice extends Advice {
  gemmaNarrative?: string;
}

/**
 * Gemma-enhanced portfolio advice: runs pure getPortfolioAdvice()
 * then enriches top actions with natural language reasoning via Gemma.
 */
export async function getPortfolioAdviceWithGemma(
  holdings: Holding[],
  marketState: MarketState,
): Promise<EnhancedAdvice[]> {
  const advice = getPortfolioAdvice(holdings, marketState);
  if (!isOllamaAvailable() || advice.length === 0) return advice;

  const narratives = await enhancePortfolioAdvice(advice);
  return advice.map(a => ({
    ...a,
    gemmaNarrative: narratives[a.symbol] || undefined,
  }));
}

export interface EnhancedRiskMetrics extends RiskMetrics {
  gemmaAnalysis?: string;
}

/**
 * Gemma-enhanced risk assessment: runs pure riskAssessment()
 * then adds contextual risk narrative via Gemma.
 */
export async function riskAssessmentWithGemma(
  portfolio: Holding[],
  correlations: number[][],
): Promise<EnhancedRiskMetrics> {
  const risk = riskAssessment(portfolio, correlations);

  if (!isOllamaAvailable()) return risk;

  const warnings: string[] = [];
  if (risk.concentrationRisk > 0.3) warnings.push('High concentration risk');
  if (risk.correlationRisk > 0.6) warnings.push('High correlation risk');
  if (risk.var95 > 0.05) warnings.push('Elevated VaR');
  if (risk.maxDrawdown > 0.15) warnings.push('Significant drawdown risk');

  const narrative = await enhanceRiskAssessment({
    overallRisk: risk.var95 + risk.concentrationRisk,
    concentrationRisk: risk.concentrationRisk,
    correlationRisk: risk.correlationRisk,
    drawdownRisk: risk.maxDrawdown,
    warnings,
  });

  return { ...risk, gemmaAnalysis: narrative || undefined };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function macroSignal(regime: MacroRegime): Signal {
  let direction: Signal['direction'];
  if (regime.phase === 'expansion' || regime.phase === 'trough') {
    direction = 'bullish';
  } else if (regime.phase === 'contraction') {
    direction = 'bearish';
  } else {
    direction = 'neutral';
  }

  return {
    type: 'macro',
    direction,
    strength: regime.confidence,
    source: 'macro_regime',
    description: `Macro regime: ${regime.phase}, inflation: ${regime.inflationRegime}, risk: ${regime.riskLevel}`,
  };
}

// ── Living World: World Signal Types ──────────────────────────────

export type WorldSignalType = 'market_fit' | 'competition' | 'ecosystem' | 'macro_risk';

export interface WorldSignal {
  type: WorldSignalType;
  direction: 'positive' | 'negative' | 'neutral';
  strength: number; // 0-1
  description: string;
  nodeId?: string;
  region?: string;
}

/**
 * Generate world-level signals for venture advisor mode.
 * Combines macro regime, event effects, and network data
 * into actionable startup intelligence.
 */
export function generateWorldSignals(state: WorldMarketState): WorldSignal[] {
  const signals: WorldSignal[] = [];

  if (!state.worldNodes || state.worldNodes.length === 0) return signals;

  // Market fit: check if player region has favorable macro conditions
  const regime = getMacroRegime(state.macro);
  signals.push({
    type: 'macro_risk',
    direction: regime.phase === 'expansion' ? 'positive' : regime.phase === 'contraction' ? 'negative' : 'neutral',
    strength: regime.confidence,
    description: `Global economy in ${regime.phase} phase (${regime.riskLevel} risk). ${
      regime.phase === 'expansion' ? 'Good time to found ventures.' : 'Consider defensive positioning.'
    }`,
  });

  // Competition: check sector density in player region
  if (state.playerRegion) {
    const regionNodes = state.worldNodes.filter(n => n.h3_index === state.playerRegion);
    const sectorCounts: Record<string, number> = {};
    for (const n of regionNodes) {
      sectorCounts[n.sector] = (sectorCounts[n.sector] || 0) + 1;
    }
    const maxSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0];
    if (maxSector && maxSector[1] > 5) {
      signals.push({
        type: 'competition',
        direction: 'negative',
        strength: Math.min(1, maxSector[1] / 20),
        description: `High ${maxSector[0]} competition in your region (${maxSector[1]} ventures). Consider diversifying or relocating.`,
        region: state.playerRegion,
      });
    }
  }

  // Ecosystem: check if active events create opportunities
  if (state.worldEvents) {
    const opportunities = state.worldEvents.filter(e => e.event_type === 'boom' || e.event_type === 'opportunity');
    for (const opp of opportunities.slice(0, 3)) {
      signals.push({
        type: 'ecosystem',
        direction: 'positive',
        strength: opp.severity,
        description: `${opp.event_type === 'boom' ? 'Economic boom' : 'Opportunity'} detected${opp.region_h3 ? ` in region ${opp.region_h3}` : ' globally'}${opp.sector ? ` affecting ${opp.sector}` : ''}.`,
        region: opp.region_h3 || undefined,
      });
    }

    const crises = state.worldEvents.filter(e => e.event_type === 'crisis' || e.event_type === 'disruption');
    for (const crisis of crises.slice(0, 3)) {
      signals.push({
        type: 'macro_risk',
        direction: 'negative',
        strength: crisis.severity,
        description: `${crisis.event_type === 'crisis' ? 'Crisis' : 'Disruption'} active${crisis.region_h3 ? ` in region ${crisis.region_h3}` : ' globally'}. Exercise caution.`,
        region: crisis.region_h3 || undefined,
      });
    }
  }

  return signals;
}
