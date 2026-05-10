/**
 * LiveExchangeShell.jsx -- Full exchange terminal connected to live multiplayer market.
 * Same UI as the simulation terminal (chart, indicators, trade panel with limit orders,
 * options, leverage, company info, news feed) but without replay controls (play/pause/scrubber).
 * Prices auto-advance continuously via the free-sim scenario.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { getScenarioById } from '../../data/replayScenarios';
import { getCachedReplayPrices } from '../../lib/replayPriceGenerator';
import ReplayChart from '../replay/ReplayChart';
import ReplayTradePanel from '../replay/ReplayTradePanel';
import InstrumentInfo from '../replay/InstrumentInfo';
import ReplayNewsFeed from '../replay/ReplayNewsFeed';
import AthenaReportPanel from './AthenaReportPanel';

const FREE_SIM_ID = '__free_sim__';

export default function LiveExchangeShell({ onExit }) {
  const activeScenarioId = useReplayStore(s => s.activeScenarioId);
  const isPlaying = useReplayStore(s => s.isPlaying);
  const playbackSpeed = useReplayStore(s => s.playbackSpeed);
  const advanceTick = useReplayStore(s => s.advanceTick);
  const currentTick = useReplayStore(s => s.currentTick);
  const loadScenario = useReplayStore(s => s.loadScenario);

  const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;
  const intervalRef = useRef(null);

  const [selectedInstrument, setSelectedInstrument] = useState('aapl');

  const fullPriceSlice = useMemo(() => {
    if (!scenario || !selectedInstrument) return [];
    const allPrices = getCachedReplayPrices(scenario, currentTick + 2);
    const full = allPrices[selectedInstrument] ?? [];
    return full.slice(0, currentTick + 1);
  }, [scenario, selectedInstrument, currentTick]);

  // Auto-load free sim on mount
  useEffect(() => {
    if (activeScenarioId !== FREE_SIM_ID) {
      loadScenario(FREE_SIM_ID);
    }
  }, []);

  // Auto-play on load — resume regardless of current tick (market never pauses)
  useEffect(() => {
    if (activeScenarioId === FREE_SIM_ID && !isPlaying) {
      useReplayStore.getState().play();
    }
  }, [activeScenarioId]);

  // Campaign time system: 1 real second = 5 in-game seconds
  // Each tick fires every 5 real seconds for a realistic trading pace
  const CAMPAIGN_TICK_MS = 5000;

  // Playback tick loop — continuous at campaign pace, no user speed controls
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      advanceTick();
    }, CAMPAIGN_TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, advanceTick]);

  // Live market never pauses — no auto-stop at scenario end

  // Exit without resetting — the live market persists across navigations
  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  if (!scenario) return null;

  return (
    <div className="fixed inset-0 z-20 bg-[#060a12] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tactical-border/20 bg-[#060a12]/90">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="text-[9px] font-mono text-tactical-text/40 hover:text-[#00e5ff] transition-colors uppercase tracking-widest"
          >
            [exit]
          </button>
          <span className="text-[10px] font-mono text-[#00e5ff]/80 font-semibold uppercase tracking-wider">
            Exchange Terminal
          </span>
          <span className="flex items-center gap-1 text-[7px] font-mono text-emerald-400/70 border border-emerald-400/20 bg-emerald-400/5 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE MARKET
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[7px] font-mono text-tactical-text/25 border border-tactical-border/15 px-1.5 py-0.5 rounded" title="1 real second = 5 in-game seconds">
            1s = 5s · tick/{CAMPAIGN_TICK_MS / 1000}s
          </span>
          <span className="text-[8px] font-mono text-emerald-400/60 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
            {isPlaying ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* Main content — single scrollable page, all sections fully expanded */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Chart */}
        <div className="min-h-[300px] h-[45vh] flex flex-col shrink-0">
          <ReplayChart
            selectedInstrument={selectedInstrument}
            onSelectInstrument={setSelectedInstrument}
          />
        </div>

        {/* Trade panel — fully expanded inline */}
        <div className="border-t border-tactical-border/20">
          <ReplayTradePanel
            selectedInstrument={selectedInstrument}
            onSelectInstrument={setSelectedInstrument}
          />
        </div>

        {/* Info panel */}
        <InstrumentInfo instrumentId={selectedInstrument} />

        {/* Athena Intelligence Report — always expanded */}
        <AthenaReportPanel
          symbol={selectedInstrument}
          prices={fullPriceSlice}
        />

        {/* News feed */}
        <ReplayNewsFeed />
      </div>
    </div>
  );
}
