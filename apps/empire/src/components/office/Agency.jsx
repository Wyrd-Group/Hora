import React, { useState, useMemo, useCallback } from 'react';
import { useAgentCardStore } from '../../store/agentCardStore';
import { useEmpireStore } from '../../store/empireStore';
import { getAgentById, getAgentsByRarity, AGENT_RARITY_CONFIG, OVR_WEIGHTS } from '../../data/agentCards';
import { useInterval } from '../../hooks/useInterval';

// ── Agent headcount cap scales with infrastructure ─────────────
const STRUCTURE_BONUS = {
  'Sole Trader': 0,
  'Partnership': 5,
  'Privately Held (LLC)': 15,
  'Public Company': 30,
  'Social Enterprise': 10,
  'NGO Watchdog': 8,
};

function useAgentHeadcount() {
  const structure = useEmpireStore(s => s.structure);
  const nodes = useEmpireStore(s => s.nodes);
  const projects = useEmpireStore(s => s.projects);
  return useMemo(() => {
    const ownedNodes = Object.values(nodes).filter(n => n.owner === 'player').length;
    const activeProjects = projects.filter(p => p.active).length;
    return 5 + ownedNodes + (STRUCTURE_BONUS[structure] ?? 0) + Math.floor(activeProjects / 2);
  }, [structure, nodes, projects]);
}

// ── Salary table ───────────────────────────────────────────────
const SALARY_TABLE = { Common: 50, Uncommon: 120, Rare: 300, Epic: 750, Legendary: 2000, Mythic: 5000 };
function getAgentSalary(agent, def) {
  return Math.round((SALARY_TABLE[def.rarity] ?? 50) * (1 + (agent.level - 1) * 0.10));
}

// ── Department OVR — agents have different ratings per department ─
// Each department weights stats differently, so a Trader might be 85 OVR
// in Trading but only 52 in R&D.
const DEPT_STAT_WEIGHTS = {
  executive:  { intelligence: 0.25, speed: 0.10, stealth: 0.05, loyalty: 0.20, adaptability: 0.15, influence: 0.25 },
  trading:    { intelligence: 0.20, speed: 0.30, stealth: 0.05, loyalty: 0.05, adaptability: 0.20, influence: 0.20 },
  rnd:        { intelligence: 0.35, speed: 0.15, stealth: 0.05, loyalty: 0.10, adaptability: 0.30, influence: 0.05 },
  ops:        { intelligence: 0.15, speed: 0.20, stealth: 0.10, loyalty: 0.20, adaptability: 0.25, influence: 0.10 },
  intel:      { intelligence: 0.20, speed: 0.15, stealth: 0.30, loyalty: 0.10, adaptability: 0.15, influence: 0.10 },
  lobby:      { intelligence: 0.17, speed: 0.17, stealth: 0.17, loyalty: 0.17, adaptability: 0.17, influence: 0.15 },
};

function computeDeptOVR(def, agent, deptId) {
  const weights = DEPT_STAT_WEIGHTS[deptId];
  if (!weights) return agent.currentOverallRating || 50;
  // Apply dynamic stat boosts
  const effectiveStats = { ...def.stats };
  if (agent.dynamicStatBoosts) {
    for (const [k, v] of Object.entries(agent.dynamicStatBoosts)) {
      effectiveStats[k] = Math.min(99, (effectiveStats[k] ?? 0) + (v ?? 0));
    }
  }
  let ovr = 0;
  for (const [stat, weight] of Object.entries(weights)) {
    ovr += (effectiveStats[stat] ?? 0) * weight;
  }
  return Math.min(99, Math.max(1, Math.round(ovr)));
}

const DEPT_LABELS = {
  executive: { name: 'Executive', icon: '♛', accent: '#fbbf24' },
  trading:   { name: 'Trading',   icon: '📈', accent: '#60a5fa' },
  rnd:       { name: 'R&D',       icon: '🧪', accent: '#34d399' },
  ops:       { name: 'Operations', icon: '⚙️', accent: '#f97316' },
  intel:     { name: 'Intel',     icon: '🔎', accent: '#a78bfa' },
  lobby:     { name: 'General',   icon: '🏢', accent: '#22d3ee' },
};
const DEPT_IDS = ['executive', 'trading', 'rnd', 'ops', 'intel', 'lobby'];

// ── SUBTABS ────────────────────────────────────────────────────
const SUBTABS = [
  { key: 'office', label: 'Agent Office', icon: '🏢' },
  { key: 'storage', label: 'Card Storage', icon: '📦' },
  { key: 'development', label: 'Development', icon: '📊' },
  { key: 'sbc', label: 'SBC', icon: '🤝' },
  { key: 'recruitment', label: 'Recruitment', icon: '🎓' },
  { key: 'marketplace', label: 'Marketplace', icon: '🏪' },
];

// ═══════════════════════════════════════════════════════════════
//  CARD STORAGE
// ═══════════════════════════════════════════════════════════════
function AgentCard({ agent, def, showSalary = true }) {
  const cfg = AGENT_RARITY_CONFIG[def.rarity];
  const [c1, c2, c3] = def.portraitGradient;
  const salary = getAgentSalary(agent, def);
  return (
    <div className="rounded-lg border overflow-hidden relative group" style={{ borderColor: `${cfg.color}33`, background: 'rgba(10,16,28,0.85)' }}>
      <div className="h-16 relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}, ${c2}, ${c3})` }}>
        <span className="text-2xl drop-shadow-lg">{def.iconGlyph}</span>
        <div className="absolute left-1.5 bottom-1 text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${cfg.color}30`, color: cfg.color }}>{def.rarity}</div>
      </div>
      <div className="p-2.5">
        <div className="text-[10px] font-bold font-mono truncate" style={{ color: cfg.color }}>{def.name}</div>
        <div className="text-[8px] text-white/50 font-mono mt-0.5">{def.class} • OVR {agent.currentOverallRating}</div>
        {showSalary && <div className="text-[8px] text-white/40 font-mono mt-0.5">Lv.{agent.level} • €{salary}/tick</div>}
        <div className="mt-1.5 text-[7px] font-mono">{agent.deployedTo ? <span className="text-[#10b981]">● Deployed</span> : <span className="text-white/30">○ Unassigned</span>}</div>
      </div>
    </div>
  );
}

