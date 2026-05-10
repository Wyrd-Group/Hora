import React, { useState } from 'react';

// ── Status badge colors ──
const STATUS_STYLES = {
  pending:   'bg-gray-600/60 text-gray-300',
  active:    'bg-cyan-500/20 text-cyan-300 animate-pulse',
  completed: 'bg-emerald-500/20 text-emerald-400',
  failed:    'bg-rose-500/20 text-rose-400',
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
        STATUS_STYLES[status] ?? STATUS_STYLES.pending
      }`}
    >
      {status}
    </span>
  );
}

// ── Delegation plan card ──
function DelegationCard({ plan }) {
  return (
    <div className="bg-[rgba(24,22,18,0.85)] border border-[rgba(232,224,208,0.10)] backdrop-blur-xl rounded-lg p-4 mb-3">
      <p className="text-[#E8E0D0] font-mono text-sm mb-3 leading-relaxed">
        <span className="text-[#00e5ff] mr-2">&gt;</span>
        {plan.directive}
      </p>

      <div className="space-y-2 ml-4 border-l border-[rgba(232,224,208,0.08)] pl-3">
        {plan.tasks.map((t, i) => (
          <div key={i} className="flex items-start gap-2 text-xs font-mono">
            <span className="text-lg leading-none mt-[-2px]">{t.agentGlyph ?? '>'}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[#E8E0D0]">{t.agentName}</span>
              <span className="text-[#9C8E7E] mx-1">|</span>
              <span className="text-[#9C8E7E]">{t.taskDescription}</span>
            </div>
            <StatusBadge status={t.status ?? 'pending'} />
          </div>
        ))}
      </div>

      <div className="mt-2 text-right">
        <StatusBadge status={plan.status} />
      </div>
    </div>
  );
}

// ── Agent roster row ──
function AgentRow({ agent }) {
  const noContract = !agent.contract;
  const working = agent.deployedTo && !noContract;
  const idle = !working && !noContract;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border font-mono text-xs transition-all ${
        working
          ? 'border-[#00e5ff]/30 bg-[#00e5ff]/5 shadow-[0_0_12px_rgba(0,229,255,0.08)]'
          : noContract
          ? 'border-rose-500/20 bg-rose-500/5 opacity-60'
          : 'border-[rgba(232,224,208,0.06)] bg-[rgba(24,22,18,0.6)] opacity-70'
      }`}
    >
      <span className="text-xl leading-none">{agent.iconGlyph ?? '?'}</span>

      <div className="flex-1 min-w-0">
        <p className="text-[#E8E0D0] truncate">{agent.name}</p>
        <p className="text-[#9C8E7E] text-[10px] uppercase tracking-wider">{agent.class}</p>
      </div>

      <span className="text-[10px] rounded bg-[rgba(232,224,208,0.08)] px-1.5 py-0.5 text-[#E8E0D0]">
        OVR {agent.currentOverallRating ?? '--'}
      </span>

      {noContract && (
        <span className="text-[10px] rounded bg-rose-500/20 text-rose-400 px-1.5 py-0.5 uppercase tracking-wider">
          No Contract
        </span>
      )}
      {working && (
        <span className="text-[10px] rounded bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 uppercase tracking-wider">
          Working
        </span>
      )}
      {idle && (
        <span className="text-[10px] rounded bg-gray-600/40 text-gray-400 px-1.5 py-0.5 uppercase tracking-wider">
          Idle
        </span>
      )}
    </div>
  );
}

