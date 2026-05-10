/**
 * AthenaMiniWidget.jsx — Compact inline prediction display for chart headers.
 * Shows up/down probability and consensus for next 3 in-game days.
 * Click to expand the full Athena report.
 */

import { useMemo } from 'react';
import { predict } from '../../lib/engines/predictionEngine';

const CONSENSUS_COLORS = {
  strong_buy:  { bg: 'bg-emerald-400/10', border: 'border-emerald-400/25', text: 'text-emerald-400', label: 'STRONG BUY' },
  buy:         { bg: 'bg-emerald-400/8',  border: 'border-emerald-400/15', text: 'text-emerald-400/70', label: 'BUY' },
  neutral:     { bg: 'bg-amber-400/8',    border: 'border-amber-400/15',   text: 'text-amber-400/70', label: 'NEUTRAL' },
  sell:        { bg: 'bg-rose-400/8',     border: 'border-rose-400/15',    text: 'text-rose-400/70', label: 'SELL' },
  strong_sell: { bg: 'bg-rose-400/10',    border: 'border-rose-400/25',    text: 'text-rose-400', label: 'STRONG SELL' },
};

export default function AthenaMiniWidget({ symbol, prices, onExpand }) {
  const prediction = useMemo(() => {
    if (!prices || prices.length < 10 || !symbol) return null;
    try {
      return predict(symbol, prices, '1d');
    } catch {
      return null;
    }
  }, [symbol, prices?.length]);

  if (!prediction) return null;

  // Sum up bullish vs bearish outcome probabilities
  const bullProb = prediction.outcomes
    .filter(o => o.percentChange > 0.5)
    .reduce((sum, o) => sum + o.probability, 0);
  const bearProb = prediction.outcomes
    .filter(o => o.percentChange < -0.5)
    .reduce((sum, o) => sum + o.probability, 0);
  const flatProb = Math.max(0, 1 - bullProb - bearProb);

  const style = CONSENSUS_COLORS[prediction.consensus] || CONSENSUS_COLORS.neutral;

  // Best outcome
  const best = prediction.outcomes[0];

  return (
    <button
      onClick={onExpand}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${style.border} ${style.bg} hover:brightness-125 transition-all cursor-pointer group`}
      title="Click for detailed Athena analysis"
    >
      {/* Athena icon */}
      <span className="text-[7px] font-mono text-purple-400/60 group-hover:text-purple-400 transition-colors">◈</span>

      {/* Up probability */}
      <span className="flex items-center gap-0.5">
        <span className="text-[7px] text-emerald-400/70">▲</span>
        <span className="text-[8px] font-mono text-emerald-400/80 tabular-nums">{(bullProb * 100).toFixed(0)}%</span>
      </span>

      {/* Divider */}
      <span className="text-tactical-text/10">│</span>

      {/* Down probability */}
      <span className="flex items-center gap-0.5">
        <span className="text-[7px] text-rose-400/70">▼</span>
        <span className="text-[8px] font-mono text-rose-400/80 tabular-nums">{(bearProb * 100).toFixed(0)}%</span>
      </span>

      {/* Divider */}
      <span className="text-tactical-text/10">│</span>

      {/* Consensus badge */}
      <span className={`text-[7px] font-mono font-semibold uppercase tracking-wider ${style.text}`}>
        {style.label}
      </span>
    </button>
  );
}
