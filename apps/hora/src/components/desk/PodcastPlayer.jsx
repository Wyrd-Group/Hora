import { useState, useCallback } from 'react';
import { useDeskStore } from '../../store/deskStore';

/**
 * PodcastPlayer -- Simple podcast dialogue reader with play/pause and listened tracking.
 */
export default function PodcastPlayer({ podcast, onClose }) {
  const { listenedPodcasts, markPodcastListened } = useDeskStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const isListened = listenedPodcasts.includes(podcast.id);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentLine < podcast.dialogue.length - 1) {
      setCurrentLine(prev => prev + 1);
    } else {
      // Reached end
      markPodcastListened(podcast.id);
      setIsPlaying(false);
    }
  }, [currentLine, podcast, markPodcastListened]);

  const handlePrev = useCallback(() => {
    if (currentLine > 0) setCurrentLine(prev => prev - 1);
  }, [currentLine]);

  const progress = podcast.dialogue.length > 0
    ? Math.round(((currentLine + 1) / podcast.dialogue.length) * 100)
    : 0;

  const line = podcast.dialogue[currentLine];

  return (
    <div className="bg-[#0a1020] border border-tactical-border rounded p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-tactical-text">{podcast.title}</div>
          <div className="text-[9px] font-mono text-tactical-text/30">{podcast.host} / {podcast.duration}</div>
        </div>
        <div className="flex items-center gap-2">
          {isListened && (
            <span className="text-[9px] font-mono text-emerald-400">LISTENED</span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-[10px] font-mono text-tactical-text/30 hover:text-tactical-text/60"
            >
              [X]
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-[#00e5ff]/50 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-[9px] font-mono text-tactical-text/30 text-right">
        {currentLine + 1}/{podcast.dialogue.length}
      </div>

      {/* Dialogue */}
      {line && (
        <div className="min-h-[60px] bg-black/30 rounded p-2">
          <div className={`text-[10px] font-mono mb-1 ${
            line.speaker === 'Alex' ? 'text-[#00e5ff]' : 'text-purple-400'
          }`}>
            {line.speaker}
          </div>
          <div className="text-[11px] font-mono text-tactical-text/80 leading-relaxed">
            {line.text}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handlePrev}
          disabled={currentLine === 0}
          className="px-2 py-1 rounded text-[10px] font-mono text-tactical-text/50 hover:text-tactical-text disabled:opacity-20 transition-colors"
        >
          PREV
        </button>
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="px-4 py-1 rounded text-[10px] font-mono tracking-wider bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 hover:bg-[#00e5ff]/20 transition-colors"
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <button
          onClick={handleNext}
          disabled={currentLine >= podcast.dialogue.length - 1 && isListened}
          className="px-2 py-1 rounded text-[10px] font-mono text-tactical-text/50 hover:text-tactical-text disabled:opacity-20 transition-colors"
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
