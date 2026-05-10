import React from 'react';

/**
 * IndicatorToggle — Compact toggle bar for enabling/disabling chart indicators.
 *
 * Props:
 *   indicators: { sma: boolean, ema: boolean, bb: boolean, rsi: boolean, macd: boolean }
 *   onToggle: (key: string) => void
 */
const INDICATOR_DEFS = [
  { key: 'sma',  label: 'SMA',  color: '#facc15' },
  { key: 'ema',  label: 'EMA',  color: '#ec4899' },
  { key: 'bb',   label: 'BB',   color: '#6366f1' },
  { key: 'rsi',  label: 'RSI',  color: '#f59e0b' },
  { key: 'macd', label: 'MACD', color: '#10b981' },
];

const IndicatorToggle = ({
  indicators = { sma: false, ema: false, bb: false, rsi: false, macd: false },
  onToggle = () => {},
}) => {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1">
      <span className="text-[9px] font-mono text-tactical-text/40 uppercase tracking-widest mr-1">
        Indicators
      </span>
      {INDICATOR_DEFS.map(({ key, label, color }) => {
        const active = indicators[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`
              px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wide
              border transition-all duration-150 cursor-pointer
              ${active
                ? 'border-[#00e5ff]/40 text-[#00e5ff] shadow-[0_0_6px_rgba(0,229,255,0.25)]'
                : 'border-tactical-border/30 text-tactical-text/40 hover:text-tactical-text/60 hover:border-tactical-border/50'
              }
            `}
            style={active ? {
              backgroundColor: `${color}15`,
              borderColor: `${color}60`,
              color: color,
              boxShadow: `0 0 8px ${color}30`,
            } : {}}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default IndicatorToggle;
