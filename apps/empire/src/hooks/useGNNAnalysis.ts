import { useState, useCallback } from 'react';
import {
  correlationMatrix,
  louvainClustering,
  debtRank,
  type DebtRankResult,
} from '../lib/engines/gnnEngine';

export interface GNNAnalysisState {
  /** Trigger analysis with given price histories per instrument */
  analyze: (priceHistories: Record<string, number[]>) => void;
  /** N x N correlation matrix (row/col order matches last analyze call) */
  correlationMatrix: number[][] | null;
  /** Community cluster assignments */
  clusters: number[] | null;
  /** Systemic risk result from DebtRank */
  systemicRisk: DebtRankResult | null;
  /** Symbol order (from last analyze call) */
  symbols: string[];
  /** Whether analysis is currently running */
  isAnalyzing: boolean;
  /** Timestamp of last analysis */
  lastAnalysis: number;
}

/**
 * useGNNAnalysis — On-demand correlation/network analysis.
 *
 * Call `analyze(priceHistories)` with a Record mapping instrument IDs
 * to their price history arrays. Returns correlation matrix, clusters,
 * and systemic risk assessment.
 */
export function useGNNAnalysis(): GNNAnalysisState {
  const [corrMatrix, setCorrMatrix] = useState<number[][] | null>(null);
  const [clusters, setClusters] = useState<number[] | null>(null);
  const [systemicRiskResult, setSystemicRisk] = useState<DebtRankResult | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(0);

  const analyze = useCallback((priceHistories: Record<string, number[]>) => {
    setIsAnalyzing(true);

    const syms = Object.keys(priceHistories);
    setSymbols(syms);

    if (syms.length < 2) {
      setCorrMatrix(null);
      setClusters(null);
      setSystemicRisk(null);
      setIsAnalyzing(false);
      return;
    }

    const histories = syms.map(s => priceHistories[s]);

    // 1. Correlation matrix
    const corr = correlationMatrix(histories);
    setCorrMatrix(corr);

    // 2. Community detection via Louvain on |correlation| matrix
    // Convert correlation to adjacency weights (absolute values, zero diagonal)
    const absCorr = corr.map((row, i) =>
      row.map((val, j) => (i === j ? 0 : Math.max(0, Math.abs(val) - 0.2))),
    );
    const communityLabels = louvainClustering(absCorr);
    setClusters(communityLabels);

    // 3. Systemic risk via DebtRank
    // Use positive correlation as exposure proxy, equity = 1 for all (equal weight)
    const exposures = corr.map((row, i) =>
      row.map((val, j) => (i === j ? 0 : Math.max(0, val))),
    );
    const equity = new Array(syms.length).fill(1);
    const risk = debtRank(exposures, equity);
    setSystemicRisk(risk);

    setLastAnalysis(Date.now());
    setIsAnalyzing(false);
  }, []);

  return {
    analyze,
    correlationMatrix: corrMatrix,
    clusters,
    systemicRisk: systemicRiskResult,
    symbols,
    isAnalyzing,
    lastAnalysis,
  };
}

export default useGNNAnalysis;
