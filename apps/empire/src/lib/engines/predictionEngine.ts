/**
 * predictionEngine.ts — Multi-Outcome Prediction Engine
 *
 * Combines technical analysis, pattern recognition, Monte Carlo simulation,
 * Markov chain state transitions, and indicator confirmation to produce
 * probabilistic forecasts for instrument price movements.
 *
 * Core algorithms:
 * - Pattern Detection (head & shoulders, double top/bottom, flags, wedges, channels)
 * - Monte Carlo price path simulation (geometric Brownian motion + jump diffusion)
 * - Markov Chain regime transition (bull/bear/sideways state matrix)
 * - Indicator Confluence scoring (RSI, MACD, Bollinger, SMA/EMA crossovers)
 * - Multi-outcome probability distribution with confidence intervals
 */

import { sma, ema } from '../indicators';
import { usePerformanceStore } from '../../store/performanceStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile' | 'breakout';
export type TimeHorizon = '1d' | '1w' | '1m' | '3m';

export interface PriceOutcome {
  label: string;
  priceTarget: number;
  percentChange: number;
  probability: number;
  confidence: number;
  reasoning: string[];
}

export interface PatternMatch {
  pattern: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-1
  priceTarget: number | null;
  description: string;
}

export interface IndicatorSignal {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  strength: number; // 0-1
  description: string;
}

export interface PredictionResult {
  symbol: string;
  currentPrice: number;
  horizon: TimeHorizon;
  regime: MarketRegime;
  regimeConfidence: number;
  outcomes: PriceOutcome[];          // sorted by probability desc
  indicators: IndicatorSignal[];
  patterns: PatternMatch[];
  consensus: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  consensusScore: number;            // -1 (strong sell) to +1 (strong buy)
  volatilityEstimate: number;        // annualized vol
  monteCarloStats: {
    mean: number;
    median: number;
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    maxGain: number;
    maxLoss: number;
  };
  timestamp: number;
}

export interface EngineAccuracy {
  totalPredictions: number;
  correctDirection: number;
  avgError: number;
  avgConfidence: number;
  directionAccuracy: number;
  calibration: { predicted: number; actual: number }[];
}

// ─── Markov Chain Regime Detection ───────────────────────────────────────────

/** Transition probability matrix for market regimes */
const REGIME_TRANSITION: Record<MarketRegime, Record<MarketRegime, number>> = {
  bull:     { bull: 0.65, bear: 0.08, sideways: 0.15, volatile: 0.07, breakout: 0.05 },
  bear:     { bull: 0.10, bear: 0.55, sideways: 0.15, volatile: 0.15, breakout: 0.05 },
  sideways: { bull: 0.15, bear: 0.10, sideways: 0.50, volatile: 0.10, breakout: 0.15 },
  volatile: { bull: 0.10, bear: 0.20, sideways: 0.15, volatile: 0.45, breakout: 0.10 },
  breakout: { bull: 0.30, bear: 0.15, sideways: 0.10, volatile: 0.20, breakout: 0.25 },
};

/**
 * Detect current market regime from price history using returns analysis.
 */
