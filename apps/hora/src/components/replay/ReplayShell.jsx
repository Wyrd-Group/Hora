/**
 * ReplayShell.jsx -- Full-screen Market Replay view.
 * Shows scenario picker when no active scenario, or the active replay session
 * with 500 instruments, info panel, and news feed.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { REPLAY_SCENARIOS, getScenarioById } from '../../data/replayScenarios';
import ReplayChart from './ReplayChart';
import ReplayControls from './ReplayControls';
import ReplayTradePanel from './ReplayTradePanel';
import InstrumentInfo from './InstrumentInfo';
import ReplayNewsFeed from './ReplayNewsFeed';
import MissionTracker from '../missions/MissionTracker';

// ── Difficulty badge colors ────────────────────────────────────────

const DIFF_COLORS = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

// ── Star display ───────────────────────────────────────────────────

function Stars({ count, max = 3 }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? 'text-amber-400' : 'text-white/10'}>
          *
        </span>
      ))}
    </span>
  );
}

// ── Scenario Card ──────────────────────────────────────────────────

function ScenarioCard({ scenario, completedData, onStart }) {
  const best = completedData ?? null;

  return (
    <button
      onClick={() => onStart(scenario.id)}
      className="group text-left w-full border border-tactical-border/40 bg-[#0a0f1a]/80 hover:bg-[#0d1420] hover:border-[#00e5ff]/20 rounded transition-all p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[11px] font-mono font-semibold text-tactical-text tracking-wide truncate group-hover:text-[#00e5ff] transition-colors">
            {scenario.title}
          </h3>
          <p className="text-[9px] font-mono text-tactical-text/40 tracking-widest uppercase mt-0.5">
            {scenario.year}
          </p>
        </div>
        <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${DIFF_COLORS[scenario.difficulty]}`}>
          {scenario.difficulty}
        </span>
      </div>

      {/* Description */}
      <p className="text-[10px] font-mono text-tactical-text/50 leading-relaxed mb-3 line-clamp-2">
        {scenario.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[9px] font-mono text-tactical-text/30">
          <span>{scenario.duration} ticks</span>
          <span>{scenario.instruments.map((i) => i.toUpperCase()).join(', ')}</span>
        </div>
        {best ? (
          <div className="flex items-center gap-2">
            <Stars count={best.stars} />
            <span className={`text-[9px] font-mono ${best.returnPct >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
              {best.returnPct >= 0 ? '+' : ''}{best.returnPct.toFixed(1)}%
            </span>
          </div>
        ) : (
          <span className="text-[8px] font-mono text-tactical-text/20 uppercase tracking-widest">
            new
          </span>
        )}
      </div>
    </button>
  );
}

// ── Scenario Picker Grid ───────────────────────────────────────────

function ScenarioPicker({ onStart }) {
  const completedScenarios = useReplayStore((s) => s.completedScenarios);

  const groups = [
    { label: 'BEGINNER', scenarios: REPLAY_SCENARIOS.filter((s) => s.difficulty === 'beginner') },
    { label: 'INTERMEDIATE', scenarios: REPLAY_SCENARIOS.filter((s) => s.difficulty === 'intermediate') },
    { label: 'ADVANCED', scenarios: REPLAY_SCENARIOS.filter((s) => s.difficulty === 'advanced') },
  ];

  const totalStars = Object.values(completedScenarios).reduce((s, c) => s + c.stars, 0);
  const totalCompleted = Object.keys(completedScenarios).length;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#00e5ff]/80">
            Market Replay
          </h1>
          <div className="flex items-center gap-4 text-[9px] font-mono text-tactical-text/40">
            <span>{totalCompleted}/{REPLAY_SCENARIOS.length} completed</span>
            <span><Stars count={totalStars} max={totalStars} /> {totalStars} stars</span>
          </div>
        </div>
        <p className="text-[10px] font-mono text-tactical-text/30 max-w-xl">
          Relive famous market events tick-by-tick. Trade any of 500+ instruments during the replay, earn stars, and learn from history.
        </p>
      </div>

      {/* Groups */}
      {groups.map((group) => (
        <div key={group.label} className="max-w-5xl mx-auto mb-8">
          <h2 className="text-[9px] font-mono uppercase tracking-[0.2em] text-tactical-text/25 mb-3 border-b border-tactical-border/20 pb-1">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                completedData={completedScenarios[scenario.id]}
                onStart={onStart}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Active Replay Session ──────────────────────────────────────────

function ActiveReplay({ onExit }) {
  const activeScenarioId = useReplayStore((s) => s.activeScenarioId);
  const isPlaying = useReplayStore((s) => s.isPlaying);
  const playbackSpeed = useReplayStore((s) => s.playbackSpeed);
  const advanceTick = useReplayStore((s) => s.advanceTick);
  const currentTick = useReplayStore((s) => s.currentTick);

  const scenario = getScenarioById(activeScenarioId);
  const intervalRef = useRef(null);

  // Shared selected instrument state
  const [selectedInstrument, setSelectedInstrument] = useState(
    scenario?.instruments[0] ?? 'aapl'
  );

  // Reset instrument when scenario changes
  useEffect(() => {
    if (scenario) {
      setSelectedInstrument(scenario.instruments[0] ?? 'aapl');
    }
  }, [scenario?.id]);

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

  if (!scenario) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-tactical-border/20 bg-[#060a12]/90">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="text-[9px] font-mono text-tactical-text/40 hover:text-[#00e5ff] transition-colors uppercase tracking-widest"
          >
            [exit]
          </button>
          <span className="text-[10px] font-mono text-tactical-text/70 font-semibold">
            {scenario.title}
          </span>
          <span className="text-[8px] font-mono text-tactical-text/30">
            {scenario.year}
          </span>
        </div>
        <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${DIFF_COLORS[scenario.difficulty]}`}>
          {scenario.difficulty}
        </span>
      </div>

      {/* Main content — scrollable on mobile, side-by-side on desktop */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
        {/* Left: Chart + Info + News */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Chart (fixed min height so it doesn't compress) */}
          <div className="flex-1 min-h-[250px] flex flex-col overflow-hidden">
            <ReplayChart
              selectedInstrument={selectedInstrument}
              onSelectInstrument={setSelectedInstrument}
            />
          </div>

          {/* Controls */}
          <ReplayControls onComplete={onExit} />

          {/* Info panel */}
          <InstrumentInfo instrumentId={selectedInstrument} />

          {/* News feed */}
          <ReplayNewsFeed />
        </div>

        {/* Right sidebar: Trade + Missions */}
        <div className="w-full flex-shrink-0 lg:w-80 border-t lg:border-t-0 lg:border-l border-tactical-border/20 flex flex-col lg:overflow-hidden">
          <ReplayTradePanel
            selectedInstrument={selectedInstrument}
            onSelectInstrument={setSelectedInstrument}
          />
          <div className="border-t border-tactical-border/20">
            <MissionTracker context="replay" compact />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Shell ─────────────────────────────────────────────────────

export default function ReplayShell({ onExit }) {
  const activeScenarioId = useReplayStore((s) => s.activeScenarioId);
  const loadScenario = useReplayStore((s) => s.loadScenario);
  const resetScenario = useReplayStore((s) => s.resetScenario);

  const handleStart = useCallback((id) => {
    loadScenario(id);
  }, [loadScenario]);

  const handleExitScenario = useCallback(() => {
    resetScenario();
  }, [resetScenario]);

  const handleExitShell = useCallback(() => {
    resetScenario();
    onExit?.();
  }, [resetScenario, onExit]);

  return (
    <div className="fixed inset-0 z-20 bg-[#060a12] flex flex-col">
      {/* Back button to parent (LabOS) when on scenario picker */}
      {!activeScenarioId && onExit && (
        <div className="flex items-center px-4 py-2 border-b border-tactical-border/20 bg-[#060a12]/90">
          <button
            onClick={handleExitShell}
            className="text-[9px] font-mono text-tactical-text/40 hover:text-[#00e5ff] transition-colors uppercase tracking-widest"
          >
            [back to lab]
          </button>
        </div>
      )}
      {activeScenarioId ? (
        <ActiveReplay onExit={handleExitScenario} />
      ) : (
        <ScenarioPicker onStart={handleStart} />
      )}
    </div>
  );
}
