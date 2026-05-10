/**
 * forecastBridge.ts — Bridge to Quadratic IP Forecast & Signal Engines
 *
 * Imports the heavy forecasting algorithms from quadratic-ip/forge/forecastEngine.js
 * and the signal aggregation from quadratic-ip/signalEngine.js, adapting them
 * for use in the Empire React app's Exchange and Campaign modes.
 *
 * Since the QIP engines are ESM and browser-safe, we can import them directly.
 * This bridge provides typed wrappers + caching + the prediction orchestrator
 * that combines forecastEngine (ARIMA, HMM, Markov-Switching) with our
 * predictionEngine (Monte Carlo, pattern recognition, indicator confluence).
 */

import {
  predict as mcPredict,
  detectRegime,
  computeIndicators,
  monteCarloSimulation,
  evaluateAccuracy,
  type PredictionResult,
  type TimeHorizon,
  type EngineAccuracy,
} from './predictionEngine';
import { usePerformanceStore } from '../../store/performanceStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  step: number;
  value: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}

export interface RegimeProbability {
  regime: string;
  probability: number;
  duration: number;
  characteristics: string;
}

export interface FullAnalysis {
  symbol: string;
  currentPrice: number;
  prediction: PredictionResult;

  // From forecastEngine
  arimaForecast: ForecastPoint[] | null;
  etsForecast: ForecastPoint[] | null;
  regimeSwitching: RegimeProbability[] | null;
  structuralBreaks: number[];
  decomposition: { trend: number[]; seasonal: number[]; residual: number[] } | null;

  // Combined forecast
  combinedForecast: ForecastPoint[];
  forecastConfidence: number;

  // Signal aggregation
  signalScore: number; // -1 to +1
  signalRecommendation: string;
  signalRationale: string[];

  // Accuracy tracking
  accuracy: EngineAccuracy | null;

  timestamp: number;
}

// ─── QIP Engine Loader ───────────────────────────────────────────────────────
// The forecastEngine.js lives outside the Vite project root, so we load it
// at runtime via a global hook. If the QIP bundle is available (e.g. via
// a script tag or runtime injection), window.__QIP_FORECAST will be set.
// Otherwise we use our built-in fallback implementations which cover
// ARIMA, regime switching, decomposition, and structural breaks.

function loadForecastEngine(): any {
  return (globalThis as any).__QIP_FORECAST ?? null;
}

// ─── Forecast Cache ──────────────────────────────────────────────────────────