export function detectRegime(prices: number[]): { regime: MarketRegime; confidence: number } {
  if (prices.length < 20) return { regime: 'sideways', confidence: 0.3 };

  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const recent = returns.slice(-20);

  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((a, r) => a + (r - mean) ** 2, 0) / recent.length;
  const vol = Math.sqrt(variance);
  const annualVol = vol * Math.sqrt(252);

  // Trend strength via linear regression slope
  const n = recent.length;
  const xMean = (n - 1) / 2;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (recent[i] - mean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;

  // ADX-like directional strength
  const trendStrength = Math.abs(slope) / (vol + 1e-8);

  // Classify regime
  let regime: MarketRegime;
  let confidence: number;

  if (annualVol > 0.40) {
    regime = 'volatile';
    confidence = Math.min(1, annualVol / 0.60);
  } else if (trendStrength > 2.0 && mean > 0.002) {
    regime = 'bull';
    confidence = Math.min(1, trendStrength / 4.0);
  } else if (trendStrength > 2.0 && mean < -0.002) {
    regime = 'bear';
    confidence = Math.min(1, trendStrength / 4.0);
  } else if (trendStrength > 3.0) {
    regime = 'breakout';
    confidence = Math.min(1, trendStrength / 5.0);
  } else {
    regime = 'sideways';
    confidence = Math.min(1, 1 - trendStrength / 2.0);
  }

  return { regime, confidence: Math.max(0.2, confidence) };
}

/**
 * Predict next regime using Markov chain transition matrix.
 */
export function predictNextRegime(current: MarketRegime): Record<MarketRegime, number> {
  return { ...REGIME_TRANSITION[current] };
}

// ─── Pattern Recognition ─────────────────────────────────────────────────────

/**
 * Detect chart patterns in price history.
 */
export function detectPatterns(prices: number[]): PatternMatch[] {
  const patterns: PatternMatch[] = [];
  if (prices.length < 30) return patterns;

  const last = prices[prices.length - 1];
  const recent50 = prices.slice(-50);
  const high50 = Math.max(...recent50);
  const low50 = Math.min(...recent50);
  const range50 = high50 - low50;

  // Support & Resistance levels
  const pivotHigh = findPivots(prices, 'high');
  const pivotLow = findPivots(prices, 'low');

  // Double Top
  if (pivotHigh.length >= 2) {
    const [p1, p2] = pivotHigh.slice(-2);
    if (Math.abs(p1.price - p2.price) / p1.price < 0.02 && p2.index > p1.index + 5) {
      const neckline = Math.min(...prices.slice(p1.index, p2.index + 1));
      patterns.push({
        pattern: 'Double Top',
        direction: 'bearish',
        strength: 0.7,
        priceTarget: neckline - (p1.price - neckline),
        description: `Double top at ${p1.price.toFixed(2)} — breakdown target: ${(neckline - (p1.price - neckline)).toFixed(2)}`,
      });
    }
  }

  // Double Bottom
  if (pivotLow.length >= 2) {
    const [p1, p2] = pivotLow.slice(-2);
    if (Math.abs(p1.price - p2.price) / p1.price < 0.02 && p2.index > p1.index + 5) {
      const neckline = Math.max(...prices.slice(p1.index, p2.index + 1));
      patterns.push({
        pattern: 'Double Bottom',
        direction: 'bullish',
        strength: 0.7,
        priceTarget: neckline + (neckline - p1.price),
        description: `Double bottom at ${p1.price.toFixed(2)} — breakout target: ${(neckline + (neckline - p1.price)).toFixed(2)}`,
      });
    }
  }

  // Ascending/Descending Triangle
  if (pivotHigh.length >= 3 && pivotLow.length >= 3) {
    const highs = pivotHigh.slice(-3).map(p => p.price);
    const lows = pivotLow.slice(-3).map(p => p.price);
    const highSlope = (highs[2] - highs[0]) / (highs.length - 1);
    const lowSlope = (lows[2] - lows[0]) / (lows.length - 1);

    if (Math.abs(highSlope) < range50 * 0.01 && lowSlope > range50 * 0.005) {
      patterns.push({
        pattern: 'Ascending Triangle',
        direction: 'bullish',
        strength: 0.65,
        priceTarget: high50 + range50 * 0.5,
        description: 'Ascending triangle — higher lows converging on flat resistance',
      });
    } else if (Math.abs(lowSlope) < range50 * 0.01 && highSlope < -range50 * 0.005) {
      patterns.push({
        pattern: 'Descending Triangle',
        direction: 'bearish',
        strength: 0.65,
        priceTarget: low50 - range50 * 0.5,
        description: 'Descending triangle — lower highs converging on flat support',
      });
    }
  }

  // Channel detection (trending within parallel bands)
  const sma20 = sma(prices, 20);
  const lastSma = sma20[sma20.length - 1];
  if (lastSma !== null) {
    const deviation = (last - lastSma) / lastSma;
    if (Math.abs(deviation) < 0.02) {
      patterns.push({
        pattern: 'Mean Reversion Zone',
        direction: 'neutral',
        strength: 0.5,
        priceTarget: lastSma,
        description: `Price near 20-SMA (${lastSma.toFixed(2)}) — mean reversion zone`,
      });
    }
  }

  // Momentum Divergence (price making new high but slope weakening)
  if (prices.length >= 40) {
    const recentPrices = prices.slice(-20);
    const priorPrices = prices.slice(-40, -20);
    const recentHigh = Math.max(...recentPrices);
    const priorHigh = Math.max(...priorPrices);
    const recentReturns = recentPrices.slice(1).map((p, i) => (p - recentPrices[i]) / recentPrices[i]);
    const priorReturns = priorPrices.slice(1).map((p, i) => (p - priorPrices[i]) / priorPrices[i]);
    const recentMomentum = recentReturns.reduce((a, b) => a + b, 0);
    const priorMomentum = priorReturns.reduce((a, b) => a + b, 0);

    if (recentHigh > priorHigh && recentMomentum < priorMomentum * 0.5) {
      patterns.push({
        pattern: 'Bearish Divergence',
        direction: 'bearish',
        strength: 0.6,
        priceTarget: null,
        description: 'Price making new highs but momentum weakening — bearish divergence',
      });
    } else if (recentPrices[recentPrices.length - 1] < priorPrices[priorPrices.length - 1] && recentMomentum > priorMomentum) {
      patterns.push({
        pattern: 'Bullish Divergence',
        direction: 'bullish',
        strength: 0.6,
        priceTarget: null,
        description: 'Price making lower lows but momentum strengthening — bullish divergence',
      });
    }
  }

  return patterns;
}

function findPivots(prices: number[], type: 'high' | 'low', window = 5): { index: number; price: number }[] {
  const pivots: { index: number; price: number }[] = [];
  for (let i = window; i < prices.length - window; i++) {
    const slice = prices.slice(i - window, i + window + 1);
    if (type === 'high' && prices[i] === Math.max(...slice)) {
      pivots.push({ index: i, price: prices[i] });
    } else if (type === 'low' && prices[i] === Math.min(...slice)) {
      pivots.push({ index: i, price: prices[i] });
    }
  }
  return pivots;
}

// ─── Indicator Confluence ────────────────────────────────────────────────────

/**
 * Compute multiple technical indicators and their signals.
 */
export function computeIndicators(prices: number[]): IndicatorSignal[] {
  const signals: IndicatorSignal[] = [];
  if (prices.length < 26) return signals;

  const last = prices[prices.length - 1];

  // RSI (14-period)
  const rsi14 = computeRSI(prices, 14);
  if (rsi14 !== null) {
    let signal: IndicatorSignal['signal'] = 'neutral';
    let strength = 0;
    if (rsi14 < 30) { signal = 'buy'; strength = (30 - rsi14) / 30; }
    else if (rsi14 > 70) { signal = 'sell'; strength = (rsi14 - 70) / 30; }
    else { strength = 0.3; }
    signals.push({
      name: 'RSI (14)',
      value: rsi14,
      signal,
      strength: Math.min(1, strength),
      description: rsi14 < 30 ? 'Oversold territory' : rsi14 > 70 ? 'Overbought territory' : 'Neutral range',
    });
  }

  // MACD (12, 26, 9)
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const lastEma12 = ema12[ema12.length - 1];
  const lastEma26 = ema26[ema26.length - 1];
  if (lastEma12 !== null && lastEma26 !== null) {
    const macdLine = lastEma12 - lastEma26;
    const prevEma12 = ema12[ema12.length - 2];
    const prevEma26 = ema26[ema26.length - 2];
    const prevMacd = prevEma12 !== null && prevEma26 !== null ? prevEma12 - prevEma26 : null;

    let signal: IndicatorSignal['signal'] = 'neutral';
    let strength = Math.min(1, Math.abs(macdLine) / (last * 0.02));
    if (prevMacd !== null) {
      if (macdLine > 0 && prevMacd <= 0) { signal = 'buy'; strength = 0.8; }
      else if (macdLine < 0 && prevMacd >= 0) { signal = 'sell'; strength = 0.8; }
      else if (macdLine > 0) { signal = 'buy'; }
      else { signal = 'sell'; }
    }
    signals.push({
      name: 'MACD (12,26,9)',
      value: macdLine,
      signal,
      strength,
      description: macdLine > 0 ? 'MACD bullish (above zero)' : 'MACD bearish (below zero)',
    });
  }

  // SMA crossover (20/50)
  const sma20 = sma(prices, 20);
  const sma50 = sma(prices, 50);
  const lastSma20 = sma20[sma20.length - 1];
  const lastSma50 = sma50[sma50.length - 1];
  if (lastSma20 !== null && lastSma50 !== null) {
    const prevSma20 = sma20[sma20.length - 2];
    const prevSma50 = sma50[sma50.length - 2];
    let signal: IndicatorSignal['signal'] = lastSma20 > lastSma50 ? 'buy' : 'sell';
    let strength = Math.min(1, Math.abs(lastSma20 - lastSma50) / (last * 0.03));
    if (prevSma20 !== null && prevSma50 !== null) {
      if (lastSma20 > lastSma50 && prevSma20 <= prevSma50) strength = 0.9; // golden cross
      if (lastSma20 < lastSma50 && prevSma20 >= prevSma50) strength = 0.9; // death cross
    }
    signals.push({
      name: 'SMA Cross (20/50)',
      value: lastSma20 - lastSma50,
      signal,
      strength,
      description: lastSma20 > lastSma50 ? 'Golden cross territory (20 > 50 SMA)' : 'Death cross territory (20 < 50 SMA)',
    });
  }

  // Bollinger Bands position
  const bbPeriod = 20;
  const bbSma = sma(prices, bbPeriod);
  const lastBbSma = bbSma[bbSma.length - 1];
  if (lastBbSma !== null) {
    const slice = prices.slice(-bbPeriod);
    const stdDev = Math.sqrt(slice.reduce((a, p) => a + (p - lastBbSma) ** 2, 0) / bbPeriod);
    const upper = lastBbSma + 2 * stdDev;
    const lower = lastBbSma - 2 * stdDev;
    const position = (last - lower) / (upper - lower); // 0 = at lower band, 1 = at upper band
    let signal: IndicatorSignal['signal'] = 'neutral';
    let strength = 0.4;
    if (position < 0.1) { signal = 'buy'; strength = 0.7; }
    else if (position > 0.9) { signal = 'sell'; strength = 0.7; }
    signals.push({
      name: 'Bollinger Bands',
      value: position,
      signal,
      strength,
      description: position < 0.2 ? 'Near lower band — oversold' : position > 0.8 ? 'Near upper band — overbought' : 'Within normal range',
    });
  }

  // Volume trend (if we had volume — use price volatility as proxy)
  const recentVol = computeVolatility(prices.slice(-10));
  const priorVol = prices.length >= 30 ? computeVolatility(prices.slice(-30, -10)) : recentVol;
  const volChange = priorVol > 0 ? (recentVol - priorVol) / priorVol : 0;
  signals.push({
    name: 'Volatility Shift',
    value: volChange,
    signal: Math.abs(volChange) > 0.3 ? (volChange > 0 ? 'sell' : 'buy') : 'neutral',
    strength: Math.min(1, Math.abs(volChange)),
    description: volChange > 0.3 ? 'Volatility expanding — caution' : volChange < -0.3 ? 'Volatility contracting — potential breakout' : 'Stable volatility',
  });

  return signals;
}

function computeRSI(prices: number[], period: number): number | null {
  if (prices.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - period - 1 + i] - prices[prices.length - period - 1 + i - 1];
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  return Math.sqrt(returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length);
}

// ─── Monte Carlo Simulation ─────────────────────────────────────────────────

/**
 * Run Monte Carlo price simulations using geometric Brownian motion
 * with optional jump diffusion for fat tails.
 */
export function monteCarloSimulation(
  currentPrice: number,
  prices: number[],
  horizon: number,    // days
  numPaths: number = 1000,
): { paths: number[][]; stats: PredictionResult['monteCarloStats'] } {
  // Estimate parameters from historical prices
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const mu = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sigma = computeVolatility(prices);

  // Jump diffusion parameters (capture fat tails)
  const jumpProb = 0.02;    // 2% chance of jump per day
  const jumpMean = 0;
  const jumpVol = sigma * 3; // jumps are 3x normal vol

  const paths: number[][] = [];
  const finalPrices: number[] = [];

  for (let p = 0; p < numPaths; p++) {
    const path = [currentPrice];
    let price = currentPrice;
    for (let d = 0; d < horizon; d++) {
      const z = gaussianRandom();
      const drift = (mu - 0.5 * sigma * sigma);
      const diffusion = sigma * z;

      // Jump component
      let jump = 0;
      if (Math.random() < jumpProb) {
        jump = jumpMean + jumpVol * gaussianRandom();
      }

      price = price * Math.exp(drift + diffusion + jump);
      path.push(price);
    }
    paths.push(path);
    finalPrices.push(price);
  }

  finalPrices.sort((a, b) => a - b);
  const stats = {
    mean: finalPrices.reduce((a, b) => a + b, 0) / numPaths,
    median: finalPrices[Math.floor(numPaths / 2)],
    p10: finalPrices[Math.floor(numPaths * 0.1)],
    p25: finalPrices[Math.floor(numPaths * 0.25)],
    p75: finalPrices[Math.floor(numPaths * 0.75)],
    p90: finalPrices[Math.floor(numPaths * 0.9)],
    maxGain: ((finalPrices[numPaths - 1] - currentPrice) / currentPrice) * 100,
    maxLoss: ((finalPrices[0] - currentPrice) / currentPrice) * 100,
  };

  return { paths, stats };
}

function gaussianRandom(): number {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Multi-Outcome Prediction ────────────────────────────────────────────────

const HORIZON_DAYS: Record<TimeHorizon, number> = { '1d': 1, '1w': 5, '1m': 21, '3m': 63 };

/**
 * Generate full multi-outcome prediction for an instrument.
 * This is the main entry point — combines all engines.
 */
export function predict(
  symbol: string,
  prices: number[],
  horizon: TimeHorizon = '1w',
): PredictionResult {
  const currentPrice = prices[prices.length - 1];
  const days = HORIZON_DAYS[horizon];

  // 1. Regime detection
  const { regime, confidence: regimeConfidence } = detectRegime(prices);

  // 2. Pattern recognition
  const patterns = detectPatterns(prices);

  // 3. Indicator confluence
  const indicators = computeIndicators(prices);

  // 4. Monte Carlo simulation (iteration count from user performance settings)
  const mcPaths = usePerformanceStore.getState().monteCarloIterations;
  const { stats: mcStats } = monteCarloSimulation(currentPrice, prices, days, mcPaths);

  // 5. Next regime probabilities
  const nextRegime = predictNextRegime(regime);

  // 6. Build multi-outcome distribution
  const outcomes = buildOutcomes(currentPrice, regime, patterns, indicators, mcStats, nextRegime, days);

  // 7. Consensus score
  const consensusScore = computeConsensus(indicators, patterns, regime);
  let consensus: PredictionResult['consensus'];
  if (consensusScore > 0.5) consensus = 'strong_buy';
  else if (consensusScore > 0.15) consensus = 'buy';
  else if (consensusScore > -0.15) consensus = 'neutral';
  else if (consensusScore > -0.5) consensus = 'sell';
  else consensus = 'strong_sell';

  // 8. Volatility estimate
  const volatilityEstimate = computeVolatility(prices) * Math.sqrt(252);

  return {
    symbol,
    currentPrice,
    horizon,
    regime,
    regimeConfidence,
    outcomes,
    indicators,
    patterns,
    consensus,
    consensusScore,
    volatilityEstimate,
    monteCarloStats: mcStats,
    timestamp: Date.now(),
  };
}

function buildOutcomes(
  currentPrice: number,
  regime: MarketRegime,
  patterns: PatternMatch[],
  indicators: IndicatorSignal[],
  mcStats: PredictionResult['monteCarloStats'],
  nextRegime: Record<MarketRegime, number>,
  _days: number,
): PriceOutcome[] {
  const outcomes: PriceOutcome[] = [];

  // Indicator consensus
  const bullSignals = indicators.filter(i => i.signal === 'buy');
  const bearSignals = indicators.filter(i => i.signal === 'sell');
  const bullStrength = bullSignals.reduce((a, i) => a + i.strength, 0) / Math.max(1, indicators.length);
  const bearStrength = bearSignals.reduce((a, i) => a + i.strength, 0) / Math.max(1, indicators.length);

  // Pattern-based targets
  const bullPatterns = patterns.filter(p => p.direction === 'bullish');
  const bearPatterns = patterns.filter(p => p.direction === 'bearish');

  // Outcome 1: Strong Rally
  {
    let prob = nextRegime.bull * 0.4 + bullStrength * 0.3;
    if (bullPatterns.length > 0) prob += 0.15;
    if (regime === 'bull') prob += 0.1;
    const target = mcStats.p90;
    const pct = ((target - currentPrice) / currentPrice) * 100;
    outcomes.push({
      label: 'Strong Rally',
      priceTarget: target,
      percentChange: pct,
      probability: Math.min(0.35, prob),
      confidence: Math.min(1, bullStrength + (bullPatterns.length > 0 ? 0.2 : 0)),
      reasoning: [
        `Monte Carlo P90: $${target.toFixed(2)} (+${pct.toFixed(1)}%)`,
        ...bullPatterns.map(p => p.description),
        ...bullSignals.slice(0, 2).map(i => `${i.name}: ${i.description}`),
      ],
    });
  }

  // Outcome 2: Moderate Up
  {
    let prob = nextRegime.bull * 0.3 + nextRegime.sideways * 0.2 + bullStrength * 0.2;
    if (regime === 'bull' || regime === 'sideways') prob += 0.1;
    const target = mcStats.p75;
    const pct = ((target - currentPrice) / currentPrice) * 100;
    outcomes.push({
      label: 'Moderate Gain',
      priceTarget: target,
      percentChange: pct,
      probability: Math.min(0.40, prob),
      confidence: 0.5 + bullStrength * 0.3,
      reasoning: [
        `Monte Carlo P75: $${target.toFixed(2)} (+${pct.toFixed(1)}%)`,
        `Regime: ${regime} (${(nextRegime.bull * 100).toFixed(0)}% → bull transition)`,
      ],
    });
  }

  // Outcome 3: Sideways / Flat
  {
    let prob = nextRegime.sideways * 0.5 + 0.1;
    if (regime === 'sideways') prob += 0.15;
    if (Math.abs(bullStrength - bearStrength) < 0.15) prob += 0.1;
    const target = mcStats.median;
    const pct = ((target - currentPrice) / currentPrice) * 100;
    outcomes.push({
      label: 'Sideways',
      priceTarget: target,
      percentChange: pct,
      probability: Math.min(0.40, prob),
      confidence: 0.4 + (regime === 'sideways' ? 0.2 : 0),
      reasoning: [
        `Monte Carlo Median: $${target.toFixed(2)} (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`,
        `Mixed signals: ${bullSignals.length} bull / ${bearSignals.length} bear indicators`,
      ],
    });
  }

  // Outcome 4: Moderate Decline
  {
    let prob = nextRegime.bear * 0.3 + nextRegime.volatile * 0.15 + bearStrength * 0.2;
    if (regime === 'bear') prob += 0.1;
    const target = mcStats.p25;
    const pct = ((target - currentPrice) / currentPrice) * 100;
    outcomes.push({
      label: 'Moderate Decline',
      priceTarget: target,
      percentChange: pct,
      probability: Math.min(0.35, prob),
      confidence: 0.5 + bearStrength * 0.3,
      reasoning: [
        `Monte Carlo P25: $${target.toFixed(2)} (${pct.toFixed(1)}%)`,
        `Bear transition: ${(nextRegime.bear * 100).toFixed(0)}% probability`,
      ],
    });
  }

  // Outcome 5: Sharp Sell-off
  {
    let prob = nextRegime.bear * 0.2 + nextRegime.volatile * 0.2 + bearStrength * 0.2;
    if (bearPatterns.length > 0) prob += 0.1;
    if (regime === 'bear' || regime === 'volatile') prob += 0.1;
    const target = mcStats.p10;
    const pct = ((target - currentPrice) / currentPrice) * 100;
    outcomes.push({
      label: 'Sharp Sell-off',
      priceTarget: target,
      percentChange: pct,
      probability: Math.min(0.25, prob),
      confidence: Math.min(1, bearStrength + (bearPatterns.length > 0 ? 0.2 : 0)),
      reasoning: [
        `Monte Carlo P10: $${target.toFixed(2)} (${pct.toFixed(1)}%)`,
        ...bearPatterns.map(p => p.description),
        ...bearSignals.slice(0, 2).map(i => `${i.name}: ${i.description}`),
      ],
    });
  }

  // Normalize probabilities to sum to 1
  const total = outcomes.reduce((a, o) => a + o.probability, 0);
  if (total > 0) {
    outcomes.forEach(o => { o.probability = o.probability / total; });
  }

  // Sort by probability descending
  outcomes.sort((a, b) => b.probability - a.probability);

  return outcomes;
}

function computeConsensus(indicators: IndicatorSignal[], patterns: PatternMatch[], regime: MarketRegime): number {
  let score = 0;
  let weight = 0;

  // Indicator signals
  for (const ind of indicators) {
    const dir = ind.signal === 'buy' ? 1 : ind.signal === 'sell' ? -1 : 0;
    score += dir * ind.strength;
    weight += ind.strength;
  }

  // Pattern signals
  for (const pat of patterns) {
    const dir = pat.direction === 'bullish' ? 1 : pat.direction === 'bearish' ? -1 : 0;
    score += dir * pat.strength * 0.8;
    weight += pat.strength * 0.8;
  }

  // Regime bias
  const regimeBias: Record<MarketRegime, number> = { bull: 0.2, bear: -0.2, sideways: 0, volatile: -0.05, breakout: 0.1 };
  score += regimeBias[regime];
  weight += 0.3;

  return weight > 0 ? score / weight : 0;
}

// ─── Accuracy Tracking ───────────────────────────────────────────────────────

/**
 * Evaluate prediction accuracy against actual outcomes.
 * Used by the simulation engine to benchmark model performance.
 */
export function evaluateAccuracy(
  predictions: Array<{ predicted: number; actual: number; confidence: number; predictedDirection: 'up' | 'down' }>,
): EngineAccuracy {
  if (predictions.length === 0) {
    return { totalPredictions: 0, correctDirection: 0, avgError: 0, avgConfidence: 0, directionAccuracy: 0, calibration: [] };
  }

  let correctDirection = 0;
  let totalError = 0;
  let totalConfidence = 0;

  for (const p of predictions) {
    const actualDir = p.actual >= p.predicted ? 'up' : 'down';
    if (actualDir === p.predictedDirection) correctDirection++;
    totalError += Math.abs(p.actual - p.predicted) / Math.max(0.01, Math.abs(p.predicted));
    totalConfidence += p.confidence;
  }

  // Calibration buckets (10% intervals)
  const buckets: Record<number, { predicted: number; actual: number; count: number }> = {};
  for (const p of predictions) {
    const bucket = Math.round(p.confidence * 10) / 10;
    if (!buckets[bucket]) buckets[bucket] = { predicted: 0, actual: 0, count: 0 };
    buckets[bucket].predicted += p.confidence;
    const actualDir = p.actual >= p.predicted ? 'up' : 'down';
    buckets[bucket].actual += actualDir === p.predictedDirection ? 1 : 0;
    buckets[bucket].count++;
  }

  const calibration = Object.entries(buckets).map(([, b]) => ({
    predicted: b.predicted / b.count,
    actual: b.actual / b.count,
  }));

  return {
    totalPredictions: predictions.length,
    correctDirection,
    avgError: totalError / predictions.length,
    avgConfidence: totalConfidence / predictions.length,
    directionAccuracy: correctDirection / predictions.length,
    calibration,
  };
}
