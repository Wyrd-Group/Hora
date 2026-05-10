/**
 * MarketIndexBar.jsx — Horizontal scrolling market index ticker,
 * similar to Yahoo Finance's market summary strip.
 */

import { useMarketWireStore } from '../../store/marketWireStore';

function MiniSparkline({ data, color, width = 60, height = 20 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
      />
    </svg>
  );
}

export default function MarketIndexBar() {
  const indices = useMarketWireStore(s => s.indices);

  if (indices.length === 0) return null;

  return (
    <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1.5 -mx-1 px-1">
      {indices.map((idx) => {
        const isUp = idx.changePercent >= 0;
        const color = isUp ? '#10b981' : '#ef4444';

        return (
          <div key={idx.id} className="flex items-center gap-2 flex-shrink-0 group">
            <div className="flex flex-col">
              <span className="text-[7px] text-tactical-text/40 font-mono tracking-[0.1em] uppercase">{idx.symbol}</span>
              <span className="text-[11px] text-tactical-text/80 font-mono font-semibold tabular-nums">
                {idx.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <MiniSparkline data={idx.history} color={color} />
            <div className="flex flex-col items-end">
              <span className={`text-[8px] font-mono tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
              </span>
              <span className={`text-[7px] font-mono tabular-nums ${isUp ? 'text-emerald-400/50' : 'text-rose-400/50'}`}>
                {isUp ? '+' : ''}{idx.change.toFixed(2)}
              </span>
            </div>
            {/* Separator */}
            <span className="text-white/[0.06] text-[10px] ml-1">|</span>
          </div>
        );
      })}
    </div>
  );
}
