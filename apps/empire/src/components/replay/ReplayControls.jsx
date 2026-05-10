/**
 * ReplayControls.jsx -- Playback controls bar for Market Replay.
 * Play/Pause, speed selector, tick scrubber, and scenario completion.
 */

import { useCallback } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { getScenarioById } from '../../data/replayScenarios';

// ── Speed options ──────────────────────────────────────────────────

const SPEEDS = [1, 2, 5, 10];

export default function ReplayControls({ onComplete }) {
  const activeScenarioId = useReplayStore((s) => s.activeScenarioId);
  const currentTick = useReplayStore((s) => s.currentTick);
  const isPlaying = useReplayStore((s) => s.isPlaying);
  const playbackSpeed = useReplayStore((s) => s.playbackSpeed);
  const play = useReplayStore((s) => s.play);
  const pause = useReplayStore((s) => s.pause);
  const setSpeed = useReplayStore((s) => s.setSpeed);
  const seekToTick = useReplayStore((s) => s.seekToTick);
  const completeScenario = useReplayStore((s) => s.completeScenario);
  const resetScenario = useReplayStore((s) => s.resetScenario);
  const getReturnPct = useReplayStore((s) => s.getReturnPct);
  const getPortfolioValue = useReplayStore((s) => s.getPortfolioValue);

  const scenario = activeScenarioId ? getScenarioById(activeScenarioId) : null;
  const duration = scenario?.duration ?? 1;
  const isAtEnd = currentTick >= duration - 1;
  const returnPct = getReturnPct();
  const portfolioValue = getPortfolioValue();

  const handlePlayPause = useCallback(() => {
    if (isAtEnd) return;
    if (isPlaying) pause();
    else play();
  }, [isPlaying, isAtEnd, play, pause]);

  const handleScrub = useCallback((e) => {
    const tick = parseInt(e.target.value, 10);
    seekToTick(tick);
  }, [seekToTick]);

  const handleComplete = useCallback(() => {
    const result = completeScenario();
    // Could show a results modal here in the future
  }, [completeScenario]);

  const handleEndAndExit = useCallback(() => {
    completeScenario();
    resetScenario();
    if (onComplete) onComplete();
  }, [completeScenario, resetScenario, onComplete]);

  if (!scenario) return null;

  return (
    <div className="border-t border-tactical-border/20 bg-[#060a12]/90 px-4 py-2">
      {/* Scrubber */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[9px] font-mono text-tactical-text/30 tabular-nums w-8 text-right">
          {currentTick}
        </span>
        <input
          type="range"
          min={0}
          max={duration - 1}
          value={currentTick}
          onChange={handleScrub}
          className="flex-1 h-1 bg-tactical-border/20 rounded-full appearance-none cursor-pointer accent-[#00e5ff]
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00e5ff]
            [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#00e5ff] [&::-moz-range-thumb]:border-0"
        />
        <span className="text-[9px] font-mono text-tactical-text/30 tabular-nums w-8">
          {duration - 1}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Left: Play + Speed */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            disabled={isAtEnd}
            className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded border transition-colors ${
              isAtEnd
                ? 'border-tactical-border/10 text-tactical-text/15 cursor-not-allowed'
                : isPlaying
                  ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                  : 'border-[#00e5ff]/30 text-[#00e5ff] hover:bg-[#00e5ff]/10'
            }`}
          >
            {isAtEnd ? 'ended' : isPlaying ? 'pause' : 'play'}
          </button>

          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                  playbackSpeed === s
                    ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/20'
                    : 'text-tactical-text/25 hover:text-tactical-text/40'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: Portfolio info */}
        <div className="flex items-center gap-4 text-[9px] font-mono">
          <span className="text-tactical-text/40">
            Portfolio: <span className="text-tactical-text/70 tabular-nums">${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </span>
          <span className={`tabular-nums ${returnPct >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
            {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
          </span>
        </div>

        {/* Right: End scenario */}
        <button
          onClick={handleEndAndExit}
          className="text-[9px] font-mono uppercase tracking-widest px-3 py-1 rounded border border-rose-500/20 text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
        >
          end scenario
        </button>
      </div>
    </div>
  );
}