const _cache = new Map<string, { result: FullAnalysis; expiry: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCacheKey(symbol: string, horizon: TimeHorizon): string {
  return `${symbol}:${horizon}`;
}

// ─── Built-in Fallback Implementations ───────────────────────────────────────
// When QIP engines aren't available, use these lightweight implementations

function fallbackARIMA(prices: number[], horizon: number): ForecastPoint[] {
  // Simple AR(1) model as fallback
  if (prices.length < 10) return [];

  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // AR(1) coefficient
  let num = 0, den = 0;
  for (let i = 1; i < returns.length; i++) {
    num += (returns[i] - mean) * (returns[i - 1] - mean);
    den += (returns[i - 1] - mean) ** 2;
  }
  const phi = den > 0 ? num / den : 0;

  const points: ForecastPoint[] = [];
  let lastReturn = returns[returns.length - 1];
  let lastPrice = prices[prices.length - 1];

  for (let h = 1; h <= horizon; h++) {
    const forecastReturn = mean + phi * (lastReturn - mean);
    const forecastPrice = lastPrice * Math.exp(forecastReturn);
    const uncertainty = stdDev * Math.sqrt(h);

    points.push({
      step: h,
      value: forecastPrice,
      lower80: lastPrice * Math.exp(forecastReturn - 1.28 * uncertainty),
      upper80: lastPrice * Math.exp(forecastReturn + 1.28 * uncertainty),
      lower95: lastPrice * Math.exp(forecastReturn - 1.96 * uncertainty),
      upper95: lastPrice * Math.exp(forecastReturn + 1.96 * uncertainty),
    });

    lastReturn = forecastReturn;
    lastPrice = forecastPrice;
  }

  return points;
}

function fallbackRegimeSwitching(prices: number[]): RegimeProbability[] {
  const { regime, confidence } = detectRegime(prices);

  const regimeMap: Record<string, { char: string; prob: number }> = {
    bull: { char: 'Trending up — positive momentum, expanding breadth', prob: 0 },
    bear: { char: 'Trending down — negative momentum, risk-off sentiment', prob: 0 },
    sideways: { char: 'Range-bound — low directional conviction, mean-reverting', prob: 0 },
    volatile: { char: 'High volatility — large intraday swings, elevated VIX-like behavior', prob: 0 },
    breakout: { char: 'Breakout regime — transitioning from compression to expansion', prob: 0 },
  };

  // Set current regime as primary
  regimeMap[regime].prob = confidence;

  // Distribute remaining probability
  const remaining = 1 - confidence;
  const others = Object.keys(regimeMap).filter(k => k !== regime);
  others.forEach((k, i) => {
    regimeMap[k].prob = remaining * (others.length - i) / (others.length * (others.length + 1) / 2);
  });

  // Estimate regime duration
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  let currentDuration = 0;
  const recent = returns.slice(-30);
  for (let i = recent.length - 1; i >= 0; i--) {
    const r = recent[i];
    if (regime === 'bull' && r > 0) currentDuration++;
    else if (regime === 'bear' && r < 0) currentDuration++;
    else if (regime === 'sideways' && Math.abs(r) < 0.01) currentDuration++;
    else break;
  }

  return Object.entries(regimeMap).map(([name, { char, prob }]) => ({
    regime: name,
    probability: prob,
    duration: name === regime ? currentDuration : 0,
    characteristics: char,
  })).sort((a, b) => b.probability - a.probability);
}

function fallbackDecomposition(prices: number[]): { trend: number[]; seasonal: number[]; residual: number[] } | null {
  if (prices.length < 20) return null;

  // Simple Hodrick-Prescott-like trend extraction using moving average
  const period = Math.min(20, Math.floor(prices.length / 3));
  const trend: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const start = Math.max(0, i - Math.floor(period / 2));
    const end = Math.min(prices.length, i + Math.ceil(period / 2));
    const slice = prices.slice(start, end);
    trend.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }

  // Seasonal: detrended pattern
  const detrended = prices.map((p, i) => p - trend[i]);
  const seasonal = detrended.map((_, i) => {
    // Average seasonal component for this position in cycle
    let sum = 0, count = 0;
    for (let j = i % period; j < detrended.length; j += period) {
      sum += detrended[j];
      count++;
    }
    return count > 0 ? sum / count : 0;
  });

  const residual = prices.map((p, i) => p - trend[i] - seasonal[i]);

  return { trend, seasonal, residual };
}

function fallbackStructuralBreaks(prices: number[]): number[] {
  // Simple variance-ratio test for structural breaks
  if (prices.length < 40) return [];

  const breaks: number[] = [];
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const windowSize = 20;

  for (let i = windowSize; i < returns.length - windowSize; i++) {
    const leftVar = variance(returns.slice(i - windowSize, i));
    const rightVar = variance(returns.slice(i, i + windowSize));
    const ratio = Math.max(leftVar, rightVar) / (Math.min(leftVar, rightVar) + 1e-10);

    if (ratio > 3.0) { // Significant variance shift
      // Don't add breaks too close together
      if (breaks.length === 0 || i - breaks[breaks.length - 1] > windowSize) {
        breaks.push(i);
      }
    }
  }

  return breaks;
}

