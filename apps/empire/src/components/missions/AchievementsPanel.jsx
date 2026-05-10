import React, { useState, useEffect } from 'react';
import { useAchievementsStore } from '../../store/achievementsStore';
import { ACHIEVEMENTS, CATEGORIES, TIER_COLORS } from '../../data/achievements';

const AchievementsPanel = ({ onClose }) => {
  const { unlocked, stats, clearNotifications } = useAchievementsStore();
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => { clearNotifications(); }, [clearNotifications]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = activeCategory === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === activeCategory);

  const totalUnlocked = unlocked.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const completionPct = Math.round((totalUnlocked / totalAchievements) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-[#060a12]/95 backdrop-blur-md flex flex-col items-center overflow-auto font-mono">
      {/* Header */}
      <div className="w-full max-w-3xl px-6 pt-6 flex items-start justify-between">
        <div>
          <h1 className="text-[10px] tracking-[0.3em] uppercase text-[#ec4899]/60 font-bold">
            Achievements
          </h1>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-lg text-tactical-text font-bold">{totalUnlocked}</span>
            <span className="text-tactical-text/40 text-sm">/ {totalAchievements}</span>
            <span className="text-[9px] text-[#ec4899]/50">({completionPct}%)</span>
          </div>
        </div>
        <button
          onClick={() => onClose?.()}
          className="w-7 h-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
        >
          &#10005;
        </button>
      </div>

      {/* Completion bar */}
      <div className="w-full max-w-3xl px-6 mt-3">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${completionPct}%`,
              background: 'linear-gradient(90deg, #ec4899, #a78bfa)',
            }}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="w-full max-w-3xl px-6 mt-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2.5 py-1 rounded text-[8px] font-mono uppercase tracking-wider transition-all border ${
            activeCategory === 'all'
              ? 'text-white/80 border-white/20 bg-white/10'
              : 'text-white/30 border-white/[0.06] hover:text-white/50'
          }`}
        >
          All ({totalAchievements})
        </button>
        {CATEGORIES.map(cat => {
          const count = ACHIEVEMENTS.filter(a => a.category === cat.key).length;
          const done = ACHIEVEMENTS.filter(a => a.category === cat.key && unlocked.includes(a.id)).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-2.5 py-1 rounded text-[8px] font-mono uppercase tracking-wider transition-all border ${
                activeCategory === cat.key
                  ? 'font-semibold'
                  : 'hover:brightness-150'
              }`}
              style={{
                color: activeCategory === cat.key ? cat.color : `${cat.color}66`,
                borderColor: activeCategory === cat.key ? `${cat.color}40` : `${cat.color}15`,
                backgroundColor: activeCategory === cat.key ? `${cat.color}10` : 'transparent',
              }}
            >
              {cat.label} ({done}/{count})
            </button>
          );
        })}
      </div>

      {/* Achievement grid */}
      <div className="w-full max-w-3xl px-6 mt-4 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((ach) => {
          const isUnlocked = unlocked.includes(ach.id);
          const progress = stats[ach.checkKey] ?? 0;
          const clamped = Math.min(progress, ach.target);
          const pct = (clamped / ach.target) * 100;
          const tierColor = TIER_COLORS[ach.tier];
          const catInfo = CATEGORIES.find(c => c.key === ach.category);

          return (
            <div
              key={ach.id}
              className={`rounded-lg border p-3 transition-all ${
                isUnlocked
                  ? 'bg-white/[0.03] border-white/[0.08]'
                  : 'bg-[#0b1018] border-white/[0.04] opacity-70'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Trophy icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{
                    backgroundColor: isUnlocked ? `${tierColor}20` : 'rgba(255,255,255,0.03)',
                    color: isUnlocked ? tierColor : 'rgba(255,255,255,0.15)',
                    border: `1px solid ${isUnlocked ? `${tierColor}40` : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {isUnlocked ? ach.icon : '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold ${isUnlocked ? 'text-tactical-text/90' : 'text-white/40'}`}>
                      {ach.title}
                    </span>
                    <span
                      className="text-[6px] uppercase tracking-widest px-1 py-0.5 rounded"
                      style={{
                        color: tierColor,
                        backgroundColor: `${tierColor}15`,
                        border: `1px solid ${tierColor}25`,
                      }}
                    >
                      {ach.tier}
                    </span>
                  </div>
                  <p className="text-[7px] text-white/30 mt-0.5">{ach.description}</p>

                  {/* Progress */}
                  {!isUnlocked && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: catInfo?.color || '#fff' }}
                        />
                      </div>
                      <span className="text-[7px] text-white/25 shrink-0">
                        {clamped.toLocaleString()}/{ach.target.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Reward */}
                  <div className="mt-1 text-[7px] text-white/20">
                    <span className="text-[#ec4899]/50">{ach.reward.ap} AP</span>
                    {' · '}
                    <span className="text-[#10b981]/50">{ach.reward.bpXp} BP</span>
                    {isUnlocked && <span className="text-[#10b981]/60 ml-2">✓ Unlocked</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsPanel;