// ── CV summary card ──
function CVSummary({ userProfile, onOpenCV }) {
  if (!userProfile) {
    return (
      <div className="bg-[rgba(24,22,18,0.85)] border border-dashed border-[rgba(232,224,208,0.15)] backdrop-blur-xl rounded-lg p-4 mb-4 text-center">
        <p className="text-[#9C8E7E] font-mono text-xs mb-3 uppercase tracking-wider">
          No CV imported
        </p>
        <button
          onClick={onOpenCV}
          className="px-4 py-1.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] font-mono text-xs uppercase tracking-wider border border-[#00e5ff]/30 hover:bg-[#00e5ff]/30 transition-colors"
        >
          Import CV
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(24,22,18,0.85)] border border-[rgba(232,224,208,0.10)] backdrop-blur-xl rounded-lg p-4 mb-4">
      <p className="text-[#9C8E7E] font-mono text-[10px] uppercase tracking-wider mb-2">
        Your Profile
      </p>
      {userProfile.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {userProfile.skills.map((s, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-[#00e5ff]/10 text-[#00e5ff] text-[10px] font-mono border border-[#00e5ff]/20"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={onOpenCV}
        className="text-[10px] font-mono text-[#9C8E7E] hover:text-[#E8E0D0] underline underline-offset-2 transition-colors uppercase tracking-wider"
      >
        Update CV
      </button>
    </div>
  );
}

// ── Main component ──
export default function AgentWorkbench({
  agents = [],
  tasks = {},
  delegationPlans = [],
  userProfile = null,
  onDelegate,
  onCompleteTask,
  onOpenCV,
  onBack,
}) {
  const [directive, setDirective] = useState('');

  const handleSubmit = () => {
    const trimmed = directive.trim();
    if (!trimmed || !onDelegate) return;
    onDelegate(trimmed);
    setDirective('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Stats
  const allTasks = Object.values(tasks);
  const completedCount = allTasks.filter((t) => t.status === 'completed').length;
  const activeCount = allTasks.filter((t) => t.status === 'active').length;
  const deployedCount = agents.filter((a) => a.deployedTo && a.contract).length;

  // Plans in reverse chronological
  const sortedPlans = [...delegationPlans].reverse();

  return (
    <div className="min-h-screen bg-[#060a12] text-[#E8E0D0] font-mono flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-[rgba(232,224,208,0.08)] px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-[#9C8E7E] hover:text-[#E8E0D0] text-xs uppercase tracking-wider transition-colors"
        >
          &larr; Back
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-lg tracking-[0.3em] uppercase font-bold">
            <span className="text-[#00e5ff]">Athena</span> Directive Terminal
          </h1>
          <p className="text-[10px] text-[#9C8E7E] uppercase tracking-[0.2em] mt-0.5">
            Chief Operating Officer
          </p>
        </div>

        <span className="px-2 py-1 rounded border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00e5ff] text-[10px] uppercase tracking-wider">
          COO
        </span>
      </header>

      {/* ── Main grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 lg:p-6 overflow-hidden">
        {/* LEFT: Directive input + feed (3/5) */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          {/* Directive input */}
          <div className="bg-[rgba(24,22,18,0.85)] border border-[rgba(232,224,208,0.10)] backdrop-blur-xl rounded-lg p-4 mb-4">
            <label className="text-[10px] text-[#9C8E7E] uppercase tracking-wider block mb-2">
              Directive
            </label>
            <div className="flex gap-2">
              <textarea
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Give Athena a directive..."
                rows={2}
                className="flex-1 bg-[rgba(232,224,208,0.04)] border border-[rgba(232,224,208,0.08)] rounded px-3 py-2 text-sm text-[#E8E0D0] placeholder-[#9C8E7E]/50 font-mono resize-none focus:outline-none focus:border-[#00e5ff]/40 transition-colors"
              />
              <button
                onClick={handleSubmit}
                disabled={!directive.trim()}
                className="self-end px-5 py-2 rounded bg-[#00e5ff]/20 text-[#00e5ff] text-xs uppercase tracking-wider border border-[#00e5ff]/30 hover:bg-[#00e5ff]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          </div>

          {/* Delegation feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-0">
            <p className="text-[10px] text-[#9C8E7E] uppercase tracking-wider mb-2">
              Delegation Feed
            </p>
            {sortedPlans.length === 0 ? (
              <p className="text-[#9C8E7E]/50 text-xs text-center py-8 font-mono">
                No directives yet. Give Athena an order above.
              </p>
            ) : (
              sortedPlans.map((plan) => (
                <DelegationCard key={plan.id} plan={plan} />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Agent roster (2/5) */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <CVSummary userProfile={userProfile} onOpenCV={onOpenCV} />

          <p className="text-[10px] text-[#9C8E7E] uppercase tracking-wider mb-2">
            Agent Roster
          </p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {agents.length === 0 ? (
              <p className="text-[#9C8E7E]/50 text-xs text-center py-8 font-mono">
                No agents available.
              </p>
            ) : (
              agents.map((agent) => (
                <AgentRow key={agent.mintId} agent={agent} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom stats bar ── */}
      <footer className="border-t border-[rgba(232,224,208,0.08)] px-6 py-3 flex items-center justify-center gap-8 text-[10px] font-mono uppercase tracking-wider">
        <span className="text-[#9C8E7E]">
          Completed{' '}
          <span className="text-emerald-400 ml-1">{completedCount}</span>
        </span>
        <span className="text-[#9C8E7E]">
          Active{' '}
          <span className="text-[#00e5ff] ml-1">{activeCount}</span>
        </span>
        <span className="text-[#9C8E7E]">
          Deployed{' '}
          <span className="text-[#E8E0D0] ml-1">{deployedCount}</span>
        </span>
      </footer>
    </div>
  );
}
