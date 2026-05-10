/**
 * macroEngine.ts — Macro-Financial Model (Pure Functions + Gemma Enhancement)
 *
 * Ported from MVP macroEngine.js. All functions are pure:
 * they accept data and return results with no side effects.
 *
 * Models: Yield Curve (Nelson-Siegel-Svensson), Taylor Rule,
 * Phillips Curve, Credit Cycle, Sector Rotation.
 *
 * Gemma-enhanced variants add narrative intelligence.
 */

import { enhanceMacroRegime, isOllamaAvailable } from './gemmaOllamaBridge';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NSSParams {
  beta0: number;
  beta1: number;
  beta2: number;
  beta3: number;
  lambda1: number;
  lambda2: number;
}

export interface YieldCurveAnalysis {
  shape: string;
  signal: string;
  confidence: number;
  spread10Y2Y: number;
  spread10Y3M: number;
  isInverted: boolean;
}

export interface CreditCycleResult {
  phase: string;
  signal: string;
  creditLevel: number;
  momentum: number;
}

export interface MacroData {
  inflation: number;
  inflationExpectations: number;
  gdpGap: number;
  unemployment: number;
  policyRate: number;
  creditGrowth: number[];
  defaults: number[];
  economicPhase: string;
  yieldRates: number[];
}

