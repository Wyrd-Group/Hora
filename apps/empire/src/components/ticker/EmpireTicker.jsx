import React from 'react';
import { useEmpireStore } from '../../store/empireStore';

const TICKER_COL = {
  fx: "text-[#00e5ff]",
  crypto: "text-[#7c3aed]",
  commodity: "text-[#f59e0b]",
  intel: "text-[#10b981]",
  alert: "text-[#ef4444]",
  crime: "text-[#f59e0b]",
  board: "text-[#a78bfa]"
};

const EmpireTicker = () => {
  const events = useEmpireStore((s) => s.ticker);

  // Duplicating events to create a seamless scroll
  const scrollItems = [...events, ...events];

  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 bg-tactical-bg/95 border-t border-tactical-border/50 backdrop-blur z-10 overflow-hidden flex items-center">
      <div className="flex gap-10 whitespace-nowrap animate-ticker-scroll" style={{ paddingLeft: '100%' }}>
        {scrollItems.map((event, i) => (
          <span
            key={`${event.id}-${i}`}
            className={`font-mono text-[10px] tracking-widest ${TICKER_COL[event.type] || 'text-tactical-text/60'}`}
          >
            {event.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default EmpireTicker;
