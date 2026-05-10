import React from 'react';

/**
 * Shared play/pause/speed/commentary bar for all live match types.
 */
export default function MatchControls({
  isPlaying = false,
  isFinished = false,
  playbackSpeed = 1,
  timeLabel = '',
  commentary = [],       // last N commentary strings
  onTogglePlay,
  onSetSpeed,
  onSkipToEnd,
  onClose,
}) {
  return (
    <div className="bg-[#0A101D] border border-[#00e5ff]/20 rounded-lg overflow-hidden">
      {/* Controls row */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#00e5ff]/10">
        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          disabled={isFinished}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
            isFinished ? 'bg-white/5 text-white/20 cursor-not-allowed' :
            isPlaying ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 hover:bg-[#f59e0b]/30' :
            'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 hover:bg-[#00e5ff]/30'
          }`}
        >
          {isFinished ? '✓' : isPlaying ? '⏸' : '▶'}
        </button>

        {/* Speed controls */}
        <div className="flex gap-1">
          {[1, 2, 5].map(speed => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              className={`px-2 py-1 text-[9px] font-mono font-bold rounded transition-all ${
                playbackSpeed === speed
                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40'
                  : 'text-white/30 hover:text-white/60 border border-transparent'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Skip to end */}
        <button
          onClick={onSkipToEnd}
          disabled={isFinished}
          className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded transition-all ${
            isFinished ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          Skip ⏭
        </button>

        {/* Time label */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-white font-mono text-sm font-bold">{timeLabel}</span>
          {isFinished && (
            <span className="text-[9px] text-[#10b981] font-bold uppercase tracking-widest animate-pulse">
              Full Time
            </span>
          )}
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors text-sm ml-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Commentary feed */}
      <div className="px-4 py-2 max-h-[100px] overflow-y-auto custom-scrollbar space-y-1">
        {commentary.length === 0 && (
          <div className="text-[10px] text-white/20 italic">Waiting for kick-off...</div>
        )}
        {commentary.slice(-6).reverse().map((line, i) => (
          <div
            key={i}
            className={`text-[10px] font-mono transition-opacity duration-300 ${
              i === 0 ? 'text-white/90 font-bold' : 'text-white/40'
            }`}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
