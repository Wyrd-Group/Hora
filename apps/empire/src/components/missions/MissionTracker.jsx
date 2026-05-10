/**
 * MissionTracker.jsx -- Sidebar/overlay showing active and completed missions.
 * Supports compact mode for embedding in replay sidebar.
 */

import { useState, useMemo } from 'react';
import { useMissionsStore } from '../../store/missionsStore';
import { getMissionsByContext, ALL_MISSIONS } from '../../data/missions';

// ── Props ──────────────────────────────────────────────────────────
// context: 'lab' | 'replay' | 'exchange' | 'global' (filters missions shown)
// compact: boolean (compact mode for embedding)

export default function MissionTracker({ context = 'replay', compact = false }) {
  const completedMissions = useMissionsStore((s) => s.completedMissions);
  const missionProgress = useMissionsStore((s) => s.missionProgress);
  const [expanded, setExpanded] = useState(!compact);

  const missions = useMemo(() => getMissionsByContext(context), [context]);

  const active = useMemo(
    () => missions.filter((m) => !completedMissions.includes(m.id)),
    [missions, completedMissions],
  );

  const completed = useMemo(
    () => missions.filter((m) => completedMissions.includes(m.id)),
    [missions, completedMissions],
  );

  const progressPct = missions.length > 0
    ? Math.round((completed.length / missions.length) * 100)
    : 0;

  // Compact collapsed state
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#0a0f1a]/40 transition-colors"
      >
        <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-amber-400/60">
          Missions {completed.length}/{missions.length}
        </span>
        <span className="text-[8px] font-mono text-tactical-text/20">[+]</span>
      </button>
    );
  }

  return (
    <div className={compact ? 'max-h-60 overflow-y-auto' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-tactical-border/10">
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-amber-400/50">
            {context} missions
          </span>
          <span className="text-[8px] font-mono text-tactical-text/20 tabular-nums">
            {completed.length}/{missions.length}
          </span>
        </div>
        {compact && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[8px] font-mono text-tactical-text/20 hover:text-tactical-text/40"
          >
            [-]
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-3 pt-2 pb-1">
        <div className="w-full h-1 bg-tactical-border/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400/50 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Active missions */}
      {active.length > 0 && (
        <div className="px-3 py-1 space-y-1">
          {active.map((m) => {
            const progress = missionProgress[m.id] ?? 0;
            const pct = m.target > 0 ? Math.min(100, (progress / m.target) * 100) : 0;

            return (
              <div key={m.id} className="bg-[#0a0f1a]/30 border border-tactical-border/10 rounded px-2 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono text-tactical-text/60 font-semibold truncate">
                      {m.title}
                    </p>
                    <p className="text-[8px] font-mono text-tactical-text/25 truncate">
                      {m.description}
                    </p>
                  </div>
                  <span className="text-[7px] font-mono text-amber-400/40 whitespace-nowrap">
                    {m.reward.ap ? `${m.reward.ap}AP` : ''}
                    {m.reward.bpXp ? ` +${m.reward.bpXp}BP` : ''}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-0.5 bg-tactical-border/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00e5ff]/30 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[7px] font-mono text-tactical-text/20 tabular-nums">
                    {progress}/{m.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed missions */}
      {completed.length > 0 && (
        <div className="px-3 py-1">
          <p className="text-[7px] font-mono uppercase tracking-[0.2em] text-tactical-text/15 mb-1">
            Completed
          </p>
          <div className="space-y-0.5">
            {completed.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-0.5">
                <span className="text-[8px] font-mono text-emerald-400/40 truncate">
                  {m.title}
                </span>
                <span className="text-[7px] font-mono text-emerald-400/25">done</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {missions.length === 0 && (
        <p className="text-[9px] font-mono text-tactical-text/15 text-center py-4">
          No missions for this context
        </p>
      )}
    </div>
  );
}
