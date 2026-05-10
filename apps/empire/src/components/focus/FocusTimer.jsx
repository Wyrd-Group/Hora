import React, { useEffect, useRef, useState } from 'react';
import { useFocusStore, BP_XP_PER_SESSION } from '../../store/focusStore';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import { useBattlePassStore } from '../../store/battlePassStore';

// ── Duration presets ─────────────────────────────────────────────
const DURATIONS = [25, 45, 60, 90];

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────────
const FocusTimer = ({ onClose }) => {
  const {
    isRunning, isPaused, selectedDuration, remainingSeconds,
    totalSessionsCompleted, totalAPFromFocus, currentStreak,
    startSession, tick, pauseSession, resumeSession, completeSession,
    cancelSession, getRewardForDuration,
  } = useFocusStore();

  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedReward, setEarnedReward] = useState(0);
  const intervalRef = useRef(null);
  const prevRunning = useRef(isRunning);

  // ── Timer tick ───────────────────────────────────────────────
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, tick]);

  // ── Detect completion (isRunning went true -> false while we had a session) ──
  useEffect(() => {
    if (prevRunning.current && !isRunning && !showCelebration) {
      // Session just completed (not cancelled -- cancelled sets remainingSeconds to 0 too,
      // but we track via the reward amount)
      const reward = getRewardForDuration(selectedDuration);
      if (reward > 0) {
        setEarnedReward(reward);
        setShowCelebration(true);

        // Award AP + BP-XP via external stores
        try {
          const ceStore = useCardEconomyStore?.getState?.();
          if (ceStore?.awardAegisPoints) ceStore.awardAegisPoints(reward);
        } catch (_) { /* store may not exist yet */ }

        try {
          const bpStore = useBattlePassStore?.getState?.();
          if (bpStore?.awardBPXP) bpStore.awardBPXP(BP_XP_PER_SESSION);
        } catch (_) { /* store may not exist yet */ }
      }
    }
    prevRunning.current = isRunning;
  }, [isRunning, selectedDuration, getRewardForDuration, showCelebration]);

  // ── Anti-cheat: visibility change ────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        pauseSession();
      } else {
        resumeSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pauseSession, resumeSession]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleStart = (mins) => {
    setShowCelebration(false);
    startSession(mins);
  };

  const handleCancel = () => {
    cancelSession();
    setShowCelebration(false);
  };

  const handleDismissCelebration = () => {
    setShowCelebration(false);
  };

  // ── Progress ring ────────────────────────────────────────────
  const totalSec = selectedDuration * 60;
  const progress = isRunning ? (totalSec - remainingSeconds) / totalSec : 0;
  const circumference = 2 * Math.PI * 54; // r=54
  const strokeOffset = circumference * (1 - progress);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isRunning) onClose?.(); }}
    >
      <div className="relative w-full max-w-md mx-4 bg-[#0a0e1a] border border-[#1e293b]/40 rounded-xl p-6 shadow-[0_0_60px_rgba(0,229,255,0.06)]">

        {/* Close button */}
        {!isRunning && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all font-mono text-xs"
          >
            X
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#00e5ff]/60">Focus Timer</div>
          <div className="text-[10px] font-mono text-white/30 mt-1">
            {isPaused ? 'PAUSED -- RETURN TO TAB' : isRunning ? 'SESSION ACTIVE' : 'SELECT DURATION'}
          </div>
        </div>

        {/* Celebration overlay */}
        {showCelebration && (
          <div className="absolute inset-0 bg-[#0a0e1a]/95 rounded-xl flex flex-col items-center justify-center z-10">
            <div className="text-3xl mb-3">+{earnedReward}</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ffd700]">AP Earned</div>
            <div className="text-[10px] font-mono text-white/40 mt-1">+{BP_XP_PER_SESSION} BP-XP</div>
            <div className="w-16 h-[1px] bg-[#00e5ff]/20 my-4" />
            <div className="text-[10px] font-mono text-white/50">
              {selectedDuration} min session complete
            </div>
            <button
              onClick={handleDismissCelebration}
              className="mt-6 px-6 py-2 rounded font-mono text-[10px] uppercase tracking-[0.15em] bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] hover:bg-[#00e5ff]/20 transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* Timer display */}
        <div className="flex justify-center mb-6">
          <div className="relative w-[140px] h-[140px] flex items-center justify-center">
            {/* Progress ring */}
            <svg className="absolute inset-0 -rotate-90" width="140" height="140">
              <circle
                cx="70" cy="70" r="54"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3"
              />
              {isRunning && (
                <circle
                  cx="70" cy="70" r="54"
                  fill="none"
                  stroke={isPaused ? '#f59e0b' : '#00e5ff'}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              )}
            </svg>
            {/* Time text */}
            <div className="text-center z-10">
              <div className={`text-4xl font-mono tabular-nums ${isPaused ? 'text-amber-400' : 'text-[#00e5ff]'}`}>
                {isRunning ? formatTime(remainingSeconds) : formatTime(selectedDuration * 60)}
              </div>
              {isRunning && (
                <div className="text-[8px] font-mono text-white/30 mt-1 uppercase tracking-[0.2em]">
                  {isPaused ? 'paused' : 'remaining'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Duration presets (only when not running) */}
        {!isRunning && (
          <div className="flex justify-center gap-2 mb-4">
            {DURATIONS.map((d) => {
              const active = d === selectedDuration;
              return (
                <button
                  key={d}
                  onClick={() => handleStart(d)}
                  className={`
                    px-4 py-2 rounded-full font-mono text-[11px] transition-all
                    ${active
                      ? 'bg-[#00e5ff]/15 border border-[#00e5ff]/50 text-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70 hover:bg-white/10'
                    }
                  `}
                >
                  {d}m
                </button>
              );
            })}
          </div>
        )}

        {/* Reward preview (only when not running) */}
        {!isRunning && !showCelebration && (
          <div className="text-center mb-5">
            <span className="text-[10px] font-mono text-white/30">Reward: </span>
            <span className="text-[10px] font-mono text-[#ffd700]">
              {getRewardForDuration(selectedDuration)} AP
            </span>
            <span className="text-[10px] font-mono text-white/20 mx-1">+</span>
            <span className="text-[10px] font-mono text-[#00e5ff]/60">
              {BP_XP_PER_SESSION} BP-XP
            </span>
          </div>
        )}

        {/* Cancel button (when running) */}
        {isRunning && (
          <div className="flex justify-center mb-4">
            <button
              onClick={handleCancel}
              className="px-5 py-2 rounded font-mono text-[10px] uppercase tracking-[0.15em] bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              Cancel Session
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-full h-[1px] bg-white/5 my-4" />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-sm font-mono text-white/80">{totalSessionsCompleted}</div>
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-[0.15em]">Sessions</div>
          </div>
          <div>
            <div className="text-sm font-mono text-[#ffd700]">{totalAPFromFocus.toLocaleString()}</div>
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-[0.15em]">AP Earned</div>
          </div>
          <div>
            <div className="text-sm font-mono text-[#00e5ff]">{currentStreak}d</div>
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-[0.15em]">Streak</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
