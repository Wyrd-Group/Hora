import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { fmtGameTime } from '../../lib/fmtGameTime';

/**
 * TaskManager — openable floating window showing all in-progress projects:
 * - Nodes under construction (status: 'building')
 * - R&D projects being researched
 * Each shows a progress bar, time remaining, and a RUSH button to pay-to-accelerate.
 */
export default function TaskManager({ open, onClose, onNavigate }) {
  const nodes = useEmpireStore((s) => s.nodes);
  const rdProjects = useEmpireStore((s) => s.rdProjects);
  const gameTick = useEmpireStore((s) => s.gameTick);
  const companyBalance = useEmpireStore((s) => s.companyBalance);
  const accelerateConstruction = useEmpireStore((s) => s.accelerateConstruction);
  const accelerateResearch = useEmpireStore((s) => s.accelerateResearch);

  if (!open) return null;

  // Gather building nodes
  const buildingNodes = Object.values(nodes).filter(
    (n) => n.owner === 'player' && n.status === 'building'
  );

  // Gather researching projects
  const researchingProjects = rdProjects.filter((p) => p.status === 'researching');

  const totalTasks = buildingNodes.length + researchingProjects.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[440px] max-h-[90vh] sm:max-h-[75vh] overflow-y-auto rounded-xl border border-white/10 shadow-2xl"
        style={{
          background: 'rgba(10, 14, 24, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">⚙</span>
            <span className="text-xs font-mono tracking-[0.2em] text-white/80 uppercase">
              Task Manager
            </span>
            {totalTasks > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400">
                {totalTasks}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {totalTasks === 0 && (
            <div className="text-center py-8 text-white/20 text-xs font-mono">
              No active projects
            </div>
          )}

          {/* Construction */}
          {buildingNodes.length > 0 && (
            <div className="space-y-2">
              <div className="text-[9px] font-mono tracking-[0.2em] text-white/30 uppercase">
                🏗 Construction
              </div>
              {buildingNodes.map((node) => {
                const start = node.buildStartTick ?? 0;
                const dur = node.buildDuration ?? 3;
                const elapsed = gameTick - start;
                const pct = Math.min(100, Math.round((elapsed / dur) * 100));
                const remaining = Math.max(1, dur - elapsed);
                const rushCost = Math.round((node.capex ?? 50000) * 0.5 * (remaining / dur));
                const canAfford = companyBalance >= rushCost;
                return (
                  <ConstructionCard
                    key={node.id}
                    title={node.name}
                    subtitle={`${node.type} · ${fmtGameTime(remaining)} remaining`}
                    progress={pct}
                    color="#f59e0b"
                    rushCost={rushCost}
                    canAfford={canAfford}
                    onRush={() => accelerateConstruction(node.id)}
                    onOpen={() => {
                      onNavigate?.({ app: 'globe', nodeId: node.id, flyTo: { lat: node.lat, lon: node.lon } });
                      onClose();
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* R&D */}
          {researchingProjects.length > 0 && (
            <div className="space-y-2">
              <div className="text-[9px] font-mono tracking-[0.2em] text-white/30 uppercase">
                🔬 Research & Development
              </div>
              {researchingProjects.map((proj) => {
                const remaining = Math.max(
                  0,
                  Math.ceil(((100 - proj.progress) / 100) * proj.duration)
                );
                const remainingFraction = (100 - proj.progress) / 100;
                const rushCost = Math.round(proj.cost * 0.75 * remainingFraction);
                const canAfford = companyBalance >= rushCost;
                return (
                  <ConstructionCard
                    key={proj.id}
                    title={proj.name}
                    subtitle={`${proj.category} · ${fmtGameTime(remaining)} remaining`}
                    progress={proj.progress}
                    color="#8b5cf6"
                    rushCost={rushCost}
                    canAfford={canAfford}
                    onRush={() => accelerateResearch(proj.id)}
                    onOpen={() => {
                      onNavigate?.({ app: 'globe', tab: 'rnd' });
                      onClose();
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConstructionCard({ title, subtitle, progress, color, rushCost, canAfford, onRush, onOpen }) {
  const [confirming, setConfirming] = useState(false);

  const fmt = (n) => n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n / 1e3).toFixed(0)}K` : `€${n}`;

  return (
    <div
      className="rounded-lg border border-white/5 p-3 hover:border-white/10 transition-colors"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-white/80">{title}</div>
          <div className="text-[9px] font-mono text-white/30 mt-0.5">{subtitle}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={onOpen}
            className="text-[8px] font-mono px-2 py-1 rounded border border-white/10 text-white/40 hover:text-white/80 hover:border-white/30 transition-all"
          >
            OPEN
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${color}40, ${color})`,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <div className="text-[8px] font-mono" style={{ color: `${color}99` }}>
          {progress}%
        </div>

        {/* Rush button */}
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={!canAfford}
            className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
              canAfford
                ? 'border-amber-400/30 text-amber-400/80 hover:bg-amber-400/10 hover:border-amber-400/50'
                : 'border-white/5 text-white/15 cursor-not-allowed'
            }`}
            title={canAfford ? `Pay ${fmt(rushCost)} to finish instantly` : `Need ${fmt(rushCost)}`}
          >
            ⚡ RUSH · {fmt(rushCost)}
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-amber-400/60">Pay {fmt(rushCost)}?</span>
            <button
              onClick={() => { onRush(); setConfirming(false); }}
              className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30 transition-all"
            >
              YES
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-white/30 hover:text-white/60 transition-all"
            >
              NO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
