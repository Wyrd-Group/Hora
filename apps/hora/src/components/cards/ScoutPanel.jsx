/**
 * ScoutPanel — Scout & Jobhunter deployment UI.
 *
 * Left column: owned Scouts & Jobhunters with deploy/recall controls.
 * Right column: Transfer Market of agents discovered by Jobhunters.
 */

import { useState } from 'react';

// ── Helpers ─────────────────────────────────────────────────────

function ovrColor(ovr) {
  if (ovr >= 85) return '#34d399'; // emerald
  if (ovr >= 70) return '#22d3ee'; // cyan
  if (ovr >= 55) return '#fbbf24'; // amber
  return '#f87171'; // rose
}

function OvrBadge({ ovr }) {
  const bg = ovrColor(ovr);
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded font-mono text-[13px] font-bold leading-none"
      style={{ background: `${bg}18`, color: bg, border: `1px solid ${bg}40` }}
    >
      {ovr}
    </span>
  );
}

function GlassCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <h3 className="text-[11px] font-mono tracking-[0.2em] text-cyan-400/80 uppercase mb-3">
      {children}
    </h3>
  );
}

// ── Agent Row (owned scout / jobhunter) ─────────────────────────

function AgentRow({
  agent,
  societies,
  onDeployScout,
  onRecallScout,
  onDeployJobhunter,
  onRecallJobhunter,
}) {
  const [selectedSociety, setSelectedSociety] = useState('');
  const isScout = agent.class === 'Scout';
  const isJobhunter = agent.class === 'Jobhunter';
  const isDeployed = !!agent.deployedTo;

  return (
    <GlassCard className="p-3 mb-2">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-lg">
          {agent.iconGlyph || (isScout ? '🔍' : '📋')}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-mono text-white/90 truncate">{agent.name}</span>
            <OvrBadge ovr={agent.currentOverallRating} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono tracking-wider text-cyan-400/60 uppercase">
              {agent.class}
            </span>
            {isDeployed && (
              <span className="text-[10px] font-mono text-emerald-400/70">
                ● Deployed{agent.deployedTo ? ` → ${agent.deployedTo}` : ''}
              </span>
            )}
            {!isDeployed && (
              <span className="text-[10px] font-mono text-white/30">○ Idle</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isScout && !isDeployed && (
            <>
              <select
                value={selectedSociety}
                onChange={(e) => setSelectedSociety(e.target.value)}
                className="bg-black/40 border border-white/10 rounded text-[10px] font-mono text-white/70 px-2 py-1 outline-none focus:border-cyan-500/40 max-w-[140px]"
              >
                <option value="">Select society...</option>
                {societies
                  .filter((s) => !s.scoutAssigned)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => selectedSociety && onDeployScout(agent.mintId, selectedSociety)}
                disabled={!selectedSociety}
                className={`px-3 py-1 rounded text-[10px] font-mono tracking-wider border transition-all ${
                  selectedSociety
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                    : 'bg-black/20 text-white/20 border-white/5 cursor-not-allowed'
                }`}
              >
                DEPLOY
              </button>
            </>
          )}

          {isScout && isDeployed && (
            <button
              onClick={() => onRecallScout(agent.mintId)}
              className="px-3 py-1 rounded text-[10px] font-mono tracking-wider border bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 transition-all"
            >
              RECALL
            </button>
          )}

          {isJobhunter && !isDeployed && (
            <button
              onClick={() => onDeployJobhunter(agent.mintId)}
              className="px-3 py-1 rounded text-[10px] font-mono tracking-wider border bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] transition-all"
            >
              DEPLOY TO MARKET
            </button>
          )}

          {isJobhunter && isDeployed && (
            <button
              onClick={() => onRecallJobhunter(agent.mintId)}
              className="px-3 py-1 rounded text-[10px] font-mono tracking-wider border bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20 transition-all"
            >
              RECALL
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ── Transfer Market Row ─────────────────────────────────────────

function MarketAgentRow({ agent, onRecruit }) {
  return (
    <GlassCard className="p-3 mb-2">
      <div className="flex items-center gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-mono text-white/90 truncate">{agent.name}</span>
            <OvrBadge ovr={agent.rating} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-mono tracking-wider text-cyan-400/60 uppercase">
              {agent.class}
            </span>
            <span className="text-[10px] font-mono text-white/40">
              POT <span className="text-amber-400/80">{agent.potentialRating}</span>
            </span>
          </div>
        </div>

        {/* Cost + Recruit */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Cost</div>
            <div className="text-[13px] font-mono text-amber-400 font-semibold">
              {agent.cost.toLocaleString()} <span className="text-[10px] text-amber-400/60">AP</span>
            </div>
          </div>
          <button
            onClick={() => onRecruit(agent.id)}
            className="px-4 py-1.5 rounded text-[10px] font-mono tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:shadow-[0_0_12px_rgba(52,211,153,0.2)] transition-all"
          >
            RECRUIT
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Main Panel ──────────────────────────────────────────────────

export default function ScoutPanel({
  scoutAgents = [],
  societies = [],
  transferMarket = [],
  onDeployScout,
  onRecallScout,
  onDeployJobhunter,
  onRecallJobhunter,
  onRecruitFromMarket,
  onBack,
}) {
  const scouts = scoutAgents.filter((a) => a.class === 'Scout');
  const jobhunters = scoutAgents.filter((a) => a.class === 'Jobhunter');

  return (
    <div className="min-h-screen bg-[#060a12] text-white/90 font-mono p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-sm"
        >
          ←
        </button>
        <h2 className="text-[15px] font-mono tracking-[0.15em] text-white/90 uppercase">
          Scout & Jobhunter Operations
        </h2>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: My Scouts & Jobhunters */}
        <div>
          <SectionHeader>My Scouts & Jobhunters</SectionHeader>

          {scoutAgents.length === 0 && (
            <GlassCard className="p-6">
              <p className="text-[12px] font-mono text-white/30 text-center">
                No Scouts or Jobhunters in your roster.
              </p>
            </GlassCard>
          )}

          {scouts.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-mono text-white/30 tracking-wider uppercase mb-2">
                Scouts ({scouts.length})
              </div>
              {scouts.map((agent) => (
                <AgentRow
                  key={agent.mintId}
                  agent={agent}
                  societies={societies}
                  onDeployScout={onDeployScout}
                  onRecallScout={onRecallScout}
                  onDeployJobhunter={onDeployJobhunter}
                  onRecallJobhunter={onRecallJobhunter}
                />
              ))}
            </div>
          )}

          {jobhunters.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-white/30 tracking-wider uppercase mb-2">
                Jobhunters ({jobhunters.length})
              </div>
              {jobhunters.map((agent) => (
                <AgentRow
                  key={agent.mintId}
                  agent={agent}
                  societies={societies}
                  onDeployScout={onDeployScout}
                  onRecallScout={onRecallScout}
                  onDeployJobhunter={onDeployJobhunter}
                  onRecallJobhunter={onRecallJobhunter}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Transfer Market */}
        <div>
          <SectionHeader>Transfer Market</SectionHeader>

          {transferMarket.length === 0 ? (
            <GlassCard className="p-8">
              <div className="text-center">
                <div className="text-3xl mb-3 opacity-30">📋</div>
                <p className="text-[12px] font-mono text-white/30 leading-relaxed">
                  Deploy a Jobhunter to discover<br />agents on the market
                </p>
              </div>
            </GlassCard>
          ) : (
            <div>
              <div className="text-[10px] font-mono text-white/30 tracking-wider uppercase mb-2">
                Available ({transferMarket.length})
              </div>
              {transferMarket.map((agent) => (
                <MarketAgentRow
                  key={agent.id}
                  agent={agent}
                  onRecruit={onRecruitFromMarket}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
