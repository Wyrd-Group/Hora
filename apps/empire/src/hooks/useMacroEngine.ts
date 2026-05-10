import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type MacroRegime,
  type MacroData,
  type YieldCurveAnalysis,
  type CreditCycleResult,
  getMacroRegime,
  analyzeYieldCurve,
  creditCyclePhase,
  taylorRule,
} from '../lib/engines/macroEngine';

export interface MacroEngineState {
  regime: MacroRegime | null;
  signals: string[];
  yieldCurve: YieldCurveAnalysis | null;
  creditPhase: CreditCycleResult | null;
  lastUpdate: number;
  isStale: boolean;
}

/**
 * useMacroEngine — Runs macro analysis on an interval (every 30s by default).
 * Returns the current macro regime, signals, yield curve analysis, and credit phase.
 *
 * @param macroData - Current macro data (from store or props)
 * @param intervalMs - Update interval in milliseconds (default 30000)
 */
export function useMacroEngine(
  macroData: MacroData | null,
  intervalMs: number = 30_000,
): MacroEngineState {
  const [state, setState] = useState<MacroEngineState>({
    regime: null,
    signals: [],
    yieldCurve: null,
    creditPhase: null,
    lastUpdate: 0,
    isStale: true,
  });

  const dataRef = useRef(macroData);
  dataRef.current = macroData;

  const runAnalysis = useCallback(() => {
    const data = dataRef.current;
    if (!data) return;

    const regime = getMacroRegime(data);
    const yieldCurve = analyzeYieldCurve(data.yieldRates);
    const creditPhaseResult = creditCyclePhase(data.creditGrowth, data.defaults);

    // Build signal descriptions
    const signals: string[] = [];
    signals.push(`Macro phase: ${regime.phase}`);
    signals.push(`Inflation regime: ${regime.inflationRegime}`);
    signals.push(`Risk level: ${regime.riskLevel}`);

    if (yieldCurve.isInverted) {
      signals.push(`Yield curve INVERTED (spread: ${yieldCurve.spread10Y2Y.toFixed(2)}%)`);
    }

    if (creditPhaseResult.phase !== 'neutral') {
      signals.push(`Credit cycle: ${creditPhaseResult.phase} — ${creditPhaseResult.signal}`);
    }

    const taylorRateVal = taylorRule(data.inflation, data.gdpGap);
    const rateGap = taylorRateVal - data.policyRate;
    if (Math.abs(rateGap) > 0.5) {
      signals.push(
        `Taylor Rule suggests rate ${rateGap > 0 ? 'hike' : 'cut'} (${taylorRateVal.toFixed(2)}% vs current ${data.policyRate.toFixed(2)}%)`,
      );
    }

    if (regime.sectorRotation.length > 0) {
      signals.push(`Favored sectors: ${regime.sectorRotation.slice(0, 3).join(', ')}`);
    }

    setState({
      regime,
      signals,
      yieldCurve,
      creditPhase: creditPhaseResult,
      lastUpdate: Date.now(),
      isStale: false,
    });
  }, []);

  // Run on mount and on interval
  useEffect(() => {
    runAnalysis();
    const timer = setInterval(runAnalysis, intervalMs);
    return () => clearInterval(timer);
  }, [runAnalysis, intervalMs]);

  // Re-run when macro data changes
  useEffect(() => {
    if (macroData) {
      runAnalysis();
    }
  }, [macroData, runAnalysis]);

  return state;
}

export default useMacroEngine;
