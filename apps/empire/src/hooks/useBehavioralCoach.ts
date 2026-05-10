import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type Trade,
  type Holding,
  type BiasAlert,
  detectBiases,
} from '../lib/engines/behavioralEngine';

export interface BehavioralCoachState {
  alerts: BiasAlert[];
  dismissAlert: (id: string) => void;
  competencyScore: number;
  lastAnalysis: number;
}

/**
 * useBehavioralCoach — Monitors trade history and detects cognitive biases.
 * Returns active bias alerts and a dismiss function.
 *
 * @param tradeHistory - Array of executed trades
 * @param holdings - Current portfolio holdings
 * @param totalPortfolioValue - Total portfolio value for concentration analysis
 * @param assetReturns - Recent returns per asset (for gambler's fallacy detection)
 */
export function useBehavioralCoach(
  tradeHistory: Trade[],
  holdings: Holding[] = [],
  totalPortfolioValue: number = 0,
  assetReturns: Record<string, number[]> = {},
): BehavioralCoachState {
  const [alerts, setAlerts] = useState<BiasAlert[]>([]);
  const [competencyScore, setCompetencyScore] = useState(50);
  const [lastAnalysis, setLastAnalysis] = useState(0);

  const prevTradeCountRef = useRef(0);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Run bias detection when trade history changes
  useEffect(() => {
    // Only re-analyze if new trades have been added
    if (tradeHistory.length === prevTradeCountRef.current) return;
    prevTradeCountRef.current = tradeHistory.length;

    if (tradeHistory.length < 5) return;

    const detected = detectBiases(
      tradeHistory,
      holdings,
      totalPortfolioValue,
      assetReturns,
    );

    // Merge with existing alerts: replace if same bias, add new ones
    setAlerts(prev => {
      const existingBiases = new Set(prev.map(a => a.bias));
      const newAlerts = detected.filter(a => !existingBiases.has(a.bias));
      const updatedExisting = prev.map(existing => {
        const update = detected.find(d => d.bias === existing.bias);
        return update ?? existing;
      });
      return [...updatedExisting, ...newAlerts];
    });

    // Competency score: 100 minus average bias score
    if (detected.length > 0) {
      const avgScore = detected.reduce((s, a) => s + a.score, 0) / detected.length;
      setCompetencyScore(Math.max(0, Math.min(100, 100 - avgScore)));
    } else {
      // No biases detected — high competency
      setCompetencyScore(Math.min(100, competencyScore + 5));
    }

    setLastAnalysis(Date.now());
  }, [tradeHistory, holdings, totalPortfolioValue, assetReturns, competencyScore]);

  return {
    alerts,
    dismissAlert,
    competencyScore,
    lastAnalysis,
  };
}

export default useBehavioralCoach;
