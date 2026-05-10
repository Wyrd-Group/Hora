import React, { useEffect } from 'react';
import { useDailyMissionsStore } from '../../store/dailyMissionsStore';
import { STREAK_BONUSES, ALL_CLEAR_BONUS } from '../../data/dailyMissions';

const DIFFICULTY_COLORS = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
};

const DailyMissionsPanel = ({ onClose }) => {
  const {
    ensureDay, getTodayMissions, completedToday, dailyProgress,
    claimMission, claimAllClear, claimStreakBonus,
    allClearClaimed, streak, streakBonusesClaimed, currentDay,
  } = useDailyMissionsStore();

  useEffect(() => { ensureDay(); }, [ensureDay]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const missions = getTodayMissions();
  const allComplete = missions.every(m => completedToday.includes(m.id));

  // Auto-trigger all-clear when all 3 done
  useEffect(() => {
    if (allComplete && !allClearClaimed) claimAllClear();
  }, [allComplete, allClearClaimed, claimAllClear]);

  return (
    <div className="fixed inset-0 z-50 bg-[#060a12]/95 backdrop-blur-md flex flex-col items-center overflow-auto font-mono">
      {/* Header */}
      <div className="w-full max-w-2xl px-6 pt-6 flex items-start justify-between">
        <div>
          <h1 className="text-[10px] tracking-[0.3em] uppercase text-[#00e5ff]/60 font-bold">
            Daily Missions
          </h1>
          <p className="text-[8px] text-white/25 tracking-wider mt-0.5">
            Complete all 3 for bonus rewards. Resets at midnight.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Streak badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#f59e0b]/20 bg-[#f59e0b]/5">
            <span className="text-[#f59e0b] text-xs">🔥</span>
            <span className="text-[10px] text-[#f59e0b]/80 font-bold">{streak}</span>
            <span className="text-[7px] text-[#f59e0b]/40 uppercase tracking-wider">day streak</span>
          </div>
          <button
            onClick={() => onClose?.()}
            className="w-7 h-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Date */}
      <div className="w-full max-w-2xl px-6 mt-2">
        <span className="text-[8px] text-white/20 tracking-widest uppercase">{currentDay}</span>
      </div>

      {/* Mission Cards */}
      <div className="w-full max-w-2xl px-6 mt-4 space-y-3">
        {missions.map((mission) => {
          const progress = dailyProgress[mission.checkKey] ?? 0;
          const clamped = Math.min(progress, mission.target);
          const pct = (clamped / mission.target) * 100;
          const done = completedToday.includes(mission.id);
          const canClaim = clamped >= mission.target && !done;
          const color = DIFFICULTY_COLORS[mission.difficulty];

          return (
            <div
              key={mission.id}
              className={`rounded-xl border p-4 transition-all ${
                done
                  ? 'bg-white/[0.02] border-[#10b981]/20 opacity-60'
                  : 'bg-[#0b1018] border-white/[0.06]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {done ? '✓' : mission.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-tactical-text/90">{mission.title}</span>
                      <span
                        className="text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                      >
                        {mission.difficulty}
                      </span>
                    </div>
                    <p className="text-[8px] text-white/35 mt-0.5">{mission.description}</p>

                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[8px] text-white/40 shrink-0">
                        {clamped}/{mission.target}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reward / Claim */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="text-[8px] text-white/30 text-right">
                    <span className="text-[#ec4899]/60">{mission.reward.ap} AP</span>
                    {' · '}
                    <span className="text-[#10b981]/60">{mission.reward.bpXp} BP</span>
                  </div>
                  {canClaim && (
                    <button
                      onClick={() => claimMission(mission.id)}
                      className="px-3 py-1 rounded text-[8px] font-bold uppercase tracking-wider border transition-all hover:brightness-125"
                      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
                    >
                      Claim
                    </button>
                  )}
                  {done && (
                    <span className="text-[8px] text-[#10b981]/60 uppercase tracking-wider">Claimed</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* All-Clear Bonus */}
      <div className="w-full max-w-2xl px-6 mt-4">
        <div className={`rounded-xl border p-4 text-center transition-all ${
          allClearClaimed
            ? 'bg-[#10b981]/5 border-[#10b981]/20'
            : allComplete
              ? 'bg-[#f59e0b]/5 border-[#f59e0b]/30 animate-pulse'
              : 'bg-white/[0.02] border-white/[0.04]'
        }`}>
          <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{
            color: allClearClaimed ? '#10b981' : allComplete ? '#f59e0b' : 'rgba(255,255,255,0.25)',
          }}>
            {allClearClaimed ? '✓ All-Clear Bonus Claimed' : 'Complete All 3 for Bonus'}
          </span>
          <div className="text-[8px] text-white/30 mt-1">
            +{ALL_CLEAR_BONUS.ap} AP · +{ALL_CLEAR_BONUS.bpXp} BP-XP · +{ALL_CLEAR_BONUS.xp} XP
          </div>
        </div>
      </div>

      {/* Streak Milestones */}
      <div className="w-full max-w-2xl px-6 mt-4 pb-6">
        <h3 className="text-[9px] tracking-[0.2em] uppercase text-white/30 font-bold mb-2">
          Streak Milestones
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STREAK_BONUSES.map((bonus) => {
            const reached = streak >= bonus.days;
            const claimed = streakBonusesClaimed.includes(bonus.days);
            const canClaim = reached && !claimed;

            return (
              <div
                key={bonus.days}
                className={`rounded-lg border p-3 text-center transition-all ${
                  claimed
                    ? 'bg-white/[0.02] border-white/[0.06] opacity-50'
                    : reached
                      ? 'bg-[#f59e0b]/5 border-[#f59e0b]/30'
                      : 'bg-white/[0.02] border-white/[0.04]'
                }`}
              >
                <div className="text-sm font-bold" style={{
                  color: reached ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                }}>
                  {bonus.days}
                </div>
                <div className="text-[7px] text-white/30 uppercase tracking-wider mt-0.5">
                  {bonus.label}
                </div>
                <div className="text-[7px] text-[#ec4899]/50 mt-1">
                  +{bonus.apBonus} AP
                </div>
                {canClaim ? (
                  <button
                    onClick={() => claimStreakBonus(bonus.days)}
                    className="mt-1.5 px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all"
                  >
                    Claim
                  </button>
                ) : claimed ? (
                  <span className="text-[7px] text-[#10b981]/50 mt-1.5 block">✓</span>
                ) : (
                  <div className="text-[7px] text-white/15 mt-1.5">
                    {streak}/{bonus.days}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyMissionsPanel;
