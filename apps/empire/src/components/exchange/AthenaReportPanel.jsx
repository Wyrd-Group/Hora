/**
 * AthenaReportPanel.jsx — Detailed Athena AI financial analysis report.
 * Renders a collapsible panel with full prediction breakdown:
 * signal rationale, outcome probabilities, indicator confluence,
 * regime analysis, and Monte Carlo distribution.
 */

import { useMemo, useState } from 'react';
import { predict } from '../../lib/engines/predictionEngine';

const CONSENSUS_MAP = {
  strong_buy:  { color: '#10b981', label: 'STRONG BUY',  icon: '▲▲' },
  buy:         { color: '#34d399', label: 'BUY',          icon: '▲' },
  neutral:     { color: '#fbbf24', label: 'NEUTRAL',      icon: '—' },
  sell:        { color: '#f87171', label: 'SELL',          icon: '▼' },
  strong_sell: { color: '#ef4444', label: 'STRONG SELL',   icon: '▼▼' },
};

const REGIME_INFO = {
  bull:     { color: '#10b981', label: 'BULLISH',    desc: 'Sustained upward momentum with positive sentiment' },
  bear:     { color: '#f43f5e', label: 'BEARISH',    desc: 'Persistent selling pressure with negative outlook' },
  sideways: { color: '#fbbf24', label: 'SIDEWAYS',   desc: 'Range-bound consolidation phase' },
  volatile: { color: '#f97316', label: 'VOLATILE',   desc: 'High uncertainty with large swings in both directions' },
  breakout: { color: '#818cf8', label: 'BREAKOUT',   desc: 'Breaking out of established range — direction pending' },
};

function SignalBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[7px] font-mono text-tactical-text/30 w-12 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.abs(value) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[7px] font-mono tabular-nums w-8" style={{ color }}>{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function AthenaReportPanel({ symbol, prices, onClose }) {
  const [activeSection, setActiveSection] = useState('overview');

  const prediction = useMemo(() => {
    if (!prices || prices.length < 10 || !symbol) return null;
    try {
      return predict(symbol, prices, '1d');
    } catch {
      return null;
    }
  }, [symbol, prices?.length]);

  if (!prediction) {
    return (
      <div className="border-t border-tactical-border/10 bg-[#060a12]/95 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-mono text-purple-400/60 uppercase tracking-widest">◈ Athena Analysis</span>
          {onClose && <button onClick={onClose} aria-label="Close Athena analysis" className="text-[8px] font-mono text-tactical-text/20 hover:text-tactical-text/40">✕</button>}
        </div>
        <p className="text-[8px] font-mono text-tactical-text/25">Insufficient data — need 10+ price points for analysis.</p>
      </div>
    );
  }

  const consensus = CONSENSUS_MAP[prediction.consensus];
  const regime = REGIME_INFO[prediction.regime] || REGIME_INFO.sideways;

  // Calculate aggregate probabilities
  const bullProb = prediction.outcomes.filter(o => o.percentChange > 0.5).reduce((s, o) => s + o.probability, 0);
  const bearProb = prediction.outcomes.filter(o => o.percentChange < -0.5).reduce((s, o) => s + o.probability, 0);

  const sections = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'outcomes', label: 'OUTCOMES' },
    { id: 'indicators', label: 'INDICATORS' },
    { id: 'regime', label: 'REGIME' },
    { id: 'montecarlo', label: 'MONTE CARLO' },
  ];

  return (
    <div className="border-t border-purple-400/15 bg-[#060a12]/95 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tactical-border/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-purple-400/70 uppercase tracking-widest">◈ Athena Intelligence Report</span>
          <span className="text-[7px] font-mono uppercase px-1.5 py-0.5 rounded border" style={{ color: consensus.color, borderColor: consensus.color + '30' }}>
            {consensus.icon} {consensus.label}
          </span>
        </div>
        {onClose && <button onClick={onClose} aria-label="Close Athena report" className="text-[9px] font-mono text-tactical-text/20 hover:text-rose-400/60 transition-colors px-1">✕</button>}
      </div>

      {/* Section tabs */}
      <div className="flex gap-0.5 px-4 py-1 border-b border-tactical-border/5 shrink-0">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`text-[7px] font-mono uppercase tracking-widest px-2 py-0.5 rounded transition-colors ${
              activeSection === s.id
                ? 'bg-purple-400/10 text-purple-400/80 border border-purple-400/20'
                : 'text-tactical-text/20 hover:text-tactical-text/35 border border-transparent'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content — scrollable */}
      <div className="px-4 py-2 space-y-2">

        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <>
            {/* Signal summary */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/[0.02] rounded px-2 py-1.5 border border-tactical-border/8">
                <div className="text-[6px] font-mono text-tactical-text/20 uppercase mb-0.5">Consensus</div>
                <div className="text-[10px] font-mono font-semibold" style={{ color: consensus.color }}>{consensus.label}</div>
              </div>
              <div className="bg-white/[0.02] rounded px-2 py-1.5 border border-tactical-border/8">
                <div className="text-[6px] font-mono text-tactical-text/20 uppercase mb-0.5">Regime</div>
                <div className="text-[10px] font-mono font-semibold" style={{ color: regime.color }}>{regime.label}</div>
              </div>
              <div className="bg-white/[0.02] rounded px-2 py-1.5 border border-tactical-border/8">
                <div className="text-[6px] font-mono text-tactical-text/20 uppercase mb-0.5">Bullish</div>
                <div className="text-[10px] font-mono font-semibold text-emerald-400 tabular-nums">{(bullProb * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-white/[0.02] rounded px-2 py-1.5 border border-tactical-border/8">
                <div className="text-[6px] font-mono text-tactical-text/20 uppercase mb-0.5">Bearish</div>
                <div className="text-[10px] font-mono font-semibold text-rose-400 tabular-nums">{(bearProb * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Rationale */}
            <div className="bg-white/[0.015] rounded border border-tactical-border/8 px-3 py-2">
              <div className="text-[6px] font-mono text-purple-400/40 uppercase mb-1">Athena Signal Rationale</div>
              <div className="space-y-1">
                {prediction.outcomes.slice(0, 2).map((o, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className={`text-[7px] mt-0.5 ${o.percentChange >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                      {o.percentChange >= 0 ? '▲' : '▼'}
                    </span>
                    <div>
                      <span className="text-[8px] font-mono text-tactical-text/50">{o.label}</span>
                      <span className="text-[7px] font-mono text-tactical-text/25 ml-1.5 tabular-nums">
                        ({(o.probability * 100).toFixed(0)}% → ${o.priceTarget.toFixed(2)})
                      </span>
                      {o.reasoning.length > 0 && (
                        <p className="text-[7px] font-mono text-tactical-text/20 mt-0.5">{o.reasoning[0]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patterns detected */}
            {prediction.patterns.length > 0 && (
              <div className="bg-white/[0.015] rounded border border-tactical-border/8 px-3 py-2">
                <div className="text-[6px] font-mono text-purple-400/40 uppercase mb-1">Patterns Detected</div>
                <div className="flex flex-wrap gap-1">
                  {prediction.patterns.map((p, i) => (
                    <span key={i} className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${
                      p.direction === 'bullish' ? 'border-emerald-400/15 text-emerald-400/60' :
                      p.direction === 'bearish' ? 'border-rose-400/15 text-rose-400/60' :
                      'border-amber-400/15 text-amber-400/60'
                    }`}>
                      {p.pattern} ({(p.strength * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Volatility */}
            <div className="flex items-center gap-3 text-[7px] font-mono text-tactical-text/25">
              <span>Ann. Volatility: <span className="text-tactical-text/40 tabular-nums">{(prediction.volatilityEstimate * 100).toFixed(1)}%</span></span>
              <span>Regime Confidence: <span className="text-tactical-text/40 tabular-nums">{(prediction.regimeConfidence * 100).toFixed(0)}%</span></span>
              <span>Score: <span className="tabular-nums" style={{ color: consensus.color }}>{prediction.consensusScore.toFixed(2)}</span></span>
            </div>
          </>
        )}

        {/* OUTCOMES */}
        {activeSection === 'outcomes' && (
          <div className="space-y-1.5">
            <div className="text-[6px] font-mono text-purple-400/40 uppercase">Probability Distribution — Next Session</div>
            {prediction.outcomes.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-tactical-text/30 w-24 shrink-0 truncate">{o.label}</span>
                <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${o.probability * 100}%`,
                      backgroundColor: o.percentChange > 0.5 ? '#10b981' : o.percentChange < -0.5 ? '#f43f5e' : '#fbbf24',
                    }}
                  />
                  <span className="absolute inset-0 flex items-center pl-1 text-[6px] font-mono text-white/40 tabular-nums">
                    {(o.probability * 100).toFixed(1)}%
                  </span>
                </div>
                <span className={`text-[7px] font-mono w-14 text-right tabular-nums shrink-0 ${
                  o.percentChange >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'
                }`}>
                  {o.percentChange >= 0 ? '+' : ''}{o.percentChange.toFixed(1)}%
                </span>
                <span className="text-[7px] font-mono text-tactical-text/25 w-16 text-right tabular-nums shrink-0">
                  ${o.priceTarget.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* INDICATORS */}
        {activeSection === 'indicators' && (
          <div className="space-y-1.5">
            <div className="text-[6px] font-mono text-purple-400/40 uppercase">Technical Indicator Confluence</div>
            {prediction.indicators.map((ind, i) => {
              const color = ind.signal === 'buy' ? '#10b981' : ind.signal === 'sell' ? '#f43f5e' : '#fbbf24';
              return (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <span className="text-[7px] font-mono text-tactical-text/35 w-20 shrink-0">{ind.name}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${ind.strength * 100}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-[7px] font-mono uppercase w-10 text-center shrink-0" style={{ color }}>
                    {ind.signal}
                  </span>
                  <span className="text-[7px] font-mono text-tactical-text/20 w-14 text-right tabular-nums shrink-0">
                    {ind.value.toFixed(2)}
                  </span>
                </div>
              );
            })}

            {/* Signal distribution */}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-tactical-border/5">
              <span className="text-[7px] font-mono text-tactical-text/20">Signal Distribution:</span>
              {['buy', 'neutral', 'sell'].map(sig => {
                const count = prediction.indicators.filter(i => i.signal === sig).length;
                const color = sig === 'buy' ? 'text-emerald-400/60' : sig === 'sell' ? 'text-rose-400/60' : 'text-amber-400/60';
                return (
                  <span key={sig} className={`text-[8px] font-mono tabular-nums ${color}`}>
                    {count} {sig.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* REGIME */}
        {activeSection === 'regime' && (
          <div className="space-y-2">
            <div className="text-[6px] font-mono text-purple-400/40 uppercase">Markov Chain Regime Analysis</div>
            {/* Current regime */}
            <div className="bg-white/[0.02] rounded border px-3 py-2" style={{ borderColor: regime.color + '20' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-mono font-semibold" style={{ color: regime.color }}>{regime.label}</span>
                <span className="text-[7px] font-mono text-tactical-text/20 tabular-nums">
                  ({(prediction.regimeConfidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
              <p className="text-[7px] font-mono text-tactical-text/30">{regime.desc}</p>
            </div>

            {/* Regime characteristics */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white/[0.015] rounded px-2 py-1.5 border border-tactical-border/5">
                <div className="text-[6px] font-mono text-tactical-text/15 uppercase">Volatility</div>
                <div className="text-[9px] font-mono text-tactical-text/50 tabular-nums">{(prediction.volatilityEstimate * 100).toFixed(1)}% ann.</div>
              </div>
              <div className="bg-white/[0.015] rounded px-2 py-1.5 border border-tactical-border/5">
                <div className="text-[6px] font-mono text-tactical-text/15 uppercase">Trend Score</div>
                <div className="text-[9px] font-mono tabular-nums" style={{ color: consensus.color }}>{prediction.consensusScore > 0 ? '+' : ''}{prediction.consensusScore.toFixed(3)}</div>
              </div>
            </div>
          </div>
        )}

        {/* MONTE CARLO */}
        {activeSection === 'montecarlo' && (
          <div className="space-y-2">
            <div className="text-[6px] font-mono text-purple-400/40 uppercase">Monte Carlo Simulation (2,000 paths)</div>
            {/* Percentile distribution */}
            <div className="space-y-1">
              {[
                { label: 'P90 (Best case)', value: prediction.monteCarloStats.p90, pct: ((prediction.monteCarloStats.p90 - prediction.currentPrice) / prediction.currentPrice * 100) },
                { label: 'P75', value: prediction.monteCarloStats.p75, pct: ((prediction.monteCarloStats.p75 - prediction.currentPrice) / prediction.currentPrice * 100) },
                { label: 'Median', value: prediction.monteCarloStats.median, pct: ((prediction.monteCarloStats.median - prediction.currentPrice) / prediction.currentPrice * 100) },
                { label: 'Mean', value: prediction.monteCarloStats.mean, pct: ((prediction.monteCarloStats.mean - prediction.currentPrice) / prediction.currentPrice * 100) },
                { label: 'P25', value: prediction.monteCarloStats.p25, pct: ((prediction.monteCarloStats.p25 - prediction.currentPrice) / prediction.currentPrice * 100) },
                { label: 'P10 (Worst case)', value: prediction.monteCarloStats.p10, pct: ((prediction.monteCarloStats.p10 - prediction.currentPrice) / prediction.currentPrice * 100) },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[7px] font-mono text-tactical-text/25 w-24 shrink-0">{row.label}</span>
                  <span className="text-[8px] font-mono text-tactical-text/50 tabular-nums w-16 text-right shrink-0">${row.value.toFixed(2)}</span>
                  <span className={`text-[7px] font-mono tabular-nums w-12 text-right shrink-0 ${row.pct >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                    {row.pct >= 0 ? '+' : ''}{row.pct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Max gain/loss */}
            <div className="flex gap-3 pt-1 border-t border-tactical-border/5">
              <span className="text-[7px] font-mono text-tactical-text/20">
                Max Gain: <span className="text-emerald-400/50 tabular-nums">${prediction.monteCarloStats.maxGain.toFixed(2)}</span>
              </span>
              <span className="text-[7px] font-mono text-tactical-text/20">
                Max Loss: <span className="text-rose-400/50 tabular-nums">${prediction.monteCarloStats.maxLoss.toFixed(2)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
