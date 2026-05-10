/**
 * SimulationShell.jsx -- Full exchange terminal for offline/sim trading.
 * Wraps the replay infrastructure (chart, indicators, trade panel, limit orders,
 * options, leveraged positions) in a free-simulation mode with $100K starting balance.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { getScenarioById } from '../../data/replayScenarios';
import { getCachedReplayPrices } from '../../lib/replayPriceGenerator';
import ReplayChart from '../replay/ReplayChart';
import ReplayControls from '../replay/ReplayControls';
import ReplayTradePanel from '../replay/ReplayTradePanel';
import InstrumentInfo from '../replay/InstrumentInfo';
import ReplayNewsFeed from '../replay/ReplayNewsFeed';
import AthenaReportPanel from '../exchange/AthenaReportPanel';

const FREE_SIM_ID = '__free_sim__';

export default function SimulationShell({ onExit }) {
  const activeScenarioId = useReplayStore(s => s.activeScenarioId);
  const isPlaying = useReplayStore(s => s.isPlaying);
  const playbackSpeed = useReplayStore(s => s.playbackSpeed);
  const advanceTick = useReplayStore(s => s.advanceTick);
  const currentTick = useReplayStore(s => s.currentTick);
  const loadScenario = useReplayStore(s => s.loadScenario);
  const resetScenario = useReplayStore(s => s.resetScenario);

  const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;
  const intervalRef = useRef(null);

  const [selectedInstrument, setSelectedInstrument] = useState('aapl');
  const [showAthenaReport, setShowAthenaReport] = useState(false);

  // Compute prices for the selected instrument (for Athena report)
  const fullPriceSlice = useMemo(() => {
    if (!scenario || !selectedInstrument) return [];
    const allPrices = getCachedReplayPrices(scenario);
    const full = allPrices[selectedInstrument] ?? [];
    return full.slice(0, currentTick + 1);
  }, [scenario, selectedInstrument, currentTick]);

  // Auto-load free sim on mount
  useEffect(() => {
    if (activeScenarioId !== FREE_SIM_ID) {
      loadScenario(FREE_SIM_ID);
    }
  }, []);

  // Auto-play on load
  useEffect(() => {
    if (activeScenarioId === FREE_SIM_ID && !isPlaying && currentTick === 0) {
      useReplayStore.getState().play();
    }
  }, [activeScenarioId]);

  // Playback tick loop
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const ms = Math.max(20, 400 / playbackSpeed);
    intervalRef.current = setInterval(() => {
      advanceTick();
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, advanceTick]);

  // Auto-pause at end
  useEffect(() => {
    if (scenario && currentTick >= scenario.duration - 1) {
      useReplayStore.getState().pause();
    }
  }, [currentTick, scenario]);

  const handleExit = useCallback(() => {
    resetScenario();
    onExit?.();
  }, [resetScenario, onExit]);

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
          <span className="text-[7px] font-mono text-tactical-text/20 uppercase tracking-widest border border-tactical-border/15 px-1.5 py-0.5 rounded">
            Simulation
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[8px] font-mono text-emerald-400/60 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
            {isPlaying ? 'LIVE' : 'PAUSED'}
          </span>
          <span className="text-[8px] font-mono text-tactical-text/30">
            ${(100000).toLocaleString()} starting
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
            onToggleReport={() => setShowAthenaReport(v => !v)}
          />
        </div>

        {/* Controls */}
        <ReplayControls onComplete={handleExit} />

        {/* Trade panel — fully expanded inline */}
        <div className="border-t border-tactical-border/20">
          <ReplayTradePanel
            selectedInstrument={selectedInstrument}
            onSelectInstrument={setSelectedInstrument}
          />
        </div>

        {/* Info panel */}
        <InstrumentInfo instrumentId={selectedInstrument} />

        {/* Athena Intelligence Report */}
        {showAthenaReport && (
          <AthenaReportPanel
            symbol={selectedInstrument}
            prices={fullPriceSlice}
            onClose={() => setShowAthenaReport(false)}
          />
        )}

        {/* News feed */}
        <ReplayNewsFeed />
      </div>
    </div>
  );
}