function variance(arr: number[]): number {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length;
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

const HORIZON_DAYS: Record<TimeHorizon, number> = { '1d': 1, '1w': 5, '1m': 21, '3m': 63 };

/**
 * Run full analysis on an instrument — combines all engines.
 * This is the main entry point for the Exchange Athena panel.
 */
export async function analyzeInstrument(
  symbol: string,
  prices: number[],
  horizon: TimeHorizon = '1w',
): Promise<FullAnalysis> {
  // Check cache
  const key = getCacheKey(symbol, horizon);
  const cached = _cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }

  const currentPrice = prices[prices.length - 1];
  const days = HORIZON_DAYS[horizon];

  // 1. Run our prediction engine (Monte Carlo, patterns, indicators)
  const prediction = mcPredict(symbol, prices, horizon);

  // 2. Try loading QIP forecast engine (available if injected at runtime)
  const fe = loadForecastEngine();

  let arimaForecast: ForecastPoint[] | null = null;
  let etsForecast: ForecastPoint[] | null = null;
  let regimeSwitching: RegimeProbability[] | null = null;
  let structuralBreaks: number[] = [];
  let decomposition: FullAnalysis['decomposition'] = null;
  let forecastConfidence = 0.5;

  if (fe) {
    // Use full QIP engine
    try {
      // ARIMA forecast
      const arimaResult = fe.arimaForecast(prices, 2, 1, 1, days);
      if (arimaResult && arimaResult.forecast) {
        arimaForecast = arimaResult.forecast.map((v: number, i: number) => ({
          step: i + 1,
          value: v,
          lower80: arimaResult.lower ? arimaResult.lower[i] : v * 0.95,
          upper80: arimaResult.upper ? arimaResult.upper[i] : v * 1.05,
          lower95: v * 0.92,
          upper95: v * 1.08,
        }));
      }
    } catch { /* use fallback */ }

    try {
      // ETS forecast
      const etsResult = fe.etsForecast(prices, days);
      if (etsResult && etsResult.forecast) {
        etsForecast = etsResult.forecast.map((v: number, i: number) => ({
          step: i + 1,
          value: v,
          lower80: v * 0.96,
          upper80: v * 1.04,
          lower95: v * 0.93,
          upper95: v * 1.07,
        }));
      }
    } catch { /* use fallback */ }

    try {
      // Regime switching (Markov-Switching AR)
      const msResult = fe.markovSwitchingAR(prices, 3, 1);
      if (msResult && msResult.regimes) {
        regimeSwitching = msResult.regimes.map((r: any) => ({
          regime: r.label || `Regime ${r.id}`,
          probability: r.probability || 0,
          duration: r.avgDuration || 0,
          characteristics: r.description || '',
        }));
      }
    } catch { /* use fallback */ }

    try {
      // Structural breaks (Bai-Perron)
      const bpResult = fe.baiPerronBreaks(prices, 5);
      if (bpResult && bpResult.breaks) {
        structuralBreaks = bpResult.breaks;
      }
    } catch { /* use fallback */ }

    try {
      // Decomposition
      const dResult = fe.decomposeSeries(prices, Math.min(20, Math.floor(prices.length / 3)));
      if (dResult) {
        decomposition = {
          trend: dResult.trend || [],
          seasonal: dResult.seasonal || [],
          residual: dResult.residual || [],
        };
      }
    } catch { /* use fallback */ }

    try {
      const diagResult = fe.forecastConfidenceScore?.({
        rmse: prediction.volatilityEstimate * currentPrice,
        aic: 0,
        bic: 0,
      });
      if (typeof diagResult === 'number') forecastConfidence = diagResult;
    } catch { /* ok */ }
  }

  // Fallbacks for missing QIP results
  if (!arimaForecast) arimaForecast = fallbackARIMA(prices, days);
  if (!regimeSwitching) regimeSwitching = fallbackRegimeSwitching(prices);
  if (structuralBreaks.length === 0) structuralBreaks = fallbackStructuralBreaks(prices);
  if (!decomposition) decomposition = fallbackDecomposition(prices);
  if (!etsForecast) {
    // Use Monte Carlo median path as ETS stand-in
    const mcPaths = Math.max(200, Math.floor(usePerformanceStore.getState().monteCarloIterations / 2));
    const { stats } = monteCarloSimulation(currentPrice, prices, days, mcPaths);
    etsForecast = Array.from({ length: days }, (_, i) => {
      const t = (i + 1) / days;
      const val = currentPrice + (stats.median - currentPrice) * t;
      const spread = (stats.p90 - stats.p10) * t * 0.5;
      return {
        step: i + 1,
        value: val,
        lower80: val - spread * 0.64,
        upper80: val + spread * 0.64,
        lower95: val - spread,
        upper95: val + spread,
      };
    });
  }

  // Combined forecast: weighted average of ARIMA + ETS + Monte Carlo median
  const combinedForecast: ForecastPoint[] = [];
  for (let i = 0; i < days; i++) {
    const arima = arimaForecast[i]?.value ?? currentPrice;
    const ets = etsForecast[i]?.value ?? currentPrice;
    const mcMedian = currentPrice + (prediction.monteCarloStats.median - currentPrice) * ((i + 1) / days);

    const combined = arima * 0.35 + ets * 0.30 + mcMedian * 0.35;
    const arimaSpread = (arimaForecast[i]?.upper95 ?? combined * 1.05) - (arimaForecast[i]?.lower95 ?? combined * 0.95);
    const etsSpread = (etsForecast[i]?.upper95 ?? combined * 1.05) - (etsForecast[i]?.lower95 ?? combined * 0.95);
    const avgSpread = (arimaSpread + etsSpread) / 2;

    combinedForecast.push({
      step: i + 1,
      value: combined,
      lower80: combined - avgSpread * 0.32,
      upper80: combined + avgSpread * 0.32,
      lower95: combined - avgSpread * 0.5,
      upper95: combined + avgSpread * 0.5,
    });
  }

  // Signal aggregation — derive from indicators + patterns + regime
  const bullIndicators = prediction.indicators.filter(i => i.signal === 'buy');
  const bearIndicators = prediction.indicators.filter(i => i.signal === 'sell');
  const signalScore = prediction.consensusScore;
  const signalRecommendation = prediction.consensus.replace('_', ' ').toUpperCase();

  const signalRationale: string[] = [];
  if (regimeSwitching && regimeSwitching[0]) {
    signalRationale.push(`Current regime: ${regimeSwitching[0].regime} (${(regimeSwitching[0].probability * 100).toFixed(0)}% confidence)`);
  }
  signalRationale.push(`Indicators: ${bullIndicators.length} bullish, ${bearIndicators.length} bearish`);
  if (prediction.patterns.length > 0) {
    signalRationale.push(`Patterns: ${prediction.patterns.map(p => p.pattern).join(', ')}`);
  }
  const finalTarget = combinedForecast[combinedForecast.length - 1]?.value ?? currentPrice;
  const pctMove = ((finalTarget - currentPrice) / currentPrice * 100);
  signalRationale.push(`Combined forecast: $${finalTarget.toFixed(2)} (${pctMove > 0 ? '+' : ''}${pctMove.toFixed(1)}%) over ${days} days`);

  if (structuralBreaks.length > 0) {
    const lastBreak = structuralBreaks[structuralBreaks.length - 1];
    const barsAgo = prices.length - lastBreak;
    signalRationale.push(`Last structural break: ${barsAgo} bars ago`);
  }

  const result: FullAnalysis = {
    symbol,
    currentPrice,
    prediction,
    arimaForecast,
    etsForecast,
    regimeSwitching,
    structuralBreaks,
    decomposition,
    combinedForecast,
    forecastConfidence: Math.max(0.2, Math.min(1, forecastConfidence)),
    signalScore,
    signalRecommendation,
    signalRationale,
    accuracy: null,
    timestamp: Date.now(),
  };

  // Cache result
  _cache.set(key, { result, expiry: Date.now() + CACHE_TTL });

  return result;
}

