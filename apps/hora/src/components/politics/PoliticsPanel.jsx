/**
 * PoliticsPanel.jsx — Corporate politics panel: PACs, lobbying, campaign
 * donations, media manipulation, election influence, regulatory capture.
 */

import { useState, useMemo, useCallback } from 'react';
import { usePoliticsStore } from '../../store/politicsStore';
import { useEmpireStore } from '../../store/empireStore';
import { fmtGameTime } from '../../lib/fmtGameTime';
import {
  POLITICAL_TIER_NAMES,
  POLITICAL_TIER_THRESHOLDS,
  LOBBYING_PROJECTS,
  SUPER_PAC_GOALS,
  CAPTURE_ACTIONS,
  CAMPAIGN_DONATIONS,
  MEDIA_OPERATIONS,
  ELECTION_ACTIONS,
} from '../../data/politicsData';

/* ── Helpers ─────────────────────────────────────────────────────────── */

const fmt = (n) =>
  n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n / 1e3).toFixed(0)}K` : `€${n}`;

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  extreme: '#dc2626',
};

const ALIGNMENT_COLORS = {
  'business-friendly': '#a78bfa',
  populist: '#f59e0b',
  centrist: '#60a5fa',
};

/* ── Progress Bar ────────────────────────────────────────────────────── */

function ProgressBar({ value, max, color = '#a78bfa' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1 rounded-full bg-tactical-border/50 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ── Section Wrapper ─────────────────────────────────────────────────── */

function Section({ title, titleColor = 'text-tactical-text', children }) {
  return (
    <div className="border border-tactical-border rounded-lg p-3">
      <h4 className={`text-[9px] font-mono tracking-widest uppercase ${titleColor}/60 mb-2`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

/* ── Main Panel ──────────────────────────────────────────────────────── */

export default function PoliticsPanel() {
  const {
    politicalTier,
    politicalXp,
    activeLobbying,
    completedLobbying,
    superPacContributions,
    regulatoryHistory,
    startLobbyingProject,
    contributeToPac,
  } = usePoliticsStore();

  const gameTick = useEmpireStore((s) => s.gameTick);
  const companyBalance = useEmpireStore((s) => s.companyBalance);

  // Local UI state
  const [flashDonation, setFlashDonation] = useState(null); // { candidateId, tierIdx }
  const [activeMediaOps, setActiveMediaOps] = useState([]); // [{ id, completesAt }]
  const [electionResults, setElectionResults] = useState(null); // { id, success, message }

  const tierName = POLITICAL_TIER_NAMES[politicalTier];
  const nextTier = Math.min(4, politicalTier + 1);
  const nextThreshold = POLITICAL_TIER_THRESHOLDS[nextTier];
  const currentThreshold = POLITICAL_TIER_THRESHOLDS[politicalTier];

  // Available lobbying projects
  const availableLobbying = useMemo(
    () =>
      LOBBYING_PROJECTS.filter(
        (p) =>
          !activeLobbying.some((a) => a.id === p.id) && !completedLobbying.includes(p.id),
      ),
    [activeLobbying, completedLobbying],
  );

  // Available media ops filtered by tier and cooldown
  const availableMediaOps = useMemo(
    () => MEDIA_OPERATIONS.filter((op) => politicalTier >= op.minTier),
    [politicalTier],
  );

  // Available election actions filtered by tier
  const availableElections = useMemo(
    () => ELECTION_ACTIONS.filter((a) => politicalTier >= a.minTier),
    [politicalTier],
  );

  // Clean up expired media ops
  const liveMediaOps = useMemo(
    () => activeMediaOps.filter((op) => op.completesAt > gameTick),
    [activeMediaOps, gameTick],
  );

  /* ── Handlers ────────────────────────────────────────────────────── */

  const handleDonation = useCallback(
    (candidate, tierIdx) => {
      const tier = candidate.donationTiers[tierIdx];
      if (companyBalance < tier.amount) return;

      useEmpireStore.setState((s) => ({
        companyBalance: s.companyBalance - tier.amount,
      }));
      usePoliticsStore.getState().addPoliticalXp(tier.xp);

      setFlashDonation({ candidateId: candidate.id, tierIdx });
      setTimeout(() => setFlashDonation(null), 1200);
    },
    [companyBalance],
  );

  const handleMediaOp = useCallback(
    (op) => {
      if (companyBalance < op.cost) return;
      if (liveMediaOps.some((m) => m.id === op.id)) return;

      useEmpireStore.setState((s) => {
        const patch = { companyBalance: s.companyBalance - op.cost };
        if (op.effects.followers) patch.followers = (s.followers || 0) + op.effects.followers;
        if (op.effects.power) patch.power = (s.power || 0) + op.effects.power;
        if (op.effects.heat) patch.heat = (s.heat || 0) + op.effects.heat;
        if (op.effects.governance) patch.governance = (s.governance || 0) + op.effects.governance;
        return patch;
      });
      usePoliticsStore.getState().addPoliticalXp(Math.floor(op.cost / 5000));

      setActiveMediaOps((prev) => [
        ...prev.filter((m) => m.completesAt > gameTick),
        { id: op.id, completesAt: gameTick + op.duration },
      ]);
    },
    [companyBalance, gameTick, liveMediaOps],
  );

  const handleElectionAction = useCallback(
    (action) => {
      if (companyBalance < action.cost) return;

      useEmpireStore.setState((s) => ({
        companyBalance: s.companyBalance - action.cost,
      }));

      const success = Math.random() < action.successRate;

      if (success) {
        useEmpireStore.setState((s) => {
          const patch = {};
          if (action.effects.power) patch.power = (s.power || 0) + action.effects.power;
          if (action.effects.heat) patch.heat = (s.heat || 0) + action.effects.heat;
          if (action.effects.governance)
            patch.governance = (s.governance || 0) + action.effects.governance;
          return patch;
        });
        usePoliticsStore.getState().addPoliticalXp(Math.floor(action.cost / 2000));
        setElectionResults({ id: action.id, success: true, message: 'Operation successful' });
      } else {
        // Parse heat/governance from consequence string, or apply fixed penalties
        const heatMatch = action.consequence.match(/\+(\d+)\s*heat/i);
        const govMatch = action.consequence.match(/(-\d+)\s*governance/i);
        const failHeat = heatMatch ? parseInt(heatMatch[1]) : 10;
        const failGov = govMatch ? parseInt(govMatch[1]) : 0;

        useEmpireStore.setState((s) => ({
          heat: (s.heat || 0) + failHeat,
          governance: (s.governance || 0) + failGov,
        }));
        setElectionResults({ id: action.id, success: false, message: action.consequence });
      }

      setTimeout(() => setElectionResults(null), 4000);
    },
    [companyBalance],
  );

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-3">
      {/* ─── TIER 0+: Political Influence Overview ─────────────────── */}
      <div className="border border-tactical-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-tactical-text">
            Political Influence
          </h3>
          <span className="text-[9px] font-mono text-[#a78bfa]">Tier {politicalTier}</span>
        </div>

        <div className="text-[11px] font-mono font-bold text-white mb-1">{tierName}</div>

        {politicalTier < 4 && (
          <div className="mt-2">
            <div className="flex justify-between text-[8px] font-mono text-tactical-text/40 mb-1">
              <span>{politicalXp} XP</span>
              <span>{nextThreshold} XP</span>
            </div>
            <ProgressBar
              value={politicalXp - currentThreshold}
              max={nextThreshold - currentThreshold}
            />
            <div className="text-[8px] font-mono text-tactical-text/30 mt-1">
              Next: {POLITICAL_TIER_NAMES[nextTier]}
            </div>
          </div>
        )}

        {politicalTier >= 4 && (
          <div className="text-[8px] font-mono text-amber-400 mt-1">Max tier reached</div>
        )}

        <div className="mt-2 space-y-0.5">
          {[1, 2, 3, 4].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span
                className={`text-[7px] ${
                  politicalTier >= t ? 'text-emerald-400' : 'text-tactical-text/20'
                }`}
              >
                {politicalTier >= t ? '\u2713' : '\u2717'}
              </span>
              <span
                className={`text-[8px] font-mono ${
                  politicalTier >= t ? 'text-tactical-text/60' : 'text-tactical-text/20'
                }`}
              >
                {POLITICAL_TIER_NAMES[t]} ({POLITICAL_TIER_THRESHOLDS[t]} XP)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── TIER 1+: Campaign Donations ───────────────────────────── */}
      {politicalTier >= 1 && (
        <Section title="Campaign Donations" titleColor="text-[#a78bfa]">
          <div className="space-y-2.5">
            {CAMPAIGN_DONATIONS.map((candidate) => (
              <div
                key={candidate.id}
                className="p-2 rounded border border-tactical-border bg-tactical-border/30"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-[9px] font-mono text-white font-bold">
                      {candidate.name}
                    </div>
                    <div className="text-[7px] font-mono text-tactical-text/40">
                      {candidate.position}
                    </div>
                  </div>
                  <span
                    className="text-[6px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded"
                    style={{
                      color: ALIGNMENT_COLORS[candidate.alignment],
                      border: `1px solid ${ALIGNMENT_COLORS[candidate.alignment]}30`,
                      background: `${ALIGNMENT_COLORS[candidate.alignment]}10`,
                    }}
                  >
                    {candidate.alignment}
                  </span>
                </div>

                <div className="space-y-1 mt-1.5">
                  {candidate.donationTiers.map((tier, idx) => {
                    const canAfford = companyBalance >= tier.amount;
                    const justPaid =
                      flashDonation?.candidateId === candidate.id &&
                      flashDonation?.tierIdx === idx;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDonation(candidate, idx)}
                        disabled={!canAfford}
                        className={`w-full text-left p-1.5 rounded border transition-all duration-300 ${
                          justPaid
                            ? 'border-emerald-400/60 bg-emerald-400/10'
                            : canAfford
                              ? 'border-tactical-border hover:border-[#a78bfa]/40 bg-white/[0.01] hover:bg-white/[0.03]'
                              : 'border-tactical-border/30 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono text-tactical-text/70">
                            {tier.reward}
                          </span>
                          <span
                            className={`text-[7px] font-mono font-bold ${
                              justPaid ? 'text-emerald-400' : 'text-[#a78bfa]'
                            }`}
                          >
                            {justPaid ? '\u2713 PAID' : fmt(tier.amount)}
                          </span>
                        </div>
                        <div className="text-[6px] font-mono text-tactical-text/25 mt-0.5">
                          +{tier.xp} political XP
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─── TIER 2+: Lobbying Projects ────────────────────────────── */}
      {politicalTier >= 2 && (
        <>
          {/* Active lobbying with rush buttons */}
          {activeLobbying.length > 0 && (
            <Section title="Active Lobbying" titleColor="text-[#f59e0b]">
              <div className="space-y-2">
                {activeLobbying.map((project) => {
                  const pct = Math.round((project.progress / project.duration) * 100);
                  const remainingTicks = Math.max(0, project.duration - project.progress);
                  const remainingFraction = remainingTicks / project.duration;
                  const rushCost = Math.round(project.cost * 0.5 * remainingFraction);
                  const canRush = companyBalance >= rushCost;

                  return (
                    <div key={project.id} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-mono text-tactical-text">
                          {project.name}
                        </span>
                        <span className="text-[8px] font-mono text-[#a78bfa]/50">{pct}%</span>
                      </div>
                      <ProgressBar value={project.progress} max={project.duration} color="#f59e0b" />
                      <div className="flex items-center justify-between">
                        <div className="text-[7px] font-mono text-tactical-text/30">
                          {project.effectDescription} · {fmtGameTime(remainingTicks)} left
                        </div>
                        <button
                          onClick={() =>
                            usePoliticsStore.getState().accelerateLobbying(project.id, gameTick)
                          }
                          disabled={!canRush}
                          className={`px-1.5 py-0.5 rounded font-mono text-[6px] font-bold uppercase tracking-widest transition-all ${
                            canRush
                              ? 'hover:brightness-125'
                              : 'opacity-40 cursor-not-allowed'
                          }`}
                          style={{
                            background: '#f59e0b15',
                            color: '#f59e0b',
                            border: '1px solid #f59e0b30',
                          }}
                          title={
                            canRush
                              ? `Pay ${fmt(rushCost)} to complete instantly`
                              : `Need ${fmt(rushCost)}`
                          }
                        >
                          ⚡ {fmt(rushCost)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Available lobbying projects */}
          {availableLobbying.length > 0 && (
            <Section title="Available Projects" titleColor="text-tactical-text">
              <div className="space-y-1.5">
                {availableLobbying.map((project) => {
                  const canAfford = companyBalance >= project.cost;
                  return (
                    <button
                      key={project.id}
                      onClick={() => startLobbyingProject(project, gameTick)}
                      disabled={!canAfford}
                      className={`w-full text-left p-2 rounded border transition-all ${
                        canAfford
                          ? 'border-tactical-border hover:border-[#a78bfa]/30 bg-white/[0.01] hover:bg-white/[0.03]'
                          : 'border-tactical-border/30 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono text-tactical-text">
                          {project.name}
                        </span>
                        <span className="text-[8px] font-mono text-tactical-text/30">
                          {fmt(project.cost)}
                        </span>
                      </div>
                      <div className="text-[7px] font-mono text-tactical-text/25 mt-0.5">
                        {project.effectDescription} | {Math.round(project.successRate * 100)}%
                        success
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}

      {/* ─── TIER 2+: Media Operations ─────────────────────────────── */}
      {politicalTier >= 2 && availableMediaOps.length > 0 && (
        <Section title="Media Operations" titleColor="text-[#a78bfa]">
          <div className="space-y-1.5">
            {availableMediaOps.map((op) => {
              const isActive = liveMediaOps.some((m) => m.id === op.id);
              const activeEntry = liveMediaOps.find((m) => m.id === op.id);
              const canAfford = companyBalance >= op.cost && !isActive;

              return (
                <div
                  key={op.id}
                  className="p-2 rounded border border-tactical-border bg-tactical-border/30"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 mr-2">
                      <div className="text-[9px] font-mono text-tactical-text font-bold">
                        {op.name}
                      </div>
                      <div className="text-[7px] font-mono text-tactical-text/30 mt-0.5">
                        {op.description}
                      </div>
                    </div>
                    <span
                      className="text-[6px] font-mono tracking-widest uppercase px-1 py-0.5 rounded shrink-0"
                      style={{
                        color: RISK_COLORS[op.riskLevel],
                        border: `1px solid ${RISK_COLORS[op.riskLevel]}30`,
                        background: `${RISK_COLORS[op.riskLevel]}10`,
                      }}
                    >
                      {op.riskLevel}
                    </span>
                  </div>

                  {/* Effects preview */}
                  <div className="flex flex-wrap gap-1.5 mt-1 mb-1.5">
                    {op.effects.followers && (
                      <span className="text-[6px] font-mono text-[#a78bfa]">
                        +{op.effects.followers} followers
                      </span>
                    )}
                    {op.effects.power && (
                      <span className="text-[6px] font-mono text-[#a78bfa]">
                        +{op.effects.power} power
                      </span>
                    )}
                    {op.effects.heat ? (
                      <span
                        className={`text-[6px] font-mono ${
                          op.effects.heat > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'
                        }`}
                      >
                        {op.effects.heat > 0 ? '+' : ''}
                        {op.effects.heat} heat
                      </span>
                    ) : null}
                    {op.effects.governance ? (
                      <span
                        className={`text-[6px] font-mono ${
                          op.effects.governance < 0 ? 'text-[#ef4444]' : 'text-[#10b981]'
                        }`}
                      >
                        {op.effects.governance > 0 ? '+' : ''}
                        {op.effects.governance} gov
                      </span>
                    ) : null}
                  </div>

                  {isActive ? (
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={op.duration - (activeEntry.completesAt - gameTick)}
                        max={op.duration}
                        color="#f59e0b"
                      />
                      <span className="text-[6px] font-mono text-[#f59e0b] shrink-0">
                        {fmtGameTime(activeEntry.completesAt - gameTick)} left
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMediaOp(op)}
                      disabled={!canAfford}
                      className={`w-full text-center text-[7px] font-mono tracking-wider uppercase py-1 rounded border transition-all ${
                        canAfford
                          ? 'border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20'
                          : 'border-tactical-border/30 text-tactical-text/20 cursor-not-allowed'
                      }`}
                    >
                      Launch — {fmt(op.cost)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ─── TIER 3+: Super PAC ────────────────────────────────────── */}
      {politicalTier >= 3 && (
        <Section title="Super PAC" titleColor="text-[#f59e0b]">
          <div className="text-[8px] font-mono text-tactical-text/40 mb-2">
            Total contributions: {fmt(superPacContributions)}
          </div>

          <div className="flex gap-1.5 mb-2">
            {[10_000, 50_000, 100_000].map((amount) => {
              const canAfford = companyBalance >= amount;
              return (
                <button
                  key={amount}
                  onClick={() => contributeToPac(amount)}
                  disabled={!canAfford}
                  className={`flex-1 text-center text-[7px] font-mono tracking-wider uppercase py-1 rounded border transition-colors ${
                    canAfford
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'border-tactical-border/30 text-tactical-text/20 cursor-not-allowed'
                  }`}
                >
                  {fmt(amount)}
                </button>
              );
            })}
          </div>

          {/* PAC Goals progress */}
          <div className="space-y-1.5">
            {SUPER_PAC_GOALS.map((goal) => {
              const funded = Math.min(superPacContributions, goal.target);
              const complete = funded >= goal.target;
              return (
                <div key={goal.id} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span
                      className={`text-[8px] font-mono ${
                        complete ? 'text-emerald-400' : 'text-tactical-text/50'
                      }`}
                    >
                      {complete ? '\u2713' : '\u25CB'} {goal.label}
                    </span>
                    <span className="text-[7px] font-mono text-tactical-text/25">
                      {fmt(funded)} / {fmt(goal.target)}
                    </span>
                  </div>
                  <ProgressBar
                    value={funded}
                    max={goal.target}
                    color={complete ? '#10b981' : '#a78bfa'}
                  />
                  <div className="text-[6px] font-mono text-tactical-text/20">
                    {goal.effectDescription}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ─── TIER 3+: Election Influence ───────────────────────────── */}
      {politicalTier >= 3 && availableElections.length > 0 && (
        <Section title="Election Influence" titleColor="text-[#ef4444]">
          <div className="space-y-1.5">
            {availableElections.map((action) => {
              const canAfford = companyBalance >= action.cost;
              const result = electionResults?.id === action.id ? electionResults : null;

              return (
                <div
                  key={action.id}
                  className={`p-2 rounded border transition-all duration-500 ${
                    result?.success === true
                      ? 'border-emerald-400/40 bg-emerald-400/5'
                      : result?.success === false
                        ? 'border-[#ef4444]/40 bg-[#ef4444]/5'
                        : 'border-tactical-border bg-tactical-border/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 mr-2">
                      <div className="text-[9px] font-mono text-tactical-text font-bold">
                        {action.name}
                      </div>
                      <div className="text-[7px] font-mono text-tactical-text/30 mt-0.5">
                        {action.description}
                      </div>
                    </div>
                    <span className="text-[7px] font-mono text-tactical-text/30 shrink-0">
                      {Math.round(action.successRate * 100)}%
                    </span>
                  </div>

                  {/* Effects / Consequences */}
                  <div className="flex flex-wrap gap-1.5 mt-1 mb-1">
                    {action.effects.power && (
                      <span className="text-[6px] font-mono text-[#a78bfa]">
                        +{action.effects.power} power
                      </span>
                    )}
                    {action.effects.heat ? (
                      <span className="text-[6px] font-mono text-[#ef4444]">
                        +{action.effects.heat} heat
                      </span>
                    ) : null}
                    {action.effects.governance ? (
                      <span className="text-[6px] font-mono text-[#ef4444]">
                        {action.effects.governance} gov
                      </span>
                    ) : null}
                  </div>

                  <div className="text-[6px] font-mono text-[#ef4444]/40 mb-1.5">
                    Fail: {action.consequence}
                  </div>

                  {result ? (
                    <div
                      className={`text-center text-[7px] font-mono font-bold py-1 rounded ${
                        result.success ? 'text-emerald-400' : 'text-[#ef4444]'
                      }`}
                    >
                      {result.success ? '\u2713 SUCCESS' : '\u2717 FAILED'} — {result.message}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleElectionAction(action)}
                      disabled={!canAfford}
                      className={`w-full text-center text-[7px] font-mono tracking-wider uppercase py-1 rounded border transition-all ${
                        canAfford
                          ? 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20'
                          : 'border-tactical-border/30 text-tactical-text/20 cursor-not-allowed'
                      }`}
                    >
                      Execute — {fmt(action.cost)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ─── TIER 4: Regulatory Capture ────────────────────────────── */}
      {politicalTier >= 4 && (
        <Section title="Regulatory Capture" titleColor="text-rose-400">
          <div className="space-y-1.5">
            {CAPTURE_ACTIONS.map((action) => {
              const canAfford = companyBalance >= action.cost;
              return (
                <div
                  key={action.id}
                  className="p-2 rounded border border-tactical-border bg-tactical-border/30"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-tactical-text">{action.label}</span>
                    <span className="text-[8px] font-mono text-tactical-text/30">
                      {fmt(action.cost)}
                    </span>
                  </div>
                  <div className="text-[7px] font-mono text-tactical-text/25 mt-0.5 mb-1.5">
                    {action.effectDescription} | {action.durationDays}d duration
                  </div>
                  <button
                    disabled={!canAfford}
                    className={`w-full text-center text-[7px] font-mono tracking-wider uppercase py-1 rounded border transition-all ${
                      canAfford
                        ? 'border-rose-400/30 bg-rose-400/10 text-rose-400 hover:bg-rose-400/20'
                        : 'border-tactical-border/30 text-tactical-text/20 cursor-not-allowed'
                    }`}
                  >
                    Capture — {fmt(action.cost)}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ─── Regulatory History ────────────────────────────────────── */}
      {regulatoryHistory.length > 0 && (
        <Section title="Regulatory History" titleColor="text-tactical-text">
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {regulatoryHistory
              .slice(-10)
              .reverse()
              .map((entry, i) => (
                <div
                  key={i}
                  className="flex justify-between text-[7px] font-mono text-tactical-text/30"
                >
                  <span>{entry.eventId}</span>
                  <span>Choice #{entry.choiceIndex + 1}</span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* ─── Locked State for Low Tiers ────────────────────────────── */}
      {politicalTier < 1 && (
        <div className="border border-tactical-border/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-tactical-text/20 mb-1">Locked</div>
          <div className="text-[8px] font-mono text-tactical-text/15">
            Reach Donor tier (100 XP) to unlock Campaign Donations
          </div>
        </div>
      )}
    </div>
  );
}
