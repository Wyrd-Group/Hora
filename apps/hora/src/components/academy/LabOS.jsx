import React, { useState, useMemo } from 'react';
import SimulationShell from '../simulation/SimulationShell';
import ReplayShell from '../replay/ReplayShell';
import { REPLAY_SCENARIOS } from '../../data/replayScenarios';
import { LAB_SCENARIOS, LAB_CATEGORIES } from '../../data/labScenarios';
import { useReplayStore } from '../../store/replayStore';


// ── Difficulty badge colors ────────────────────────────────────────
const DIFF_STYLES = {
  beginner:     { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   border: 'border-cyan-400/30',   hover: 'hover:border-cyan-400/40' },
  intermediate: { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-400/30',  hover: 'hover:border-amber-400/40' },
  advanced:     { bg: 'bg-rose-500/15',   text: 'text-rose-400',   border: 'border-rose-400/30',   hover: 'hover:border-rose-400/40' },
};

// ── Scenario Card (shared by both tabs) ───────────────────────────
function ScenarioCard({ id, title, year, description, difficulty, duration, instruments, extra, accentColor = 'cyan', onStart }) {
  const d = DIFF_STYLES[difficulty] || DIFF_STYLES.beginner;
  const completed = useReplayStore.getState().completedScenarios;
  const best = completed[id] ?? null;

  return (
    <button
      onClick={() => onStart(id)}
      className={`group text-left w-full border border-tactical-border/40 bg-[#0a0f1a]/80 hover:bg-[#0d1420] ${d.hover} rounded transition-all p-3.5`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <h4 className={`text-[11px] font-mono font-semibold text-tactical-text tracking-wide truncate group-hover:${accentColor === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'} transition-colors`}>
            {title}
          </h4>
          <p className="text-[8px] font-mono text-tactical-text/35 tracking-widest uppercase mt-0.5">
            {year}
          </p>
        </div>
        <span className={`text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${d.bg} ${d.text} ${d.border}`}>
          {difficulty}
        </span>
      </div>
      <p className="text-[9px] font-mono text-tactical-text/45 leading-relaxed mb-2.5 line-clamp-2">
        {description}
      </p>
      {extra && (
        <div className="flex flex-wrap gap-1 mb-2">
          {extra.map((tag, i) => (
            <span key={i} className="text-[7px] font-mono text-tactical-text/25 border border-tactical-border/15 px-1 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[8px] font-mono text-tactical-text/25">
          <span>{duration}t</span>
          <span>{instruments.slice(0, 3).map(i => i.toUpperCase()).join(', ')}{instruments.length > 3 ? ` +${instruments.length - 3}` : ''}</span>
        </div>
        {best ? (
          <span className={`text-[8px] font-mono ${best.returnPct >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
            {best.returnPct >= 0 ? '+' : ''}{best.returnPct.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[7px] font-mono text-tactical-text/15 uppercase tracking-widest">new</span>
        )}
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────

const LabOS = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('sim');
  const [inActivity, setInActivity] = useState(false); // 'sim' | 'scenario' | 'replay' | false
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [eraFilter, setEraFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (inActivity === 'sim') {
    return <SimulationShell onExit={() => setInActivity(false)} />;
  }

  if (inActivity === 'scenario' || inActivity === 'replay') {
    return <ReplayShell onExit={() => setInActivity(false)} />;
  }

  const tabs = [
    { id: 'sim', label: 'Market Lab', sub: 'Free Sim', icon: '\u25C8', accent: 'cyan' },
    { id: 'scenarios', label: 'Scenarios', sub: `${LAB_SCENARIOS.length} Missions`, icon: '\u2302', accent: 'cyan' },
    { id: 'replay', label: 'Replay', sub: `${REPLAY_SCENARIOS.length} Events`, icon: '\u25B6', accent: 'emerald' },
  ];

  const handleStartScenario = (id) => {
    useReplayStore.getState().loadScenario(id);
    setInActivity('scenario');
  };

  const handleStartReplay = (id) => {
    useReplayStore.getState().loadScenario(id);
    setInActivity('replay');
  };

  // ── Filtered lab scenarios ──
  const filteredLabScenarios = useMemo(() => {
    let items = LAB_SCENARIOS;
    if (categoryFilter !== 'all') items = items.filter(s => s.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.teaches.some(t => t.toLowerCase().includes(q)));
    }
    return items;
  }, [categoryFilter, searchQuery]);

  // ── Unique eras from replay scenarios ──
  const replayEras = useMemo(() => {
    const eras = new Map();
    for (const s of REPLAY_SCENARIOS) {
      const era = s.era || 'Other';
      if (!eras.has(era)) eras.set(era, []);
      eras.get(era).push(s);
    }
    return eras;
  }, []);

  const filteredReplayScenarios = useMemo(() => {
    if (eraFilter === 'all') return REPLAY_SCENARIOS;
    return REPLAY_SCENARIOS.filter(s => (s.era || 'Other') === eraFilter);
  }, [eraFilter]);

  return (
    <div className="fixed inset-0 pt-24 md:pt-28 z-20 backdrop-blur-xl bg-[#060a12]/95 flex flex-col items-center">

      {/* Scan-line overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
      }} />

      {/* Sub-Navigation Tabs */}
      <div className="relative flex gap-1 p-1 bg-[#0a0f1a] rounded-lg border border-white/[0.06] max-w-full overflow-x-auto no-scrollbar md:mb-6 mb-3 shrink-0 w-[92%] md:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            className={`relative px-5 sm:px-7 py-2.5 sm:py-3 rounded-md flex items-center gap-2.5 transition-all duration-300 w-full sm:w-auto font-mono text-xs
              ${activeTab === tab.id
                ? `bg-white/[0.06] text-white ${tab.accent === 'emerald' ? 'shadow-[inset_0_-2px_0_#10b981,0_0_20px_rgba(16,185,129,0.15)]' : 'shadow-[inset_0_-2px_0_#00e5ff,0_0_20px_rgba(0,229,255,0.15)]'}`
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
          >
            <span className={`text-base transition-all duration-300 ${activeTab === tab.id ? (tab.accent === 'emerald' ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-cyan-400 drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]') : 'opacity-40'}`}>
              {tab.icon}
            </span>
            <div className="flex flex-col items-start">
              <span className="font-bold text-[11px] tracking-wide uppercase">{tab.label}</span>
              <span className={`text-[8px] tracking-[0.15em] uppercase transition-colors duration-300 ${activeTab === tab.id ? (tab.accent === 'emerald' ? 'text-emerald-400/70' : 'text-cyan-400/70') : 'text-white/20'}`}>
                {tab.sub}
              </span>
            </div>
            {activeTab === tab.id && (
              <span className={`absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full ${tab.accent === 'emerald' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-cyan-400 shadow-[0_0_6px_#00e5ff]'} animate-pulse`} />
            )}
          </button>
        ))}
      </div>

      {/* Content Container */}
      <div className="w-full max-w-5xl flex-1 overflow-y-auto px-4 md:px-6 pb-8">

        {/* ==================== MARKET LAB TAB ==================== */}
        {activeTab === 'sim' && (
          <div className="animate-fade-in flex flex-col items-center h-full">
            <div className="flex items-center gap-3 mb-6 md:mb-8 mt-2 w-full max-w-md">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              <span className="text-[9px] font-mono tracking-[0.3em] uppercase text-cyan-500/50">Training Grounds</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            </div>

            <div className="relative w-full max-w-md group">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-400/40 via-transparent to-cyan-400/20 opacity-60 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]" />
              <div className="relative bg-gradient-to-br from-[#0c1829] via-[#0a1220] to-[#0d0f18] border border-cyan-500/20 rounded-2xl p-6 md:p-10 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.04]" style={{
                  backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(0,229,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0,229,255,0.1) 0%, transparent 40%)',
                }} />
                <div className="flex items-center justify-between mb-8 md:mb-10 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded-sm bg-gradient-to-br from-amber-300/80 to-amber-500/60 border border-amber-400/30 flex items-center justify-center">
                      <div className="w-4 h-3 border border-amber-600/40 rounded-[1px]" />
                    </div>
                    <span className="text-[9px] font-mono tracking-[0.2em] text-white/20 uppercase">Sim Account</span>
                  </div>
                </div>
                <div className="text-center relative z-10 mb-8 md:mb-10">
                  <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-cyan-400/40 mb-2">Available Balance</div>
                  <div className="text-4xl md:text-5xl text-white font-mono font-bold tracking-tight">
                    <span className="text-cyan-400/70 text-2xl md:text-3xl mr-1">$</span>
                    100,000
                    <span className="text-white/30 text-2xl md:text-3xl">.00</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-mono text-emerald-400/60 tracking-widest uppercase">Ready</span>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mb-6 relative z-10" />
                <div className="relative z-10">
                  <button
                    onClick={() => setInActivity('sim')}
                    className="group/btn w-full relative py-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#060a12] rounded-lg font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span className="text-sm">{'>'}_</span>
                      Launch Free Sim
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[9px] font-mono text-tactical-text/25 mt-4 text-center max-w-sm">
              Open-ended sandbox with all 500 instruments. No objectives, no time limit. Practice freely.
            </p>
          </div>
        )}

        {/* ==================== SCENARIOS TAB (100 Lab Missions) ==================== */}
        {activeTab === 'scenarios' && (
          <div className="animate-fade-in">
            {/* Header + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400/80">
                  Training Scenarios — {filteredLabScenarios.length} Missions
                </h2>
                <p className="text-[9px] font-mono text-tactical-text/30 mt-0.5">
                  Each scenario teaches a specific skill. Same conditions for every player.
                </p>
              </div>
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 bg-[#0a0f1a]/80 border border-tactical-border/20 rounded px-2.5 py-1.5 text-[9px] font-mono text-tactical-text placeholder-tactical-text/20 focus:outline-none focus:border-cyan-500/30"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1 mb-5">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`text-[7px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-colors ${
                  categoryFilter === 'all' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'text-tactical-text/25 border-tactical-border/15 hover:text-tactical-text/40'
                }`}
              >
                All ({LAB_SCENARIOS.length})
              </button>
              {LAB_CATEGORIES.map(cat => {
                const count = LAB_SCENARIOS.filter(s => s.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`text-[7px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-colors ${
                      categoryFilter === cat.id ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'text-tactical-text/25 border-tactical-border/15 hover:text-tactical-text/40'
                    }`}
                  >
                    {cat.icon} {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Scenario grid */}
            {categoryFilter === 'all' ? (
              // Show grouped by category
              LAB_CATEGORIES.map(cat => {
                const catScenarios = filteredLabScenarios.filter(s => s.category === cat.id);
                if (!catScenarios.length) return null;
                return (
                  <div key={cat.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2 border-b border-tactical-border/15 pb-1">
                      <span className="text-[10px]">{cat.icon}</span>
                      <h3 className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-400/50">{cat.label}</h3>
                      <span className="text-[7px] font-mono text-tactical-text/20">{cat.description}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {catScenarios.map(s => (
                        <ScenarioCard
                          key={s.id}
                          id={s.id}
                          title={s.title}
                          year={s.objective}
                          description={s.description}
                          difficulty={s.difficulty}
                          duration={s.duration}
                          instruments={s.instruments}
                          extra={s.teaches}
                          accentColor="cyan"
                          onStart={handleStartScenario}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Show flat filtered list
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredLabScenarios.map(s => (
                  <ScenarioCard
                    key={s.id}
                    id={s.id}
                    title={s.title}
                    year={s.objective}
                    description={s.description}
                    difficulty={s.difficulty}
                    duration={s.duration}
                    instruments={s.instruments}
                    extra={s.teaches}
                    accentColor="cyan"
                    onStart={handleStartScenario}
                  />
                ))}
              </div>
            )}

            {filteredLabScenarios.length === 0 && (
              <p className="text-[10px] font-mono text-tactical-text/20 text-center py-8">No scenarios match your search.</p>
            )}
          </div>
        )}

        {/* ==================== REPLAY TAB (100 Historical Events) ==================== */}
        {activeTab === 'replay' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400/80">
                  Historical Replay — {REPLAY_SCENARIOS.length} Events (1870s–2020s)
                </h2>
                <p className="text-[9px] font-mono text-tactical-text/30 mt-0.5">
                  Trade through real market events. Could you have beaten the market?
                </p>
              </div>
              <div className="flex items-center gap-3 text-[8px] font-mono text-tactical-text/35">
                <span>{Object.keys(useReplayStore.getState().completedScenarios).length}/{REPLAY_SCENARIOS.length} completed</span>
              </div>
            </div>

            {/* Era filter pills */}
            <div className="flex flex-wrap gap-1 mb-5">
              <button
                onClick={() => setEraFilter('all')}
                className={`text-[7px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-colors ${
                  eraFilter === 'all' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-tactical-text/25 border-tactical-border/15 hover:text-tactical-text/40'
                }`}
              >
                All Eras ({REPLAY_SCENARIOS.length})
              </button>
              {[...replayEras.keys()].map(era => (
                <button
                  key={era}
                  onClick={() => setEraFilter(era)}
                  className={`text-[7px] font-mono tracking-widest px-2 py-1 rounded border transition-colors ${
                    eraFilter === era ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-tactical-text/25 border-tactical-border/15 hover:text-tactical-text/40'
                  }`}
                >
                  {era.length > 30 ? era.substring(0, 28) + '...' : era} ({replayEras.get(era).length})
                </button>
              ))}
            </div>

            {/* Scenarios grouped by era */}
            {eraFilter === 'all' ? (
              [...replayEras.entries()].map(([era, scenarios]) => (
                <div key={era} className="mb-6">
                  <h3 className="text-[9px] font-mono uppercase tracking-[0.15em] text-emerald-400/40 mb-2 border-b border-tactical-border/15 pb-1">
                    {era}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {scenarios.map(s => (
                      <ScenarioCard
                        key={s.id}
                        id={s.id}
                        title={s.title}
                        year={s.year}
                        description={s.description}
                        difficulty={s.difficulty}
                        duration={s.duration}
                        instruments={s.instruments}
                        extra={s.historicalReturn != null ? [`Actual: ${s.historicalReturn > 0 ? '+' : ''}${s.historicalReturn}%`] : undefined}
                        accentColor="emerald"
                        onStart={handleStartReplay}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredReplayScenarios.map(s => (
                  <ScenarioCard
                    key={s.id}
                    id={s.id}
                    title={s.title}
                    year={s.year}
                    description={s.description}
                    difficulty={s.difficulty}
                    duration={s.duration}
                    instruments={s.instruments}
                    extra={s.historicalReturn != null ? [`Actual: ${s.historicalReturn > 0 ? '+' : ''}${s.historicalReturn}%`] : undefined}
                    accentColor="emerald"
                    onStart={handleStartReplay}
                  />
                ))}
              </div>
            )}
          </div>
        )}



      </div>
    </div>
  );
};

export default LabOS;