function CardStorage() {
  const agents = useAgentCardStore(s => s.agents);
  const [openFolder, setOpenFolder] = useState(null); // null = main, 'duplicates' = dup folder
  const [sortBy, setSortBy] = useState('rarity');

  const { uniqueEntries, duplicateEntries, totalCards, uniqueCount, duplicateCount } = useMemo(() => {
    const byCardId = {};
    for (const agent of Object.values(agents)) {
      const def = getAgentById(agent.cardId);
      if (!def) continue;
      if (!byCardId[agent.cardId]) byCardId[agent.cardId] = { def, copies: [] };
      byCardId[agent.cardId].copies.push(agent);
    }

    const ro = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };
    const sorter = (a, b) => {
      if (sortBy === 'rarity') return (ro[b.def.rarity] ?? 0) - (ro[a.def.rarity] ?? 0);
      if (sortBy === 'ovr') return Math.max(...b.copies.map(c => c.currentOverallRating || 0)) - Math.max(...a.copies.map(c => c.currentOverallRating || 0));
      return a.def.name.localeCompare(b.def.name);
    };

    // Unique = best copy of each card (the one you "keep")
    const unique = Object.values(byCardId).map(g => ({
      def: g.def,
      copies: g.copies,
      best: g.copies.reduce((b, c) => (c.currentOverallRating || 0) > (b.currentOverallRating || 0) ? c : b, g.copies[0]),
    })).sort(sorter);

    // Duplicates = every extra copy beyond the first (flattened, each as its own card)
    const dupes = [];
    for (const group of Object.values(byCardId)) {
      if (group.copies.length <= 1) continue;
      // Sort copies by OVR desc, the best stays in main collection, rest go to duplicates
      const sorted = [...group.copies].sort((a, b) => (b.currentOverallRating || 0) - (a.currentOverallRating || 0));
      for (let i = 1; i < sorted.length; i++) {
        dupes.push({ def: group.def, agent: sorted[i] });
      }
    }

    return {
      uniqueEntries: unique,
      duplicateEntries: dupes,
      totalCards: Object.values(agents).length,
      uniqueCount: Object.keys(byCardId).length,
      duplicateCount: dupes.length,
    };
  }, [agents, sortBy]);

  // ── Duplicates folder view ──
  if (openFolder === 'duplicates') {
    return (
      <div className="p-4">
        <button onClick={() => setOpenFolder(null)}
          className="text-[9px] font-mono text-white/40 hover:text-white/70 mb-3 flex items-center gap-1 transition-colors">
          ← Back to Storage
        </button>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📂</span>
          <span className="text-[11px] font-bold font-mono text-[#f59e0b] uppercase tracking-[0.12em]">Duplicates</span>
          <span className="text-[9px] font-mono text-white/40">({duplicateCount} cards)</span>
        </div>
        {duplicateEntries.length === 0 ? (
          <div className="text-center py-16 text-white/40 text-[11px] font-mono">No duplicate cards. Each agent in your collection is unique.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {duplicateEntries.map(({ def, agent }) => (
              <AgentCard key={agent.mintId} agent={agent} def={def} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Main collection view ──
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-[10px] text-white/60 font-mono">
          <span>Total: <span className="text-[#00e5ff] font-bold">{totalCards}</span></span>
          <span>Unique: <span className="text-[#a78bfa] font-bold">{uniqueCount}</span></span>
          <span>In Duplicates: <span className="text-[#f59e0b] font-bold">{duplicateCount}</span></span>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#0d1526] border border-white/10 rounded px-2 py-1 text-[9px] text-white/70 font-mono">
          <option value="rarity">Sort: Rarity</option>
          <option value="ovr">Sort: OVR</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Duplicates folder */}
      <button onClick={() => setOpenFolder('duplicates')}
        className="w-full mb-4 rounded-lg border p-3 flex items-center gap-3 text-left transition-all hover:border-[#f59e0b]/30 hover:bg-[#f59e0b]/[0.03]"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,16,28,0.6)' }}>
        <span className="text-2xl">📂</span>
        <div className="flex-1">
          <div className="text-[10px] font-bold font-mono text-[#f59e0b] uppercase tracking-[0.1em]">Duplicates</div>
          <div className="text-[8px] text-white/40 font-mono">{duplicateCount} duplicate card{duplicateCount !== 1 ? 's' : ''} — extra copies stored here</div>
        </div>
        <div className="text-[9px] font-mono text-white/30">→</div>
      </button>

      {/* Main collection grid — one card per unique agent */}
      {uniqueEntries.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-[11px] font-mono">No agent cards in storage. Open packs to acquire agents.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {uniqueEntries.map(({ def, best }) => (
            <AgentCard key={def.id} agent={best} def={def} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DEVELOPMENT — per-agent training, dept ratings, task assignment
// ═══════════════════════════════════════════════════════════════
function DevelopmentPanel() {
  const agents = useAgentCardStore(s => s.agents);
  const setDevelopmentPlan = useAgentCardStore(s => s.setDevelopmentPlan);
  const applyStatBoost = useAgentCardStore(s => s.applyStatBoost);
  const companyBalance = useEmpireStore(s => s.companyBalance);
  const setCompanyBalance = useEmpireStore(s => s.setCompanyBalance);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [trainingStat, setTrainingStat] = useState('intelligence');
  const [trainingIntensity, setTrainingIntensity] = useState('moderate');

  const agentList = useMemo(() => {
    return Object.values(agents).map(a => {
      const def = getAgentById(a.cardId);
      return def ? { agent: a, def } : null;
    }).filter(Boolean).sort((a, b) => (b.agent.currentOverallRating || 0) - (a.agent.currentOverallRating || 0));
  }, [agents]);

  const selected = selectedAgent ? agentList.find(e => e.agent.mintId === selectedAgent) : null;

  const TRAINING_COSTS = { light: 2000, moderate: 5000, intense: 12000 };
  const TRAINING_BOOST = { light: 1, moderate: 2, intense: 4 };
  const STAT_LABELS = [
    { key: 'intelligence', label: 'INT', color: '#60a5fa' },
    { key: 'speed', label: 'SPD', color: '#34d399' },
    { key: 'stealth', label: 'STL', color: '#a78bfa' },
    { key: 'loyalty', label: 'LOY', color: '#fbbf24' },
    { key: 'adaptability', label: 'ADP', color: '#f97316' },
    { key: 'influence', label: 'INF', color: '#ec4899' },
  ];

  const handleTrain = () => {
    if (!selected) return;
    const cost = TRAINING_COSTS[trainingIntensity];
    if (companyBalance < cost) return;
    setCompanyBalance(companyBalance - cost);
    applyStatBoost(selected.agent.mintId, trainingStat, TRAINING_BOOST[trainingIntensity]);
  };

  return (
    <div className="p-4 flex gap-4" style={{ minHeight: 400 }}>
      {/* Agent roster — left side */}
      <div className="w-64 shrink-0 border border-white/10 rounded-lg bg-[#0b1221] overflow-y-auto" style={{ maxHeight: '60vh' }}>
        <div className="px-3 py-2 border-b border-white/10 text-[9px] text-white/50 font-mono uppercase tracking-[0.14em]">Select Agent</div>
        {agentList.map(({ agent, def }) => {
          const cfg = AGENT_RARITY_CONFIG[def.rarity];
          const isSel = selectedAgent === agent.mintId;
          return (
            <button key={agent.mintId} onClick={() => setSelectedAgent(agent.mintId)}
              className={`w-full text-left px-3 py-2.5 border-b border-white/5 flex items-center gap-2.5 transition-all ${isSel ? 'bg-[#00e5ff]/8' : 'hover:bg-white/[0.03]'}`}>
              <span className="text-sm">{def.iconGlyph}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono truncate" style={{ color: isSel ? '#00e5ff' : cfg.color }}>{def.name}</div>
                <div className="text-[8px] text-white/40 font-mono">OVR {agent.currentOverallRating} • Lv.{agent.level} • {def.class}</div>
              </div>
            </button>
          );
        })}
        {agentList.length === 0 && <div className="p-4 text-[10px] text-white/40 font-mono text-center">No agents yet.</div>}
      </div>

      {/* Detail panel — right side */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-[11px] text-white/30 font-mono">Select an agent to view development options</div>
        ) : (() => {
          const { agent, def } = selected;
          const cfg = AGENT_RARITY_CONFIG[def.rarity];
          const [c1, c2, c3] = def.portraitGradient;
          const effectiveStats = { ...def.stats };
          if (agent.dynamicStatBoosts) {
            for (const [k, v] of Object.entries(agent.dynamicStatBoosts)) {
              effectiveStats[k] = Math.min(99, (effectiveStats[k] ?? 0) + (v ?? 0));
            }
          }

          return (
            <div className="space-y-4">
              {/* Agent header */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-[#0b1221]">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`, border: `2px solid ${cfg.color}` }}>
                  {def.iconGlyph}
                </div>
                <div>
                  <div className="text-[12px] font-bold font-mono" style={{ color: cfg.color }}>{def.name}</div>
                  <div className="text-[9px] text-white/50 font-mono">{def.class} • {def.rarity} • OVR {agent.currentOverallRating} • Potential {agent.potentialRating}</div>
                  <div className="text-[8px] text-[#f59e0b]/70 font-mono">Salary €{getAgentSalary(agent, def)}/tick</div>
                </div>
              </div>

              {/* Stat bars */}
              <div className="rounded-lg border border-white/10 bg-[#0b1221] p-3">
                <div className="text-[9px] text-white/50 font-mono uppercase tracking-[0.14em] mb-2">Current Stats</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {STAT_LABELS.map(s => {
                    const val = effectiveStats[s.key] ?? 0;
                    const base = def.stats[s.key] ?? 0;
                    const boosted = val > base;
                    return (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="text-[8px] font-mono w-6" style={{ color: s.color }}>{s.label}</span>
                        <div className="flex-1 h-1.5 rounded bg-white/10 relative">
                          <div className="h-full rounded" style={{ width: `${val}%`, background: s.color }} />
                        </div>
                        <span className={`text-[9px] font-mono font-bold ${boosted ? 'text-[#10b981]' : 'text-white/60'}`}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department Ratings — different OVR per department */}
              <div className="rounded-lg border border-white/10 bg-[#0b1221] p-3">
                <div className="text-[9px] text-white/50 font-mono uppercase tracking-[0.14em] mb-2">Department Ratings</div>
                <div className="grid grid-cols-3 gap-2">
                  {DEPT_IDS.map(dId => {
                    const dl = DEPT_LABELS[dId];
                    const deptOvr = computeDeptOVR(def, agent, dId);
                    const isStrong = deptOvr >= 70;
                    const isWeak = deptOvr < 45;
                    return (
                      <div key={dId} className="rounded-md border p-2 text-center" style={{ borderColor: `${dl.accent}30`, background: `${dl.accent}08` }}>
                        <div className="text-[8px] font-mono uppercase tracking-[0.1em]" style={{ color: dl.accent }}>{dl.icon} {dl.name}</div>
                        <div className={`text-[14px] font-bold font-mono mt-0.5 ${isStrong ? 'text-[#10b981]' : isWeak ? 'text-[#ef4444]' : 'text-white/70'}`}>{deptOvr}</div>
                        <div className="text-[7px] font-mono mt-0.5" style={{ color: isStrong ? '#10b981' : isWeak ? '#ef4444' : 'rgba(255,255,255,0.35)' }}>
                          {isStrong ? 'Strong Fit' : isWeak ? 'Weak Fit' : 'Average'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Training module */}
              <div className="rounded-lg border border-white/10 bg-[#0b1221] p-3">
                <div className="text-[9px] text-white/50 font-mono uppercase tracking-[0.14em] mb-2">Training Programme</div>
                <div className="text-[8px] text-white/40 font-mono mb-3">Invest in targeted training to boost specific stats and make agents more versatile across departments.</div>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="text-[8px] text-white/40 font-mono uppercase block mb-1">Focus Stat</label>
                    <select value={trainingStat} onChange={e => setTrainingStat(e.target.value)}
                      className="bg-[#111827] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/80 font-mono">
                      {STAT_LABELS.map(s => <option key={s.key} value={s.key}>{s.label} — {s.key}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] text-white/40 font-mono uppercase block mb-1">Intensity</label>
                    <select value={trainingIntensity} onChange={e => setTrainingIntensity(e.target.value)}
                      className="bg-[#111827] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/80 font-mono">
                      <option value="light">Light (+{TRAINING_BOOST.light}) — €{TRAINING_COSTS.light.toLocaleString()}</option>
                      <option value="moderate">Moderate (+{TRAINING_BOOST.moderate}) — €{TRAINING_COSTS.moderate.toLocaleString()}</option>
                      <option value="intense">Intense (+{TRAINING_BOOST.intense}) — €{TRAINING_COSTS.intense.toLocaleString()}</option>
                    </select>
                  </div>
                  <button onClick={handleTrain} disabled={companyBalance < TRAINING_COSTS[trainingIntensity]}
                    className="px-4 py-1.5 rounded text-[9px] font-mono uppercase tracking-[0.1em] bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    Train — €{TRAINING_COSTS[trainingIntensity].toLocaleString()}
                  </button>
                </div>
                {agent.developmentPlan && (
                  <div className="mt-3 text-[8px] font-mono text-[#a78bfa]">
                    Active plan: {agent.developmentPlan.focusStats?.join(', ')} ({agent.developmentPlan.intensity})
                  </div>
                )}
              </div>

              {/* Role Reassignment */}
              <div className="rounded-lg border border-white/10 bg-[#0b1221] p-3">
                <div className="text-[9px] text-white/50 font-mono uppercase tracking-[0.14em] mb-2">Position & Role</div>
                <div className="text-[8px] text-white/40 font-mono mb-2">Current class: <span className="text-white/70">{def.class}</span>. Deploy to different departments to gain experience in new areas.</div>
                <div className="text-[8px] text-white/40 font-mono">
                  {agent.deployedTo ? (
                    <span>Currently deployed to: <span className="text-[#00e5ff]">{agent.deployedTo}</span></span>
                  ) : (
                    <span className="text-white/30">Not deployed — assign from the Agent Office tab.</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SBC — Squad Builder Contracts (build team for client, sell it)
// ═══════════════════════════════════════════════════════════════

const CLIENT_CONTRACTS = [
  {
    id: 'sbc-fintech-startup',
    client: 'NovaPay Fintech',
    brief: 'Early-stage fintech needs a lean squad: 1 Trader, 1 Coder, and 1 Analyst to build an algorithmic trading desk.',
    slots: [
      { role: 'Trader', minOVR: 55, filled: null },
      { role: 'Coder', minOVR: 50, filled: null },
      { role: 'Analyst', minOVR: 50, filled: null },
    ],
    payout: 25000,
    xpReward: 500,
    difficulty: 'Starter',
    diffColor: '#34d399',
  },
  {
    id: 'sbc-hedge-fund',
    client: 'Citadel Sigma Capital',
    brief: 'Aggressive hedge fund needs: 2 Traders (OVR 65+), 1 Researcher, and 1 Infiltrator for market intelligence.',
    slots: [
      { role: 'Trader', minOVR: 65, filled: null },
      { role: 'Trader', minOVR: 65, filled: null },
      { role: 'Researcher', minOVR: 60, filled: null },
      { role: 'Infiltrator', minOVR: 55, filled: null },
    ],
    payout: 75000,
    xpReward: 1200,
    difficulty: 'Professional',
    diffColor: '#60a5fa',
  },
  {
    id: 'sbc-corp-restructure',
    client: 'Meridian Holdings',
    brief: 'Conglomerate restructuring: needs Orchestrator (70+), 2 Analysts, a Navigator, and a Social agent for PR.',
    slots: [
      { role: 'Orchestrator', minOVR: 70, filled: null },
      { role: 'Analyst', minOVR: 60, filled: null },
      { role: 'Analyst', minOVR: 55, filled: null },
      { role: 'Navigator', minOVR: 55, filled: null },
      { role: 'Social', minOVR: 60, filled: null },
    ],
    payout: 150000,
    xpReward: 2500,
    difficulty: 'Enterprise',
    diffColor: '#a78bfa',
  },
  {
    id: 'sbc-gov-security',
    client: 'Ministry of Digital Affairs',
    brief: 'Government cybersecurity contract: 2 Infiltrators (75+), 1 Specialist, 1 Autonomous agent, and 1 Coder.',
    slots: [
      { role: 'Infiltrator', minOVR: 75, filled: null },
      { role: 'Infiltrator', minOVR: 70, filled: null },
      { role: 'Specialist', minOVR: 65, filled: null },
      { role: 'Autonomous', minOVR: 70, filled: null },
      { role: 'Coder', minOVR: 65, filled: null },
    ],
    payout: 350000,
    xpReward: 5000,
    difficulty: 'Elite',
    diffColor: '#fbbf24',
  },
  {
    id: 'sbc-media-empire',
    client: 'GlobalView Media Group',
    brief: 'Media takeover squad: 2 Social agents (70+), 1 Analyst, 1 Orchestrator, 1 Researcher for content strategy.',
    slots: [
      { role: 'Social', minOVR: 70, filled: null },
      { role: 'Social', minOVR: 65, filled: null },
      { role: 'Analyst', minOVR: 60, filled: null },
      { role: 'Orchestrator', minOVR: 65, filled: null },
      { role: 'Researcher', minOVR: 60, filled: null },
    ],
    payout: 200000,
    xpReward: 3500,
    difficulty: 'Professional',
    diffColor: '#60a5fa',
  },
];

function SBCPanel() {
  const agents = useAgentCardStore(s => s.agents);
  const companyBalance = useEmpireStore(s => s.companyBalance);
  const setCompanyBalance = useEmpireStore(s => s.setCompanyBalance);
  const [selectedContract, setSelectedContract] = useState(null);
  const [slotAssignments, setSlotAssignments] = useState({});
  const [completedContracts, setCompletedContracts] = useState([]);
  const [toast, setToast] = useState(null);

  const availableAgents = useMemo(() => {
    return Object.values(agents).filter(a => !a.deployedTo && !a.isLocked).map(a => {
      const def = getAgentById(a.cardId);
      return def ? { agent: a, def } : null;
    }).filter(Boolean);
  }, [agents]);

  const contract = selectedContract ? CLIENT_CONTRACTS.find(c => c.id === selectedContract) : null;

  const handleAssignSlot = (slotIdx, mintId) => {
    setSlotAssignments(prev => ({ ...prev, [slotIdx]: mintId }));
  };

  const handleSubmit = () => {
    if (!contract) return;
    // Validate all slots filled and meet requirements
    for (let i = 0; i < contract.slots.length; i++) {
      const mintId = slotAssignments[i];
      if (!mintId) { setToast({ msg: `Slot ${i + 1} not filled`, type: 'error' }); setTimeout(() => setToast(null), 2000); return; }
      const agent = agents[mintId];
      const def = agent ? getAgentById(agent.cardId) : null;
      if (!def || def.class !== contract.slots[i].role) { setToast({ msg: `Slot ${i + 1}: needs a ${contract.slots[i].role}`, type: 'error' }); setTimeout(() => setToast(null), 2000); return; }
      if ((agent.currentOverallRating || 0) < contract.slots[i].minOVR) { setToast({ msg: `Slot ${i + 1}: OVR ${agent.currentOverallRating} below minimum ${contract.slots[i].minOVR}`, type: 'error' }); setTimeout(() => setToast(null), 2000); return; }
    }
    // Success — payout and remove agents (sold to client)
    setCompanyBalance(companyBalance + contract.payout);
    // Remove agents from store by quick-selling (they're transferred to the client)
    const quickSell = useAgentCardStore.getState().quickSellAgent;
    for (const mintId of Object.values(slotAssignments)) {
      if (mintId) quickSell(mintId);
    }
    setCompletedContracts(prev => [...prev, contract.id]);
    setSlotAssignments({});
    setSelectedContract(null);
    setToast({ msg: `Contract completed! +€${contract.payout.toLocaleString()} from ${contract.client}`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-4">
      {toast && (
        <div className="mb-4 px-4 py-2.5 rounded-md text-[11px] font-semibold font-mono"
          style={{ background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: toast.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${toast.type === 'error' ? '#ef444440' : '#10b98140'}` }}>
          {toast.msg}
        </div>
      )}

      <div className="text-[10px] text-white/55 font-mono mb-4 leading-relaxed">
        Squad Builder Contracts — Real clients need real teams. Assemble a squad that meets the client brief,
        then sell the entire team to the contracting company. Your agents are transferred to the client on completion.
      </div>

      {!selectedContract ? (
        <div className="grid gap-3 md:grid-cols-2">
          {CLIENT_CONTRACTS.map(c => {
            const done = completedContracts.includes(c.id);
            return (
              <button key={c.id} onClick={() => !done && setSelectedContract(c.id)} disabled={done}
                className={`rounded-lg border p-4 text-left transition-all ${done ? 'opacity-40' : 'hover:border-white/20 cursor-pointer'}`}
                style={{ borderColor: `${c.diffColor}25`, background: 'rgba(10,16,28,0.85)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold font-mono" style={{ color: c.diffColor }}>{c.client}</span>
                  <span className="text-[7px] font-mono px-2 py-0.5 rounded-full uppercase tracking-[0.1em]" style={{ background: `${c.diffColor}18`, color: c.diffColor }}>
                    {c.difficulty}
                  </span>
                </div>
                <p className="text-[9px] text-white/55 font-mono leading-relaxed mb-2">{c.brief}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {c.slots.map((s, i) => (
                      <span key={i} className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">{s.role} {s.minOVR}+</span>
                    ))}
                  </div>
                  <span className="text-[11px] font-bold font-mono text-[#10b981]">€{c.payout.toLocaleString()}</span>
                </div>
                {done && <div className="mt-2 text-[8px] font-mono text-[#10b981] uppercase">✓ Completed</div>}
              </button>
            );
          })}
        </div>
      ) : contract && (
        <div>
          <button onClick={() => { setSelectedContract(null); setSlotAssignments({}); }}
            className="text-[9px] font-mono text-white/40 hover:text-white/70 mb-3 flex items-center gap-1 transition-colors">
            ← Back to contracts
          </button>
          <div className="rounded-lg border p-4 mb-4" style={{ borderColor: `${contract.diffColor}30`, background: 'rgba(10,16,28,0.85)' }}>
            <div className="text-[12px] font-bold font-mono mb-1" style={{ color: contract.diffColor }}>{contract.client}</div>
            <p className="text-[9px] text-white/55 font-mono leading-relaxed mb-3">{contract.brief}</p>
            <div className="text-[10px] font-mono text-[#10b981] mb-4">Contract value: €{contract.payout.toLocaleString()}</div>

            {/* Slot assignment */}
            <div className="space-y-3">
              {contract.slots.map((slot, idx) => {
                const assignedMintId = slotAssignments[idx];
                const assignedAgent = assignedMintId ? agents[assignedMintId] : null;
                const assignedDef = assignedAgent ? getAgentById(assignedAgent.cardId) : null;
                const matchingAgents = availableAgents.filter(a =>
                  a.def.class === slot.role && !Object.values(slotAssignments).includes(a.agent.mintId)
                );

                return (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/10 bg-[#0d1526]">
                    <div className="w-20 shrink-0">
                      <div className="text-[9px] font-mono font-bold text-white/70">{slot.role}</div>
                      <div className="text-[7px] font-mono text-white/40">OVR {slot.minOVR}+</div>
                    </div>
                    {assignedDef ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm">{assignedDef.iconGlyph}</span>
                        <div>
                          <div className="text-[10px] font-mono" style={{ color: AGENT_RARITY_CONFIG[assignedDef.rarity].color }}>{assignedDef.name}</div>
                          <div className="text-[8px] font-mono text-white/50">OVR {assignedAgent.currentOverallRating}</div>
                        </div>
                        <button onClick={() => handleAssignSlot(idx, null)} className="ml-auto text-[8px] text-[#ef4444]/70 font-mono hover:text-[#ef4444]">Remove</button>
                      </div>
                    ) : (
                      <select onChange={e => e.target.value && handleAssignSlot(idx, e.target.value)} value=""
                        className="flex-1 bg-[#111827] border border-white/10 rounded px-2 py-1.5 text-[9px] text-white/60 font-mono">
                        <option value="">— Select {slot.role} —</option>
                        {matchingAgents.map(a => (
                          <option key={a.agent.mintId} value={a.agent.mintId}>
                            {a.def.name} (OVR {a.agent.currentOverallRating})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={handleSubmit}
              className="mt-4 w-full py-2.5 rounded-lg text-[10px] font-mono uppercase tracking-[0.15em] font-bold bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/25 transition-all">
              Submit Squad — Receive €{contract.payout.toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  RECRUITMENT — Student Societies & University Partnerships
// ═══════════════════════════════════════════════════════════════

const UNIVERSITY_SOCIETIES = [
  {
    id: 'soc-finance',
    name: 'Finance Society',
    university: 'London School of Economics',
    desc: 'Premier finance talent pipeline. Produces Traders, Analysts, and future fund managers.',
    agentClasses: ['Trader', 'Analyst'],
    minRarity: 'Common',
    maxRarity: 'Rare',
    scoutCost: 5000,
    scoutTime: 3,
    accent: '#60a5fa',
    icon: '📊',
  },
  {
    id: 'soc-tech',
    name: 'Computer Science Society',
    university: 'MIT',
    desc: 'Top-tier engineering recruits. Specializes in Coders and Autonomous agents.',
    agentClasses: ['Coder', 'Autonomous'],
    minRarity: 'Common',
    maxRarity: 'Epic',
    scoutCost: 8000,
    scoutTime: 4,
    accent: '#34d399',
    icon: '💻',
  },
  {
    id: 'soc-intelligence',
    name: 'Intelligence & Security Club',
    university: 'Georgetown University',
    desc: 'Future spooks and analysts. Produces Infiltrators and Specialists.',
    agentClasses: ['Infiltrator', 'Specialist'],
    minRarity: 'Uncommon',
    maxRarity: 'Rare',
    scoutCost: 10000,
    scoutTime: 5,
    accent: '#a78bfa',
    icon: '🕵️',
  },
  {
    id: 'soc-consulting',
    name: 'Consulting Society',
    university: 'INSEAD',
    desc: 'Business strategists and project managers. Produces Orchestrators and Navigators.',
    agentClasses: ['Orchestrator', 'Navigator'],
    minRarity: 'Common',
    maxRarity: 'Rare',
    scoutCost: 7000,
    scoutTime: 4,
    accent: '#f97316',
    icon: '🎯',
  },
  {
    id: 'soc-media',
    name: 'Media & Communications Society',
    university: 'Columbia University',
    desc: 'Future PR leads and influencers. Produces Social agents and Scouts.',
    agentClasses: ['Social', 'Scout'],
    minRarity: 'Common',
    maxRarity: 'Rare',
    scoutCost: 6000,
    scoutTime: 3,
    accent: '#ec4899',
    icon: '📢',
  },
  {
    id: 'soc-research',
    name: 'Research & Innovation Lab',
    university: 'ETH Zurich',
    desc: 'Deep research talent. Produces Researchers and specialist data scientists.',
    agentClasses: ['Researcher', 'Analyst'],
    minRarity: 'Uncommon',
    maxRarity: 'Epic',
    scoutCost: 12000,
    scoutTime: 6,
    accent: '#fbbf24',
    icon: '🔬',
  },
  {
    id: 'soc-recruitment',
    name: 'Careers & Recruitment Network',
    university: 'University of Oxford',
    desc: 'Meta-recruiters who find other recruiters. Produces Jobhunters and Scouts.',
    agentClasses: ['Jobhunter', 'Scout'],
    minRarity: 'Common',
    maxRarity: 'Rare',
    scoutCost: 4000,
    scoutTime: 2,
    accent: '#22d3ee',
    icon: '🎓',
  },
];

function RecruitmentPanel() {
  const companyBalance = useEmpireStore(s => s.companyBalance);
  const setCompanyBalance = useEmpireStore(s => s.setCompanyBalance);
  const mintAgent = useAgentCardStore(s => s.mintAgent);
  const [activeScouts, setActiveScouts] = useState({}); // socId -> { startedAt, endsAt }
  const [results, setResults] = useState([]); // { socId, agentName, rarity }
  const [toast, setToast] = useState(null);

  const handleScout = (soc) => {
    if (companyBalance < soc.scoutCost) {
      setToast({ msg: `Need €${(soc.scoutCost - companyBalance).toLocaleString()} more`, type: 'error' });
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setCompanyBalance(companyBalance - soc.scoutCost);
    const now = Date.now();
    setActiveScouts(prev => ({ ...prev, [soc.id]: { startedAt: now, endsAt: now + soc.scoutTime * 1000 } }));

    // Simulate scouting result after timer
    setTimeout(() => {
      // Pick random class from society
      const cls = soc.agentClasses[Math.floor(Math.random() * soc.agentClasses.length)];
      // Pick rarity between min and max
      const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
      const minIdx = rarities.indexOf(soc.minRarity);
      const maxIdx = rarities.indexOf(soc.maxRarity);
      // Weighted toward lower rarities
      const roll = Math.random();
      let rarityIdx = minIdx;
      if (roll > 0.95 && maxIdx >= minIdx + 3) rarityIdx = minIdx + 3;
      else if (roll > 0.85 && maxIdx >= minIdx + 2) rarityIdx = minIdx + 2;
      else if (roll > 0.60 && maxIdx >= minIdx + 1) rarityIdx = minIdx + 1;
      const rarity = rarities[Math.min(rarityIdx, maxIdx)];

      // Find a matching agent from catalog
      const pool = getAgentsByRarity(rarity).filter(a => a.class === cls);
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const minted = useAgentCardStore.getState().mintAgent(pick.id);
        if (minted) {
          setResults(prev => [{ socId: soc.id, agentName: pick.name, rarity: pick.rarity, cls: pick.class }, ...prev].slice(0, 10));
          setToast({ msg: `Recruited ${pick.name} (${pick.rarity} ${pick.class}) from ${soc.university}!`, type: 'success' });
          setTimeout(() => setToast(null), 3000);
        }
      }
      setActiveScouts(prev => { const n = { ...prev }; delete n[soc.id]; return n; });
    }, soc.scoutTime * 1000);
  };

  return (
    <div className="p-4">
      {toast && (
        <div className="mb-4 px-4 py-2.5 rounded-md text-[11px] font-semibold font-mono"
          style={{ background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: toast.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${toast.type === 'error' ? '#ef444440' : '#10b98140'}` }}>
          {toast.msg}
        </div>
      )}

      <div className="text-[10px] text-white/55 font-mono mb-4 leading-relaxed">
        University Partnerships — Scout student societies for fresh talent. Each society specializes in different agent classes.
        Better universities yield higher-rarity recruits but cost more and take longer to scout.
      </div>

      {/* Recent recruits */}
      {results.length > 0 && (
        <div className="mb-4 rounded-lg border border-white/10 bg-[#0b1221] p-3">
          <div className="text-[8px] text-white/40 font-mono uppercase tracking-[0.14em] mb-2">Recent Recruits</div>
          <div className="flex gap-2 flex-wrap">
            {results.map((r, i) => (
              <span key={i} className="text-[8px] font-mono px-2 py-1 rounded-full border"
                style={{ borderColor: `${AGENT_RARITY_CONFIG[r.rarity]?.color}40`, color: AGENT_RARITY_CONFIG[r.rarity]?.color, background: `${AGENT_RARITY_CONFIG[r.rarity]?.color}10` }}>
                {r.agentName} ({r.rarity})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Societies grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {UNIVERSITY_SOCIETIES.map(soc => {
          const isScouting = !!activeScouts[soc.id];
          const canAfford = companyBalance >= soc.scoutCost;
          return (
            <div key={soc.id} className="rounded-lg border p-4" style={{ borderColor: `${soc.accent}25`, background: 'rgba(10,16,28,0.85)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{soc.icon}</span>
                <div>
                  <div className="text-[11px] font-bold font-mono" style={{ color: soc.accent }}>{soc.name}</div>
                  <div className="text-[8px] text-white/40 font-mono">{soc.university}</div>
                </div>
              </div>
              <p className="text-[8px] text-white/50 font-mono leading-relaxed mb-2">{soc.desc}</p>
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {soc.agentClasses.map(c => (
                  <span key={c} className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">{c}</span>
                ))}
                <span className="text-[7px] font-mono px-1.5 py-0.5 rounded text-white/30" style={{ background: `${soc.accent}10`, borderColor: `${soc.accent}20` }}>
                  {soc.minRarity}—{soc.maxRarity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-white/40">€{soc.scoutCost.toLocaleString()} • {soc.scoutTime}s</span>
                <button onClick={() => handleScout(soc)} disabled={isScouting || !canAfford}
                  className={`px-3 py-1.5 rounded text-[9px] font-mono uppercase tracking-[0.1em] border transition-all ${
                    isScouting ? 'border-[#f59e0b]/40 text-[#f59e0b] bg-[#f59e0b]/10 animate-pulse' :
                    canAfford ? 'border-[#00e5ff]/40 text-[#00e5ff] bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20' :
                    'border-white/10 text-white/30 cursor-not-allowed'
                  }`}>
                  {isScouting ? 'Scouting...' : 'Scout'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MARKETPLACE
// ═══════════════════════════════════════════════════════════════
function AgentMarketplace() {
  const listings = useAgentCardStore(s => s.listings);
  const agents = useAgentCardStore(s => s.agents);
  const listAgent = useAgentCardStore(s => s.listAgent);
  const buyAgent = useAgentCardStore(s => s.buyAgent);
  const [listingPrice, setListingPrice] = useState('');
  const [selectedForSale, setSelectedForSale] = useState(null);
  const [tab, setTab] = useState('browse');

  const undeployedAgents = useMemo(() => {
    return Object.values(agents).filter(a => !a.deployedTo && !a.isLocked).map(a => {
      const def = getAgentById(a.cardId);
      return def ? { agent: a, def } : null;
    }).filter(Boolean);
  }, [agents]);

  const enrichedListings = useMemo(() => {
    return listings.map(l => {
      const agent = agents[l.mintId];
      const def = agent ? getAgentById(agent.cardId) : null;
      return { listing: l, agent, def };
    }).filter(e => e.def);
  }, [listings, agents]);

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        {['browse', 'sell'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-[9px] font-mono uppercase tracking-[0.12em] border transition-all ${
              tab === t ? 'border-[#00e5ff]/50 text-[#00e5ff] bg-[#00e5ff]/10' : 'border-white/10 text-white/40 hover:text-white/60'
            }`}>{t === 'browse' ? '🏪 Browse' : '💰 List Agents'}</button>
        ))}
      </div>
      {tab === 'browse' && (
        enrichedListings.length === 0 ? (
          <div className="text-center py-16 text-white/40 text-[11px] font-mono">No agents listed on the marketplace yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {enrichedListings.map(({ listing, agent, def }) => {
              const cfg = AGENT_RARITY_CONFIG[def.rarity];
              const [c1, c2, c3] = def.portraitGradient;
              return (
                <div key={listing.id} className="rounded-lg border overflow-hidden" style={{ borderColor: `${cfg.color}33`, background: 'rgba(10,16,28,0.85)' }}>
                  <div className="h-14 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}, ${c2}, ${c3})` }}><span className="text-xl">{def.iconGlyph}</span></div>
                  <div className="p-2.5">
                    <div className="text-[10px] font-bold font-mono truncate" style={{ color: cfg.color }}>{def.name}</div>
                    <div className="text-[8px] text-white/50 font-mono">OVR {agent.currentOverallRating} • Lv.{agent.level}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] font-bold font-mono text-[#f59e0b]">€{listing.price.toLocaleString()}</span>
                      <button onClick={() => buyAgent(listing.id)} className="px-2 py-1 rounded text-[8px] font-mono uppercase bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/25 transition-all">Buy</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
      {tab === 'sell' && (
        <div>
          <div className="text-[9px] text-white/50 font-mono mb-3">Select an undeployed, unlocked agent to list for sale.</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {undeployedAgents.map(({ agent, def }) => {
              const cfg = AGENT_RARITY_CONFIG[def.rarity];
              const isSel = selectedForSale === agent.mintId;
              return (
                <button key={agent.mintId} onClick={() => setSelectedForSale(isSel ? null : agent.mintId)}
                  className="rounded-lg border p-2.5 text-left transition-all"
                  style={{ borderColor: isSel ? `${cfg.color}88` : `${cfg.color}22`, background: isSel ? `${cfg.color}10` : 'rgba(10,16,28,0.85)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{def.iconGlyph}</span>
                    <div><div className="text-[9px] font-bold font-mono truncate" style={{ color: cfg.color }}>{def.name}</div><div className="text-[8px] text-white/50 font-mono">OVR {agent.currentOverallRating}</div></div>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedForSale && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-[#0d1526]">
              <input type="number" value={listingPrice} onChange={e => setListingPrice(e.target.value)} placeholder="Price (€)"
                className="bg-[#111827]/80 border border-white/10 rounded px-3 py-2 text-[10px] font-mono text-white w-32 focus:outline-none focus:border-[#00e5ff]/50" />
              <button onClick={() => { const p = parseInt(listingPrice); if (p > 0 && selectedForSale) { listAgent(selectedForSale, p); setSelectedForSale(null); setListingPrice(''); } }}
                disabled={!listingPrice || parseInt(listingPrice) <= 0}
                className="px-4 py-2 rounded text-[9px] font-mono uppercase tracking-[0.1em] bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                List for Sale
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PAYROLL BAR
// ═══════════════════════════════════════════════════════════════
function PayrollBar() {
  const agents = useAgentCardStore(s => s.agents);
  const headcount = useAgentHeadcount();
  const { totalPayroll, agentCount } = useMemo(() => {
    let total = 0, count = 0;
    for (const agent of Object.values(agents)) {
      const def = getAgentById(agent.cardId);
      if (!def) continue;
      total += getAgentSalary(agent, def);
      count++;
    }
    return { totalPayroll: total, agentCount: count };
  }, [agents]);
  const atCap = agentCount >= headcount;
  return (
    <div className="flex items-center gap-5 text-[10px] text-white/60 font-mono flex-wrap">
      <span>Headcount <span className={atCap ? 'text-[#ef4444] font-bold' : 'text-[#00e5ff] font-bold'}>{agentCount}/{headcount}</span></span>
      <span>Payroll <span className="text-[#f59e0b] font-bold">€{totalPayroll.toLocaleString()}/tick</span></span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  AGENT OFFICE (inline from OfficeFloor)
// ═══════════════════════════════════════════════════════════════
const FLOOR_DEFS = [
  { id: 'executive', name: 'Executive', icon: '♛', accent: '#fbbf24' },
  { id: 'trading', name: 'Trading', icon: '📈', accent: '#60a5fa' },
  { id: 'rnd', name: 'R&D', icon: '🧪', accent: '#34d399' },
  { id: 'ops', name: 'Operations', icon: '⚙️', accent: '#f97316' },
  { id: 'intel', name: 'Intelligence', icon: '🔎', accent: '#a78bfa' },
  { id: 'lobby', name: 'Main Floor', icon: '🏢', accent: '#22d3ee' },
];
const MAX_EQUIP_LEVEL = 5;
const rarityRank = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };

function mapAgentToFloor(agent, def) {
  if (!agent.deployedTo) return 'lobby';
  if (agent.deployedTo === 'office-ceo') return 'executive';
  if (agent.deployedTo === 'office-trading') return 'trading';
  if (agent.deployedTo === 'office-rnd') return 'rnd';
  if (agent.deployedTo === 'office-ops') return 'ops';
  if (agent.deployedTo === 'office-intel') return 'intel';
  if (['Trader', 'Analyst'].includes(def.class)) return 'trading';
  if (['Researcher', 'Coder'].includes(def.class)) return 'rnd';
  if (['Infiltrator', 'Specialist', 'Scout', 'Jobhunter', 'Social'].includes(def.class)) return 'intel';
  if (['Orchestrator', 'Navigator', 'Autonomous'].includes(def.class)) return 'ops';
  return 'lobby';
}
function productivityFromAgents(entries) {
  if (entries.length === 0) return 0;
  return Math.min(100, Math.round(entries.reduce((s, e) => s + (e.agent.currentOverallRating || 40), 0) / entries.length));
}
function floorMult(level) { return 1 + level * 0.12; }

const FLOOR_DEPLOY_IDS = { executive: 'office-ceo', trading: 'office-trading', rnd: 'office-rnd', ops: 'office-ops', intel: 'office-intel', lobby: null };

function OfficeFloorContent() {
  const storeAgents = useAgentCardStore(s => s.agents);
  const addXP = useAgentCardStore(s => s.addXP);
  const reassignAgent = useAgentCardStore(s => s.reassignAgent);
  const companyBalance = useEmpireStore(s => s.companyBalance);
  const setCompanyBalance = useEmpireStore(s => s.setCompanyBalance);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [cinematicState, setCinematicState] = useState('idle');
  const [toast, setToast] = useState(null);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [equipmentLevels, setEquipmentLevels] = useState({ executive: 1, trading: 1, rnd: 1, ops: 1, intel: 1, lobby: 1 });

  const resolvedAgents = useMemo(() => Object.values(storeAgents).map(a => { const d = getAgentById(a.cardId); return d ? { agent: a, def: d } : null; }).filter(Boolean).sort((a, b) => (b.agent.currentOverallRating || 0) - (a.agent.currentOverallRating || 0)), [storeAgents]);
  const floorAssignments = useMemo(() => { const m = { executive: [], trading: [], rnd: [], ops: [], intel: [], lobby: [] }; for (const e of resolvedAgents) m[mapAgentToFloor(e.agent, e.def)].push(e); return m; }, [resolvedAgents]);
  const totalOfficeLevel = useMemo(() => Object.values(equipmentLevels).reduce((a, b) => a + b, 0), [equipmentLevels]);
  const globalDevBoost = useMemo(() => { const avg = Object.values(equipmentLevels).reduce((a, b) => a + floorMult(b), 0) / 6; return `${Math.round((avg - 1) * 100)}%`; }, [equipmentLevels]);
  const avgProductivity = useMemo(() => Math.round(FLOOR_DEFS.map(f => productivityFromAgents(floorAssignments[f.id])).reduce((a, b) => a + b, 0) / 6), [floorAssignments]);

  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2000); }, []);
  const enterFloor = useCallback(id => { setCinematicState('enter'); setTimeout(() => { setSelectedFloor(id); setCinematicState('idle'); }, 320); }, []);
  const exitFloor = useCallback(() => { setCinematicState('exit'); setTimeout(() => { setSelectedFloor(null); setCinematicState('idle'); }, 260); }, []);
  const upgradeFloor = useCallback(id => {
    const cur = equipmentLevels[id];
    if (cur >= MAX_EQUIP_LEVEL) { showToast('Max level reached', 'warn'); return; }
    const cost = 25000 * cur;
    if (companyBalance < cost) { showToast(`Need €${(cost - companyBalance).toLocaleString()} more`, 'error'); return; }
    setCompanyBalance(companyBalance - cost);
    setEquipmentLevels(p => ({ ...p, [id]: Math.min(MAX_EQUIP_LEVEL, p[id] + 1) }));
    showToast(`Upgraded ${FLOOR_DEFS.find(f => f.id === id)?.name} equipment`);
  }, [equipmentLevels, companyBalance, setCompanyBalance, showToast]);

  useInterval(() => {
    for (const floor of FLOOR_DEFS) {
      const entries = floorAssignments[floor.id];
      if (!entries?.length) continue;
      const mult = floorMult(equipmentLevels[floor.id]);
      for (const e of entries) {
        const sen = (e.agent.level || 1) * 2 + (rarityRank[e.def.rarity] || 0) * 3 + (e.agent.currentOverallRating || 0) / 10;
        addXP(e.agent.mintId, Math.max(1, Math.round(2 * mult * (sen >= 26 ? 1.2 : sen >= 16 ? 1.1 : 1))));
      }
    }
  }, 5000);

  const curFloor = selectedFloor ? FLOOR_DEFS.find(f => f.id === selectedFloor) : null;
  const curAgents = selectedFloor ? floorAssignments[selectedFloor] : [];

  return (
    <>
      <style>{`
        @keyframes office-cinematic-in { 0%{opacity:0;transform:scale(.98) translateY(8px);filter:blur(4px)} 100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0)} }
        @keyframes office-cinematic-out { 0%{opacity:1;transform:scale(1) translateY(0);filter:blur(0)} 100%{opacity:0;transform:scale(1.02) translateY(-8px);filter:blur(3px)} }
        @keyframes office-scan { 0%{transform:translateY(-100%);opacity:.15} 100%{transform:translateY(200%);opacity:0} }
        @keyframes desk-pulse { 0%,100%{box-shadow:0 0 0 rgba(34,211,238,0)} 50%{box-shadow:0 0 14px rgba(34,211,238,.2)} }
      `}</style>
      {toast && <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 rounded-md text-[11px] font-semibold" style={{ background: toast.type === 'error' ? 'rgba(239,68,68,.92)' : toast.type === 'warn' ? 'rgba(245,158,11,.92)' : 'rgba(34,211,238,.92)', color: '#051018' }}>{toast.msg}</div>}

      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-5 text-[10px] text-white/60 font-mono">
          <span>Office LVL {totalOfficeLevel}</span><span>Productivity {avgProductivity}%</span><span>Dev Boost +{globalDevBoost}</span><span>Budget €{Math.floor(companyBalance).toLocaleString()}</span>
        </div>
      </div>

      {!selectedFloor && (
        <div className="p-4 md:p-6 relative" style={{ animation: cinematicState === 'enter' ? 'office-cinematic-in .32s ease-out' : undefined }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden"><div style={{ animation: 'office-scan 2.2s linear infinite', height: 120, background: 'linear-gradient(180deg,rgba(34,211,238,.10),rgba(34,211,238,0))' }} /></div>
          <div className="max-w-4xl mx-auto border border-white/10 rounded-lg overflow-hidden bg-[#0b1221]">
            {FLOOR_DEFS.map((floor) => {
              const entries = floorAssignments[floor.id];
              const eqLv = equipmentLevels[floor.id];
              const prod = productivityFromAgents(entries);
              return (
                <button key={floor.id} onClick={() => enterFloor(floor.id)} className="w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/[.03] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span style={{ color: floor.accent }}>{floor.icon}</span>
                      <div><div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: floor.accent }}>{floor.name} Floor</div><div className="text-[10px] text-white/50">{entries.length} agents • Equip Lv.{eqLv}</div></div>
                    </div>
                    <div className="w-40"><div className="flex items-center justify-between text-[9px] text-white/55 mb-1"><span>Productivity</span><span>{prod}%</span></div><div className="h-1.5 rounded bg-white/10"><div className="h-full rounded" style={{ width: `${prod}%`, background: floor.accent }} /></div></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedFloor && curFloor && (
        <div className="p-4 md:p-6 relative" style={{ animation: cinematicState === 'exit' ? 'office-cinematic-out .26s ease-in' : 'office-cinematic-in .32s ease-out' }}>
          <div className="flex items-center justify-between mb-4">
            <div><div className="text-[12px] uppercase tracking-[0.16em]" style={{ color: curFloor.accent }}>{curFloor.icon} {curFloor.name} Office</div><div className="text-[10px] text-white/50 mt-1">Agents at workstations. Upgrade equipment for faster development.</div></div>
            <div className="flex items-center gap-2">
              <button onClick={() => upgradeFloor(selectedFloor)} className="px-3 py-1.5 rounded border text-[10px] uppercase tracking-[.1em]" style={{ borderColor: `${curFloor.accent}66`, color: curFloor.accent, background: `${curFloor.accent}10` }}>Upgrade (Lv.{equipmentLevels[selectedFloor]})</button>
              <button onClick={exitFloor} className="px-3 py-1.5 rounded border border-white/20 text-white/70 text-[10px] uppercase tracking-[.1em] hover:bg-white/5">Back</button>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0a101c] p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-md border border-white/10 bg-[#0d1526] p-2 relative" style={{ animation: 'desk-pulse 2.6s ease-in-out infinite', animationDelay: `${i * .2}s` }}>
                  <div className="text-[8px] uppercase tracking-[.12em] text-white/40 mb-1">Desk {i + 1}</div><div className="h-8 rounded bg-gradient-to-b from-cyan-500/20 to-transparent border border-cyan-400/20" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {curAgents.map(({ agent, def }) => {
                const cfg = AGENT_RARITY_CONFIG[def.rarity];
                const [c1, c2, c3] = def.portraitGradient;
                const deptOvr = computeDeptOVR(def, agent, selectedFloor);
                return (
                  <div key={agent.mintId} className="rounded-md border p-2" style={{ borderColor: `${cfg.color}44`, background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg,${c1},${c2},${c3})`, border: `1px solid ${cfg.color}` }}><span className="text-[11px]">{def.iconGlyph}</span></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] truncate" style={{ color: cfg.color }}>{def.name}</div>
                        <div className="text-[9px] text-white/50 truncate">OVR {agent.currentOverallRating} • Dept {deptOvr} • Lv.{agent.level}</div>
                        <div className="text-[8px] text-[#f59e0b]/70 truncate">€{getAgentSalary(agent, def)}/tick</div>
                      </div>
                    </div>
                    <select
                      value={selectedFloor}
                      onChange={(e) => {
                        const newFloor = e.target.value;
                        const deployId = FLOOR_DEPLOY_IDS[newFloor];
                        reassignAgent(agent.mintId, deployId);
                        showToast(`${def.name} → ${FLOOR_DEFS.find(f => f.id === newFloor)?.name || 'Lobby'}`);
                      }}
                      className="mt-1.5 w-full bg-[#0a101c] border border-white/10 rounded text-[9px] text-white/70 px-1.5 py-1 cursor-pointer focus:outline-none focus:border-cyan-400/40"
                    >
                      {FLOOR_DEFS.map(f => (
                        <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {curAgents.length === 0 && <div className="col-span-full text-center text-[10px] text-white/45 py-8">No agents on this floor. Use "Assign Agent" to add one.</div>}
            </div>

            {/* Assign unassigned agents from lobby */}
            {selectedFloor !== 'lobby' && (
              <div className="mt-4">
                <button
                  onClick={() => setShowAssignPicker(!showAssignPicker)}
                  className="px-3 py-1.5 rounded border text-[10px] uppercase tracking-[.1em]"
                  style={{ borderColor: `${curFloor.accent}44`, color: curFloor.accent, background: `${curFloor.accent}08` }}
                >
                  {showAssignPicker ? 'Close' : '+ Assign Agent'}
                </button>
                {showAssignPicker && (
                  <div className="mt-2 rounded-lg border border-white/10 bg-[#0d1526] p-3 max-h-48 overflow-y-auto">
                    <div className="text-[9px] text-white/40 uppercase tracking-widest mb-2">Available Agents (Main Floor)</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {floorAssignments.lobby.map(({ agent, def }) => {
                        const cfg = AGENT_RARITY_CONFIG[def.rarity];
                        return (
                          <button
                            key={agent.mintId}
                            onClick={() => {
                              const deployId = FLOOR_DEPLOY_IDS[selectedFloor];
                              reassignAgent(agent.mintId, deployId);
                              showToast(`${def.name} assigned to ${curFloor.name}`);
                              setShowAssignPicker(false);
                            }}
                            className="rounded-md border border-white/10 p-2 text-left hover:bg-white/[.04] transition-colors"
                          >
                            <div className="text-[10px] truncate" style={{ color: cfg.color }}>{def.name}</div>
                            <div className="text-[8px] text-white/40">{def.class} • OVR {agent.currentOverallRating}</div>
                          </button>
                        );
                      })}
                      {floorAssignments.lobby.length === 0 && <div className="col-span-full text-[9px] text-white/30 py-2">No unassigned agents available.</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN AGENCY COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Agency() {
  const [activeSubtab, setActiveSubtab] = useState('office');

  return (
    <div className="fixed inset-0 pt-12 z-20 font-mono select-none overflow-auto bg-[#060a12]">
      <div className="max-w-6xl mx-auto mt-4 mb-10 rounded-lg border border-white/10 bg-[#0b1120]/80 backdrop-blur-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-[#0a101d]/90 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-300 text-sm">👥</span>
            <span className="text-[11px] tracking-[0.16em] uppercase text-white/80">Agency</span>
          </div>
          <PayrollBar />
        </div>

        <div className="flex border-b border-white/10 bg-[#0a101d]/60 overflow-x-auto no-scrollbar">
          {SUBTABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveSubtab(tab.key)}
              className={`px-4 py-2.5 text-[9px] font-mono uppercase tracking-[0.12em] border-b-2 whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                activeSubtab === tab.key ? 'text-[#00e5ff] border-[#00e5ff] bg-[#00e5ff]/5 font-bold' : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/[.02]'
              }`}>
              <span className="text-[10px]">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {activeSubtab === 'office' && <OfficeFloorContent />}
        {activeSubtab === 'storage' && <CardStorage />}
        {activeSubtab === 'development' && <DevelopmentPanel />}
        {activeSubtab === 'sbc' && <SBCPanel />}
        {activeSubtab === 'recruitment' && <RecruitmentPanel />}
        {activeSubtab === 'marketplace' && <AgentMarketplace />}
      </div>
    </div>
  );
}
