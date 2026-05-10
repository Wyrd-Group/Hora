/**
 * AthenaExchangePanel.jsx — AI Analysis & Prediction Panel for Exchange
 *
 * Integrates the predictionEngine + forecastBridge into the trading terminal.
 * Shows: multi-outcome probabilities, indicator confluence, regime detection,
 * Monte Carlo distribution, forecast confidence bands, and buy/sell recommendation.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { analyzeInstrument, quickSignal } from '../../lib/engines/forecastBridge';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const fmt = (v) => typeof v === 'number' ? `$${v.toFixed(2)}` : '—';

const CONSENSUS_COLORS = {
  strong_buy: '#10b981',
  buy: '#34d399',
  neutral: '#9CA3AF',
  sell: '#f87171',
  strong_sell: '#ef4444',
};

const REGIME_COLORS = {
  bull: '#10b981',
  bear: '#ef4444',
  sideways: '#f59e0b',
  volatile: '#a78bfa',
  breakout: '#00e5ff',
};

const INDICATOR_SIGNAL_COLORS = {
  buy: '#10b981',
  sell: '#ef4444',
  neutral: '#6b7280',
};

// ─── Subcomponents ───────────────────────────────────────────────────────────

const OutcomeBar = ({ outcome, maxProb }) => {
  const barWidth = maxProb > 0 ? (outcome.probability / maxProb) * 100 : 0;
  const isPositive = outcome.percentChange >= 0;
  const color = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[9px] font-mono text-tactical-text/70 uppercase tracking-wider">{outcome.label}</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>
          {fmt(outcome.priceTarget)} ({pct(outcome.percentChange)})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-tactical-bg/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%`, background: color, opacity: 0.5 + outcome.confidence * 0.5 }}
          />
        </div>
        <span className="text-[8px] font-mono font-bold text-tactical-text/50 w-10 text-right">
          {(outcome.probability * 100).toFixed(0)}%
        </span>
      </div>
      {outcome.reasoning.length > 0 && (
        <div className="text-[7px] font-mono text-tactical-text/30 mt-0.5 pl-1 leading-tight">
          {outcome.reasoning[0]}
        </div>
      )}
    </div>
  );
};

const IndicatorRow = ({ indicator }) => {
  const color = INDICATOR_SIGNAL_COLORS[indicator.signal];
  return (
    <div className="flex items-center justify-between py-1 border-b border-tactical-border/10 last:border-0">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[8px] font-mono text-tactical-text/60">{indicator.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-mono text-tactical-text/40">{typeof indicator.value === 'number' ? indicator.value.toFixed(2) : indicator.value}</span>
        <span className="text-[7px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color, background: `${color}15` }}>
          {indicator.signal}
        </span>
      </div>
    </div>
  );
};

const RegimeCard = ({ regime, isActive }) => {
  const color = REGIME_COLORS[regime.regime] || '#6b7280';
  return (
    <div className={`p-2 rounded-lg border transition-all ${isActive ? 'border-opacity-50' : 'border-tactical-border/10 opacity-50'}`}
      style={{ borderColor: isActive ? color : undefined, background: isActive ? `${color}08` : 'transparent' }}>
      <div className="flex justify-between items-center">
        <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color }}>{regime.regime}</span>
        <span className="text-[9px] font-mono font-bold" style={{ color }}>{(regime.probability * 100).toFixed(0)}%</span>
      </div>
      {isActive && regime.duration > 0 && (
        <div className="text-[7px] font-mono text-tactical-text/30 mt-0.5">Duration: {regime.duration} bars</div>
      )}
      <div className="text-[7px] font-mono text-tactical-text/25 mt-0.5 leading-tight">{regime.characteristics}</div>
    </div>
  );
};

const MonteCarloBar = ({ label, value, currentPrice, color }) => {
  const change = ((value - currentPrice) / currentPrice) * 100;
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[7px] font-mono text-tactical-text/40 w-8">{label}</span>
      <div className="flex-1 mx-2 h-1 bg-tactical-bg/40 rounded-full relative">
        <div className="absolute top-0 h-1 rounded-full" style={{
          background: color,
          left: change < 0 ? `${50 + change}%` : '50%',
          width: `${Math.min(50, Math.abs(change))}%`,
          opacity: 0.6,
        }} />
        <div className="absolute top-0 left-1/2 w-px h-1 bg-tactical-text/20" />
      </div>
      <span className="text-[7px] font-mono font-bold w-16 text-right" style={{ color }}>
        {fmt(value)} ({pct(change)})
      </span>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AthenaExchangePanel({ symbol, prices, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState('1w');
  const [activeSection, setActiveSection] = useState('overview'); // overview | outcomes | indicators | regime | montecarlo

  const runAnalysis = useCallback(async () => {
    if (!prices || prices.length < 30) return;
    setLoading(true);
    try {
      const result = await analyzeInstrument(symbol, prices, horizon);
      setAnalysis(result);
    } catch (err) {
      console.error('[AthenaExchange] Analysis failed:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, prices, horizon]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  if (loading || !analysis) {
    return (
      <div className="bg-[#0b1018] border border-tactical-border/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-[#a78bfa]/20 flex items-center justify-center">
            <span className="text-[10px]">🔮</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#a78bfa] tracking-widest uppercase">ATHENA ANALYSIS</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
          <span className="text-[9px] font-mono text-tactical-text/40 ml-2">Running {symbol} analysis...</span>
        </div>
      </div>
    );
  }

  const { prediction, regimeSwitching, combinedForecast } = analysis;
  const consensusColor = CONSENSUS_COLORS[prediction.consensus] || '#6b7280';
  const maxOutcomeProb = Math.max(...prediction.outcomes.map(o => o.probability));

  const sections = [
    { id: 'overview', label: 'Overview', icon: '◉' },
    { id: 'outcomes', label: 'Outcomes', icon: '◈' },
    { id: 'indicators', label: 'Signals', icon: '◆' },
    { id: 'regime', label: 'Regime', icon: '◇' },
    { id: 'montecarlo', label: 'Monte Carlo', icon: '◎' },
  ];

  return (
    <div className="bg-[#0b1018] border border-[#a78bfa]/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-tactical-border/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#a78bfa]/20 flex items-center justify-center">
            <span className="text-[10px]">🔮</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#a78bfa] tracking-widest uppercase">ATHENA · {symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Horizon selector */}
          <div className="flex gap-0.5">
            {['1d', '1w', '1m', '3m'].map(h => (
              <button key={h} onClick={() => setHorizon(h)}
                className={`px-1.5 py-0.5 rounded text-[7px] font-mono font-bold uppercase transition-all ${horizon === h ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-tactical-text/30 hover:text-tactical-text/50'}`}>
                {h}
              </button>
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Close exchange panel" className="text-tactical-text/30 hover:text-tactical-text/60 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Consensus Banner */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: `${consensusColor}08` }}>
        <div>
          <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider">Consensus</div>
          <div className="text-sm font-mono font-bold uppercase tracking-wider" style={{ color: consensusColor }}>
            {prediction.consensus.replace('_', ' ')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-mono text-tactical-text/40">Forecast ({horizon})</div>
          <div className="text-sm font-mono font-bold" style={{ color: combinedForecast[combinedForecast.length - 1]?.value >= analysis.currentPrice ? '#10b981' : '#ef4444' }}>
            {fmt(combinedForecast[combinedForecast.length - 1]?.value)} <span className="text-[9px]">{pct(((combinedForecast[combinedForecast.length - 1]?.value ?? analysis.currentPrice) - analysis.currentPrice) / analysis.currentPrice * 100)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-mono text-tactical-text/40">Confidence</div>
          <div className="text-sm font-mono font-bold" style={{ color: consensusColor }}>
            {(analysis.forecastConfidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-tactical-border/10 px-2">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-1.5 text-center text-[7px] font-mono uppercase tracking-wider transition-all border-b-2 ${activeSection === s.id ? 'text-[#a78bfa] border-[#a78bfa]' : 'text-tactical-text/30 border-transparent hover:text-tactical-text/50'}`}>
            <span className="mr-0.5">{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 max-h-[400px] overflow-y-auto scrollbar-thin">
        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <div className="space-y-3">
            {/* Signal Rationale */}
            <div>
              <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider mb-1">Analysis Summary</div>
              {analysis.signalRationale.map((r, i) => (
                <div key={i} className="text-[8px] font-mono text-tactical-text/50 flex items-start gap-1.5 mb-0.5">
                  <span className="text-[#a78bfa] mt-0.5">›</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-tactical-bg/40 rounded-lg p-2 text-center">
                <div className="text-[7px] font-mono text-tactical-text/30 uppercase">Regime</div>
                <div className="text-[10px] font-mono font-bold uppercase mt-0.5" style={{ color: REGIME_COLORS[prediction.regime] }}>
                  {prediction.regime}
                </div>
              </div>
              <div className="bg-tactical-bg/40 rounded-lg p-2 text-center">
                <div className="text-[7px] font-mono text-tactical-text/30 uppercase">Volatility</div>
                <div className="text-[10px] font-mono font-bold text-tactical-text mt-0.5">
                  {(prediction.volatilityEstimate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-tactical-bg/40 rounded-lg p-2 text-center">
                <div className="text-[7px] font-mono text-tactical-text/30 uppercase">Patterns</div>
                <div className="text-[10px] font-mono font-bold text-tactical-text mt-0.5">
                  {prediction.patterns.length}
                </div>
              </div>
            </div>

            {/* Top outcome */}
            {prediction.outcomes[0] && (
              <div className="bg-tactical-bg/30 rounded-lg p-2 border border-tactical-border/10">
                <div className="text-[7px] font-mono text-tactical-text/30 uppercase mb-1">Most Likely Outcome</div>
                <OutcomeBar outcome={prediction.outcomes[0]} maxProb={maxOutcomeProb} />
              </div>
            )}

            {/* Patterns detected */}
            {prediction.patterns.length > 0 && (
              <div>
                <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider mb-1">Patterns Detected</div>
                {prediction.patterns.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{
                      background: p.direction === 'bullish' ? '#10b981' : p.direction === 'bearish' ? '#ef4444' : '#f59e0b'
                    }} />
                    <span className="text-[8px] font-mono text-tactical-text/50">{p.pattern}</span>
                    <span className="text-[7px] font-mono text-tactical-text/30 ml-auto">
                      {(p.strength * 100).toFixed(0)}% strength
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OUTCOMES */}
        {activeSection === 'outcomes' && (
          <div>
            <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider mb-2">
              Probability Distribution · {prediction.outcomes.length} Scenarios
            </div>
            {prediction.outcomes.map((o, i) => (
              <OutcomeBar key={i} outcome={o} maxProb={maxOutcomeProb} />
            ))}
            <div className="mt-3 text-[7px] font-mono text-tactical-text/25 leading-relaxed">
              Probabilities derived from Monte Carlo simulation (2000 paths), Markov regime transitions,
              technical pattern recognition, and indicator confluence scoring.
            </div>
          </div>
        )}

        {/* INDICATORS */}
        {activeSection === 'indicators' && (
          <div>
            <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider mb-2">
              Technical Indicators · Confluence Score: <span style={{ color: consensusColor }}>{prediction.consensusScore.toFixed(2)}</span>
            </div>
            {prediction.indicators.map((ind, i) => (
              <IndicatorRow key={i} indicator={ind} />
            ))}
            <div className="mt-3 pt-2 border-t border-tactical-border/10">
              <div className="text-[7px] font-mono text-tactical-text/30 mb-1">Signal Distribution</div>
              <div className="flex gap-3">
                <span className="text-[8px] font-mono text-emerald-400">
                  ▲ {prediction.indicators.filter(i => i.signal === 'buy').length} Buy
                </span>
                <span className="text-[8px] font-mono text-gray-400">
                  ● {prediction.indicators.filter(i => i.signal === 'neutral').length} Neutral
                </span>
                <span className="text-[8px] font-mono text-rose-400">
                  ▼ {prediction.indicators.filter(i => i.signal === 'sell').length} Sell
                </span>
              </div>
            </div>
          </div>
        )}

        {/* REGIME */}
        {activeSection === 'regime' && (
          <div className="space-y-3">
            <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider">
              Market Regime Analysis
            </div>
            {regimeSwitching && (
              <div className="space-y-1.5">
                {regimeSwitching.map((r, i) => (
                  <RegimeCard key={r.regime} regime={r} isActive={i === 0} />
                ))}
              </div>
            )}
            {analysis.structuralBreaks.length > 0 && (
              <div>
                <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider mb-1">
                  Structural Breaks
                </div>
                <div className="text-[8px] font-mono text-tactical-text/50">
                  {analysis.structuralBreaks.length} break{analysis.structuralBreaks.length !== 1 ? 's' : ''} detected in price series.
                  Most recent: {prices.length - analysis.structuralBreaks[analysis.structuralBreaks.length - 1]} bars ago.
                </div>
              </div>
            )}
          </div>
        )}

        {/* MONTE CARLO */}
        {activeSection === 'montecarlo' && (
          <div className="space-y-3">
            <div className="text-[8px] font-mono text-tactical-text/40 uppercase tracking-wider">
              Monte Carlo Distribution · 2000 Simulated Paths
            </div>
            <div className="bg-tactical-bg/30 rounded-lg p-2 space-y-1">
              <MonteCarloBar label="P90" value={prediction.monteCarloStats.p90} currentPrice={analysis.currentPrice} color="#10b981" />
              <MonteCarloBar label="P75" value={prediction.monteCarloStats.p75} currentPrice={analysis.currentPrice} color="#34d399" />
              <MonteCarloBar label="Med" value={prediction.monteCarloStats.median} currentPrice={analysis.currentPrice} color="#00e5ff" />
              <MonteCarloBar label="Avg" value={prediction.monteCarloStats.mean} currentPrice={analysis.currentPrice} color="#a78bfa" />
              <MonteCarloBar label="P25" value={prediction.monteCarloStats.p25} currentPrice={analysis.currentPrice} color="#f59e0b" />
              <MonteCarloBar label="P10" value={prediction.monteCarloStats.p10} currentPrice={analysis.currentPrice} color="#ef4444" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-center">
                <div className="text-[7px] font-mono text-emerald-400/50 uppercase">Max Upside</div>
                <div className="text-[10px] font-mono font-bold text-emerald-400">
                  +{prediction.monteCarloStats.maxGain.toFixed(1)}%
                </div>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2 text-center">
                <div className="text-[7px] font-mono text-rose-400/50 uppercase">Max Downside</div>
                <div className="text-[10px] font-mono font-bold text-rose-400">
                  {prediction.monteCarloStats.maxLoss.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-[7px] font-mono text-tactical-text/25 leading-relaxed">
              Geometric Brownian Motion with jump diffusion (λ=0.02, jump vol=3σ).
              Parameters estimated from historical returns. Confidence bands:
              80% CI [{fmt(analysis.combinedForecast[analysis.combinedForecast.length - 1]?.lower80)}, {fmt(analysis.combinedForecast[analysis.combinedForecast.length - 1]?.upper80)}],
              95% CI [{fmt(analysis.combinedForecast[analysis.combinedForecast.length - 1]?.lower95)}, {fmt(analysis.combinedForecast[analysis.combinedForecast.length - 1]?.upper95)}]
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-tactical-border/10 flex items-center justify-between">
        <span className="text-[6px] font-mono text-tactical-text/20">
          Engines: Monte Carlo · Markov · ARIMA · Pattern · Indicator · Regime
        </span>
        <button onClick={runAnalysis} className="text-[7px] font-mono text-[#a78bfa]/40 hover:text-[#a78bfa] transition-colors">
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