export interface MacroRegime {
  phase: string;
  inflationRegime: string;
  yieldCurve: YieldCurveAnalysis;
  taylorRate: number;
  phillipsCurveInflation: number;
  creditPhase: CreditCycleResult;
  sectorRotation: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CURVE_MATURITIES = [1, 3, 6, 12, 24, 36, 60, 84, 120, 240, 360];

const SECTOR_ROTATION_MAP: Record<string, Record<string, number>> = {
  expansion: {
    tech: 1.15, growth: 1.20, consumer: 1.05, finance: 1.10,
    industrial: 1.10, crypto: 1.15, auto: 1.08, media: 1.10,
    semiconductors: 1.15, healthcare: 0.95, intl: 1.05,
  },
  peak: {
    tech: 0.95, growth: 0.90, consumer: 1.05, finance: 1.00,
    industrial: 1.05, crypto: 0.90, auto: 0.95, media: 0.95,
    semiconductors: 0.95, healthcare: 1.10, intl: 0.95,
  },
  contraction: {
    tech: 0.85, growth: 0.75, consumer: 1.10, finance: 0.85,
    industrial: 0.80, crypto: 0.70, auto: 0.80, media: 0.85,
    semiconductors: 0.80, healthcare: 1.15, intl: 0.90,
  },
  trough: {
    tech: 1.05, growth: 1.10, consumer: 1.00, finance: 0.95,
    industrial: 0.90, crypto: 1.10, auto: 0.95, media: 1.00,
    semiconductors: 1.05, healthcare: 1.05, intl: 1.00,
  },
};

// ─── Nelson-Siegel-Svensson Yield Curve ──────────────────────────────────────

/**
 * NSS yield at maturity tau (in years).
 * y(t) = b0 + b1*f1(t/l1) + b2*f2(t/l1) + b3*f3(t/l2)
 */
function nssYield(tau: number, params: NSSParams): number {
  const { beta0, beta1, beta2, beta3, lambda1, lambda2 } = params;
  const t1 = tau / lambda1;
  const t2 = tau / lambda2;

  const exp1 = Math.exp(-t1);
  const exp2 = Math.exp(-t2);

  const factor1 = t1 > 0.001 ? (1 - exp1) / t1 : 1;
  const factor2 = factor1 - exp1;
  const factor3 = t2 > 0.001 ? (1 - exp2) / t2 - exp2 : 0;

  return beta0 + beta1 * factor1 + beta2 * factor2 + beta3 * factor3;
}

/**
 * Compute the full yield curve from NSS parameters.
 * Returns a record mapping maturity (months) to yield.
 */
export function computeYieldCurve(params: NSSParams): Record<number, number> {
  const curve: Record<number, number> = {};
  for (const m of CURVE_MATURITIES) {
    curve[m] = nssYield(m / 12, params);
  }
  return curve;
}

/**
 * Analyze a yield curve from an array of rate values across maturities.
 * Rates should be ordered from shortest to longest maturity.
 */
export function analyzeYieldCurve(rates: number[]): YieldCurveAnalysis {
  if (rates.length < 2) {
    return { shape: 'flat', signal: 'neutral', confidence: 0, spread10Y2Y: 0, spread10Y3M: 0, isInverted: false };
  }

  const shortRate = rates[0];
  const longRate = rates[rates.length - 1];
  const midIdx = Math.floor(rates.length / 2);
  const midRate = rates[midIdx];

  const spread10Y2Y = longRate - (rates.length > 2 ? rates[Math.floor(rates.length * 0.3)] : shortRate);
  const spread10Y3M = longRate - shortRate;
  const isInverted = spread10Y2Y < 0;

  let shape: string;
  let signal: string;
  let confidence: number;

  if (isInverted) {
    shape = 'inverted';
    signal = 'recession_warning';
    confidence = Math.min(1, Math.abs(spread10Y2Y) / 1.5);
  } else if (midRate > longRate && midRate > shortRate) {
    shape = 'humped';
    signal = 'late_cycle';
    confidence = 0.6;
  } else if (Math.abs(spread10Y2Y) < 0.25) {
    shape = 'flat';
    signal = 'transition';
    confidence = 0.5;
  } else {
    shape = 'normal';
    signal = spread10Y2Y > 1.5 ? 'strong_growth' : 'moderate_growth';
    confidence = Math.min(1, spread10Y2Y / 2);
  }

  return { shape, signal, confidence, spread10Y2Y, spread10Y3M, isInverted };
}

// ─── Taylor Rule ─────────────────────────────────────────────────────────────

/**
 * Taylor Rule: i* = r* + pi + 0.5*(pi - pi*) + 0.5*(y - y*)
 *
 * @param inflation - Current inflation rate (%)
 * @param gdpGap - Output gap: % deviation from potential GDP
 * @param neutralRate - Neutral real rate (default 0.5%)
 * @returns Recommended policy rate (%)
 */
export function taylorRule(
  inflation: number,
  gdpGap: number,
  neutralRate: number = 0.5,
): number {
  const piStar = 2.0; // Inflation target
  const rate = neutralRate + inflation + 0.5 * (inflation - piStar) + 0.5 * gdpGap;
  return Math.max(-0.5, Math.min(15, rate));
}

// ─── Phillips Curve ──────────────────────────────────────────────────────────

/**
 * New Keynesian Phillips Curve.
 * pi_t = beta * E[pi_{t+1}] + kappa * (y_t - y*)
 *
 * @param unemployment - Current unemployment rate (%)
 * @param inflationExpectation - Expected future inflation (%)
 * @returns Implied inflation rate (%)
 */
export function phillipsCurve(
  unemployment: number,
  inflationExpectation: number,
): number {
  const beta = 0.97;
  const kappa = 0.3;
  // NAIRU assumed at 4.5%. Output gap inferred from unemployment deviation
  const outputGap = (4.5 - unemployment) * 0.8;
  const newPi = beta * inflationExpectation + kappa * outputGap;
  return Math.max(-2, Math.min(15, newPi));
}

// ─── Credit Cycle ────────────────────────────────────────────────────────────

/**
 * Determine the current credit cycle phase from credit growth and defaults data.
 * Based on Minsky dynamics: Hedge -> Speculative -> Ponzi -> Deleveraging.
 *
 * @param creditGrowth - Array of recent credit growth readings (%)
 * @param defaults - Array of recent default rate readings (%)
 * @returns Credit cycle phase and signal
 */
export function creditCyclePhase(
  creditGrowth: number[],
  defaults: number[],
): CreditCycleResult {
  if (creditGrowth.length === 0) {
    return { phase: 'neutral', signal: 'no_data', creditLevel: 100, momentum: 0 };
  }

  const avgGrowth = creditGrowth.reduce((s, v) => s + v, 0) / creditGrowth.length;
  const recentGrowth = creditGrowth.length > 3
    ? creditGrowth.slice(-3).reduce((s, v) => s + v, 0) / 3
    : avgGrowth;

  const avgDefaults = defaults.length > 0
    ? defaults.reduce((s, v) => s + v, 0) / defaults.length
    : 0;

  const momentum = recentGrowth - avgGrowth;

  let phase: string;
  let signal: string;

  if (avgGrowth > 8 && avgDefaults < 2) {
    phase = 'speculative';
    signal = 'overheating';
  } else if (avgGrowth > 12 || (avgGrowth > 5 && avgDefaults > 3)) {
    phase = 'ponzi';
    signal = 'minsky_warning';
  } else if (avgGrowth < -2) {
    phase = 'deleveraging';
    signal = 'credit_contraction';
  } else if (avgGrowth < 0) {
    phase = 'repair';
    signal = 'bottoming';
  } else if (avgGrowth > 3 && avgDefaults < 1.5) {
    phase = 'hedge';
    signal = 'healthy_expansion';
  } else {
    phase = 'neutral';
    signal = 'stable';
  }

  // Credit level normalized around 100
  const creditLevel = 100 + avgGrowth * 5;

  return { phase, signal, creditLevel, momentum };
}

// ─── Sector Rotation ─────────────────────────────────────────────────────────

/**
 * Return the recommended sectors for a given economic cycle phase.
 * Sectors are ordered by expected outperformance (multiplier > 1).
 *
 * @param cyclePhase - One of: expansion, peak, contraction, trough
 * @returns Array of sector names sorted by expected performance (best first)
 */
export function sectorRotation(cyclePhase: string): string[] {
  const multipliers = SECTOR_ROTATION_MAP[cyclePhase] ?? SECTOR_ROTATION_MAP.expansion;
  return Object.entries(multipliers)
    .sort(([, a], [, b]) => b - a)
    .filter(([, mult]) => mult > 1.0)
    .map(([sector]) => sector);
}

/**
 * Get full sector multiplier map for a given phase.
 */
export function getSectorMultipliers(cyclePhase: string): Record<string, number> {
  return { ...(SECTOR_ROTATION_MAP[cyclePhase] ?? SECTOR_ROTATION_MAP.expansion) };
}

// ─── Aggregate Macro Regime ──────────────────────────────────────────────────

/**
 * Aggregate macro assessment combining all sub-models.
 * Accepts a MacroData input and returns a full regime analysis.
 */
export function getMacroRegime(data: MacroData): MacroRegime {
  const yieldCurve = analyzeYieldCurve(data.yieldRates);
  const taylorRateVal = taylorRule(data.inflation, data.gdpGap);
  const phillipsInflation = phillipsCurve(data.unemployment, data.inflationExpectations);
  const creditPhase = creditCyclePhase(data.creditGrowth, data.defaults);
  const sectors = sectorRotation(data.economicPhase);

  // Inflation regime classification
  let inflationRegime: string;
  if (data.inflation > 5) inflationRegime = 'high_inflation';
  else if (data.inflation > 3) inflationRegime = 'above_target';
  else if (data.inflation > 1) inflationRegime = 'on_target';
  else if (data.inflation > 0) inflationRegime = 'low_inflation';
  else inflationRegime = 'deflation';

  // Risk level
  let riskLevel: 'low' | 'medium' | 'high';
  const riskScore =
    (yieldCurve.isInverted ? 2 : 0) +
    (creditPhase.phase === 'ponzi' ? 3 : creditPhase.phase === 'speculative' ? 1 : 0) +
    (data.inflation > 5 ? 1 : 0) +
    (data.economicPhase === 'contraction' ? 2 : 0);

  if (riskScore >= 4) riskLevel = 'high';
  else if (riskScore >= 2) riskLevel = 'medium';
  else riskLevel = 'low';

  const confidence = Math.min(
    1,
    (yieldCurve.confidence + 0.7) / 2,
  );

  return {
    phase: data.economicPhase,
    inflationRegime,
    yieldCurve,
    taylorRate: taylorRateVal,
    phillipsCurveInflation: phillipsInflation,
    creditPhase,
    sectorRotation: sectors,
    riskLevel,
    confidence,
  };
}

// ─── Gemma-Enhanced Wrappers ────────────────────────────────────────────────

export interface EnhancedMacroRegime extends MacroRegime {
  gemmaAnalysis?: string;
}

/**
 * Gemma-enhanced macro regime: runs pure getMacroRegime()
 * then adds narrative explanation of the economic environment.
 */
export async function getMacroRegimeWithGemma(data: MacroData): Promise<EnhancedMacroRegime> {
  const regime = getMacroRegime(data);
  if (!isOllamaAvailable()) return regime;

  const narrative = await enhanceMacroRegime({
    phase: regime.phase,
    gdpGrowth: data.gdpGap,
    inflation: data.inflation,
    interestRate: data.policyRate,
    sentiment: regime.confidence,
  });

  return { ...regime, gemmaAnalysis: narrative || undefined };
}

// ── Living World: Regional Macro Regime ──────────────────────────

export interface WorldEventEffect {
  income_modifier?: number;
  cost_modifier?: number;
}

export interface RegionalMacroRegime extends MacroRegime {
  regionH3: string;
  incomeMultiplier: number;
  costMultiplier: number;
  eventEffects: WorldEventEffect[];
}

/**
 * Compute a regional macro regime by layering world event effects
 * on top of the global macro regime.
 *
 * @param globalMacro - Base macro data
 * @param regionH3 - H3 cell identifier for the region
 * @param activeEvents - World events affecting this region
 */
export function getRegionalRegime(
  globalMacro: MacroData,
  regionH3: string,
  activeEvents: Array<{ effects: WorldEventEffect; severity: number; event_type: string }> = [],
): RegionalMacroRegime {
  const base = getMacroRegime(globalMacro);

  let incomeMultiplier = 1.0;
  let costMultiplier = 1.0;
  const eventEffects: WorldEventEffect[] = [];

  for (const event of activeEvents) {
    const eff = event.effects || {};
    if (eff.income_modifier) {
      incomeMultiplier *= (1 + eff.income_modifier * event.severity);
    }
    if (eff.cost_modifier) {
      costMultiplier *= (1 + eff.cost_modifier * event.severity);
    }
    eventEffects.push(eff);
  }

  // Phase-based adjustments
  if (base.phase === 'expansion') {
    incomeMultiplier *= 1.15;
    costMultiplier *= 0.95;
  } else if (base.phase === 'contraction') {
    incomeMultiplier *= 0.80;
    costMultiplier *= 1.20;
  } else if (base.phase === 'recession') {
    incomeMultiplier *= 0.60;
    costMultiplier *= 1.40;
  }

  return {
    ...base,
    regionH3,
    incomeMultiplier,
    costMultiplier,
    eventEffects,
  };
}