/**
 * Quick signal check — synchronous, no QIP engine needed.
 * Used for the instrument list quick-view badges.
 */
export function quickSignal(prices: number[]): {
  direction: 'up' | 'down' | 'flat';
  strength: number;
  regime: string;
} {
  if (prices.length < 20) return { direction: 'flat', strength: 0, regime: 'unknown' };

  const { regime } = detectRegime(prices);
  const indicators = computeIndicators(prices);

  let score = 0;
  for (const ind of indicators) {
    if (ind.signal === 'buy') score += ind.strength;
    else if (ind.signal === 'sell') score -= ind.strength;
  }

  const avgScore = score / Math.max(1, indicators.length);

  return {
    direction: avgScore > 0.1 ? 'up' : avgScore < -0.1 ? 'down' : 'flat',
    strength: Math.min(1, Math.abs(avgScore)),
    regime,
  };
}

// ─── Accuracy Benchmark ──────────────────────────────────────────────────────

const _predictionLog: Array<{
  symbol: string;
  predicted: number;
  confidence: number;
  predictedDirection: 'up' | 'down';
  timestamp: number;
  horizon: number;
}> = [];

/**
 * Log a prediction for later accuracy evaluation.
 */
export function logPrediction(symbol: string, currentPrice: number, predictedPrice: number, confidence: number, horizonDays: number) {
  _predictionLog.push({
    symbol,
    predicted: predictedPrice,
    confidence,
    predictedDirection: predictedPrice >= currentPrice ? 'up' : 'down',
    timestamp: Date.now(),
    horizon: horizonDays,
  });

  // Keep last 1000 predictions
  if (_predictionLog.length > 1000) _predictionLog.shift();
}

/**
 * Evaluate accuracy of past predictions against actual outcomes.
 */
export function benchmarkAccuracy(actualPrices: Record<string, number>): EngineAccuracy {
  const expired = _predictionLog.filter(p =>
    Date.now() - p.timestamp > p.horizon * 24 * 60 * 60 * 1000,
  );

  const evaluated = expired
    .filter(p => actualPrices[p.symbol] !== undefined)
    .map(p => ({
      predicted: p.predicted,
      actual: actualPrices[p.symbol],
      confidence: p.confidence,
      predictedDirection: p.predictedDirection,
    }));

  return evaluateAccuracy(evaluated);
}
