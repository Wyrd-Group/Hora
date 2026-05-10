import React from 'react';
import { useEmpireStore } from '../../store/empireStore';


const fmt = (n) => n >= 1e9 ? `€${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${n}`;

const Card = ({ label, value, sub, color = '#00e5ff', wide }) => (
  <div className={`bg-[#0a0e18]/80 border border-tactical-border/20 rounded-xl p-4 ${wide ? 'col-span-2' : ''}`}>
    <div className="text-[7px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono mb-1.5">{label}</div>
    <div className="text-xl font-bold font-mono tabular-nums" style={{ color }}>{value}</div>
    {sub && <div className="text-[9px] text-tactical-text/30 font-mono mt-1">{sub}</div>}
  </div>
);

const Ring = ({ label, value, color, size = 80 }) => {
  const r = size * 0.38, c = 2 * Math.PI * r;
  const pct = Math.min(value, 100) / 100;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ filter: `drop-shadow(0 0 6px ${color}50)` }} />
        <text x={size/2} y={size/2 + 5} textAnchor="middle" fill={color} fontSize="15" fontFamily="monospace" fontWeight="bold">{value}</text>
      </svg>
      <span className="text-[7px] text-tactical-text/50 uppercase tracking-[0.15em] font-mono">{label}</span>
    </div>
  );
};

const Section = ({ title, children, icon, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-[#0a0e18]/60 border border-tactical-border/15 rounded-xl p-5 ${onClick ? 'cursor-pointer transition-all hover:border-tactical-border/40 hover:bg-[#0a0e18]/80 group' : ''}`}
  >
    <div className="text-[8px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono mb-3 flex items-center gap-2">
      {icon && <span className="text-[#00e5ff]/60 text-xs">{icon}</span>}
      {title}
    </div>
    {children}
    {onClick && (
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[7px] font-mono uppercase tracking-widest text-[#00e5ff]">Open &amp; Manage →</span>
      </div>
    )}
  </div>
);

const MiniBar = ({ label, value, max = 100, color }) => (
  <div className="mb-2">
    <div className="flex justify-between text-[8px] font-mono mb-0.5">
      <span className="text-tactical-text/50">{label}</span>
      <span style={{ color }}>{value}/{max}</span>
    </div>
    <div className="h-1.5 bg-tactical-border/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  </div>
);

export default function OverviewOS({ onNavigate }) {
  const store = useEmpireStore();

  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const totalNodeIncome = playerNodes.reduce((s, n) => s + n.income, 0);
  const activeRoutes = store.routes.filter(r => r.active);
  const routeRevenue = activeRoutes.reduce((s, r) => s + (r.monthlyRevenue || 0), 0);
  const activeProjects = store.projects.filter(p => p.active);
  const completedRD = store.rdProjects.filter(p => p.status === 'completed').length;
  const activeRD = store.rdProjects.filter(p => p.status === 'researching').length;
  const ownedSports = store.sportsFranchises.filter(f => f.owned);
  const sportsRevenue = ownedSports.reduce((s, f) => s + (f.monthlyRevenue || 0), 0);
  const ownedPerks = store.perks.filter(p => p.owned);
  const ownedShopping = store.shoppingAssets.filter(a => a.owned);
  const stakedFunds = store.funds.filter(f => (f.stakedAmount || 0) > 0);
  const totalStaked = stakedFunds.reduce((s, f) => s + (f.stakedAmount || 0), 0);
  const portfolioPositions = Object.values(store.portfolio || {});
  const portfolioValue = portfolioPositions.reduce((s, p) => s + p.quantity * p.avgCost, 0);
  const totalCards = Object.keys(store.cards).length;
  const assignedCards = Object.values(store.cards).filter(c => c.assignedNodeId).length;

  // ESG derived
  const esgE = Math.round(store.impact * 0.6 + (100 - store.heat) * 0.4);
  const esgS = Math.round(store.governance * 0.5 + store.impact * 0.3 + store.ceoApproval * 0.2);
  const esgG = Math.round(store.governance * 0.7 + (100 - store.heat) * 0.3);
  const esgOverall = Math.round((esgE + esgS + esgG) / 3);

  // Total monthly
  const totalMonthly = totalNodeIncome + routeRevenue + sportsRevenue;

  const nav = (app, tab) => () => onNavigate?.(app, tab);

  return (
    <div className="absolute inset-0 z-40 bg-[#060a12] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#060a12]/95 backdrop-blur-xl border-b border-tactical-border/20 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-[#00e5ff] text-lg">◉</span>
            <span className="text-tactical-text font-mono text-sm font-bold uppercase tracking-[0.15em]">Command Overview</span>
            <span className="text-[8px] text-tactical-text/20 font-mono ml-2 bg-tactical-border/10 px-2 py-0.5 rounded">LIVE</span>
          </div>
          <div className="text-[8px] text-tactical-text/30 font-mono">{store.structure} — Tax {(store.taxRate * 100).toFixed(0)}%</div>
        </div>
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { key: 'overview', icon: '⊞', label: 'Overview', app: 'overview' },
            { key: 'globe', icon: '◉', label: 'Globe', app: 'globe' },
            { key: 'learn', icon: '◈', label: 'Learn', app: 'learn' },
            { key: 'exchange', icon: '⬡', label: 'Exchange', app: 'exchange' },
            { key: 'lab', icon: '✦', label: 'Lab', app: 'lab' },
            { key: 'social', icon: '◎', label: 'Social', app: 'social' },
          ].map(t => {
            const isActive = t.key === 'overview';
            return (
              <button key={t.key} onClick={nav(t.app)}
                className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.1em] rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'text-[#00e5ff] bg-[#00e5ff]/10 border border-[#00e5ff]/30 font-bold'
                    : 'text-tactical-text/50 hover:text-tactical-text/80 hover:bg-white/[0.03] border border-transparent'
                }`}>
                <span className="text-xs">{t.icon}</span>{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Row 1: Key Financial Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card label="Net Worth" value={fmt(store.netWorth)} color="#00e5ff" />
          <Card label="Personal Balance" value={fmt(store.personalBalance)} color="#e8e0d0" />
          <Card label="Company Balance" value={fmt(store.companyBalance)} color="#7c3aed" />
          <Card label="Monthly Income" value={`+${fmt(totalMonthly)}`} sub={`Nodes ${fmt(totalNodeIncome)} + Routes ${fmt(routeRevenue)} + Sports ${fmt(sportsRevenue)}`} color="#10b981" />
          <Card label="Portfolio Value" value={fmt(portfolioValue)} sub={`${portfolioPositions.length} positions`} color="#f59e0b" />
          <Card label="Funds Staked" value={fmt(totalStaked)} sub={`${stakedFunds.length} funds`} color="#a78bfa" />
        </div>

        {/* Row 2: Empire Axes + ESG */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Empire Performance Axes" icon="◈" onClick={nav('globe', 'overview')}>
            <div className="flex justify-around py-2">
              <Ring label="Growth" value={store.growth} color="#00e5ff" />
              <Ring label="Governance" value={store.governance} color="#10b981" />
              <Ring label="Impact" value={store.impact} color="#f59e0b" />
              <Ring label="Power" value={store.power} color="#ec4899" />
            </div>
          </Section>
          <Section title={`ESG Rating — ${esgOverall}/100`} icon="☘" onClick={nav('globe', 'esg')}>
            <div className="flex justify-around py-2">
              <Ring label="Environmental" value={esgE} color="#10b981" />
              <Ring label="Social" value={esgS} color="#00e5ff" />
              <Ring label="Governance" value={esgG} color="#7c3aed" />
            </div>
          </Section>
        </div>

        {/* Row 3: Company Status */}
        <Section title="Company Status" icon="⬡" onClick={nav('globe', 'office')}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card label="Structure" value={store.structure} color="#7c3aed" />
            <Card label="Heat Level" value={store.heat} sub={store.heat > 60 ? 'CRITICAL' : store.heat > 30 ? 'ELEVATED' : 'NOMINAL'} color={store.heat > 60 ? '#ef4444' : store.heat > 30 ? '#f59e0b' : '#10b981'} />
            <Card label="CEO Approval" value={`${store.ceoApproval}%`} color={store.ceoApproval > 60 ? '#10b981' : '#f59e0b'} />
            <Card label="Followers" value={store.followers.toLocaleString()} color="#ec4899" />
            <Card label="Jurisdiction" value={store.companyCountry || 'None'} sub={store.residencyCountry ? `Residency: ${store.residencyCountry}` : ''} color="#9c8e7e" />
          </div>
        </Section>

        {/* Row 4: Infrastructure + Routes + R&D */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Section title={`Infrastructure — ${playerNodes.length} Nodes`} icon="◉" onClick={nav('globe', 'market')}>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {playerNodes.length === 0 && <div className="text-[9px] text-tactical-text/30 font-mono py-4 text-center">No owned infrastructure</div>}
              {playerNodes.map(n => (
                <div key={n.id} className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/30 rounded px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: n.status === 'operational' ? '#10b981' : '#f59e0b' }} />
                    <span className="text-tactical-text/70 truncate max-w-[120px]">{n.name}</span>
                  </div>
                  <span className="text-emerald-400 tabular-nums">+{fmt(n.income)}/mo</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Trade Routes — ${activeRoutes.length} Active`} icon="⇄" onClick={nav('globe', 'routes')}>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {activeRoutes.length === 0 && <div className="text-[9px] text-tactical-text/30 font-mono py-4 text-center">No active trade routes</div>}
              {activeRoutes.map(r => (
                <div key={r.id} className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/30 rounded px-2 py-1.5">
                  <span className="text-tactical-text/70 truncate max-w-[100px]">{r.fromNodeId} → {r.toNodeId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] text-tactical-text/30 uppercase">{r.type}</span>
                    {r.level && <span className="text-[7px] text-[#f59e0b]">Lv{r.level}</span>}
                    <span className="text-emerald-400 tabular-nums">+{fmt(r.monthlyRevenue || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="R&D Progress" icon="⚗" onClick={nav('globe', 'rnd')}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold font-mono text-[#10b981]">{completedRD}</div>
                <div className="text-[7px] text-tactical-text/30 font-mono">DONE</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold font-mono text-[#00e5ff]">{activeRD}</div>
                <div className="text-[7px] text-tactical-text/30 font-mono">ACTIVE</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold font-mono text-tactical-text/30">{store.rdProjects.filter(p => p.status === 'available').length}</div>
                <div className="text-[7px] text-tactical-text/30 font-mono">AVAIL</div>
              </div>
            </div>
            {store.rdProjects.filter(p => p.status === 'researching').map(p => (
              <MiniBar key={p.id} label={p.name} value={p.progress} color="#00e5ff" />
            ))}
            {activeRD === 0 && <div className="text-[9px] text-tactical-text/30 font-mono text-center py-2">No active research</div>}
          </Section>
        </div>

        {/* Row 5: Trading Portfolio */}
        <Section title={`Trading Portfolio — ${portfolioPositions.length} Positions`} icon="⇄" onClick={nav('exchange')}>
          {portfolioPositions.length === 0 ? (
            <div className="text-[9px] text-tactical-text/30 font-mono text-center py-4">No open trading positions</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {portfolioPositions.map(p => (
                <div key={p.symbol} className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/30 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-tactical-text/80 font-bold">{p.symbol}</span>
                    <span className="text-tactical-text/30 ml-1.5">{p.instrumentType}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[#00e5ff] tabular-nums">{fmt(p.quantity * p.avgCost)}</div>
                    <div className="text-tactical-text/30 text-[7px]">{p.quantity} × {fmt(p.avgCost)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Row 6: Academy + Workforce + Departments */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Section title="ECFL Academy" icon="◈" onClick={nav('learn')}>
            <div className="space-y-2">
              <Card label="ECFL Score" value={store.ecflScore} color="#f59e0b" />
              <MiniBar label="Lessons Completed" value={store.completedLessons.length} max={Math.max(store.completedLessons.length, 20)} color="#10b981" />
              <MiniBar label="Exams Passed" value={store.passedExams.length} max={Math.max(store.passedExams.length, 10)} color="#7c3aed" />
            </div>
          </Section>

          <Section title={`Workforce — ${totalCards} Cards`} icon="⬡" onClick={nav('globe', 'assets')}>
            <MiniBar label="Assigned" value={assignedCards} max={totalCards || 1} color="#00e5ff" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              {['Bronze', 'Silver', 'Gold', 'Diamond', 'Icon'].map(tier => {
                const count = Object.values(store.cards).filter(c => c.tier === tier).length;
                if (count === 0) return null;
                const tierColor = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Diamond: '#00e5ff', Icon: '#ec4899' }[tier];
                return (
                  <div key={tier} className="flex justify-between text-[8px] font-mono">
                    <span style={{ color: tierColor }}>{tier}</span>
                    <span className="text-tactical-text/50">{count}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={`Departments — ${activeProjects.length} Active`} icon="⚙" onClick={nav('globe', 'departments')}>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {activeProjects.length === 0 && <div className="text-[9px] text-tactical-text/30 font-mono text-center py-4">No active projects</div>}
              {activeProjects.map(p => (
                <div key={p.id} className="flex justify-between text-[9px] font-mono bg-tactical-bg/30 rounded px-2 py-1.5">
                  <span className="text-tactical-text/70">{p.name}</span>
                  <span className="text-[#7c3aed]">{p.dept}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Row 7: Assets Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Section title={`Sports — ${ownedSports.length}`} icon="⚽" onClick={nav('globe', 'sports')}>
            {ownedSports.length === 0 ? (
              <div className="text-[9px] text-tactical-text/30 font-mono">No franchises</div>
            ) : (
              <div className="space-y-1">
                {ownedSports.map(f => (
                  <div key={f.id} className="text-[9px] font-mono">
                    <div className="text-tactical-text/60 truncate">{f.name}</div>
                    <div className="text-emerald-400 text-[8px]">+{fmt(f.monthlyRevenue || 0)}/mo</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Perks — ${ownedPerks.length}`} icon="★" onClick={nav('globe', 'perks')}>
            {ownedPerks.length === 0 ? (
              <div className="text-[9px] text-tactical-text/30 font-mono">No perks acquired</div>
            ) : (
              <div className="space-y-1">
                {ownedPerks.map(p => (
                  <div key={p.id} className="text-[9px] text-tactical-text/60 font-mono truncate">{p.name}</div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Shopping — ${ownedShopping.length}`} icon="♨" onClick={nav('globe', 'shopping')}>
            {ownedShopping.length === 0 ? (
              <div className="text-[9px] text-tactical-text/30 font-mono">No luxury assets</div>
            ) : (
              <div className="space-y-1">
                {ownedShopping.map(a => (
                  <div key={a.id} className="text-[9px] text-tactical-text/60 font-mono truncate">{a.name}</div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Shadow Ops`} icon="☠" onClick={nav('globe', 'shadow')}>
            <div className="grid grid-cols-2 gap-1">
              <div className="text-center">
                <div className="text-lg font-bold font-mono text-[#ef4444]">{store.shadowOps.filter(s => s.owned).length}</div>
                <div className="text-[7px] text-tactical-text/30 font-mono">COMPLETED</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold font-mono text-tactical-text/30">{store.shadowOps.filter(s => !s.owned).length}</div>
                <div className="text-[7px] text-tactical-text/30 font-mono">AVAILABLE</div>
              </div>
            </div>
          </Section>
        </div>

        {/* Row 8: Recent Ticker */}
        <Section title="Recent Activity Feed" icon="▶">
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {store.ticker.slice(-15).reverse().map((t, i) => {
              const typeColor = {
                fx: '#00e5ff', crypto: '#a78bfa', commodity: '#f59e0b',
                intel: '#10b981', alert: '#ef4444', crime: '#ec4899', board: '#6366f1',
              }[t.type] || '#9c8e7e';
              return (
                <div key={t.id || i} className="flex items-start gap-2 text-[9px] font-mono">
                  <span className="text-[7px] uppercase px-1 py-0.5 rounded mt-0.5 shrink-0" style={{ color: typeColor, backgroundColor: `${typeColor}15`, border: `1px solid ${typeColor}30` }}>{t.type}</span>
                  <span className="text-tactical-text/60">{t.text}</span>
                </div>
              );
            })}
            {store.ticker.length === 0 && <div className="text-[9px] text-tactical-text/30 font-mono text-center py-4">No recent events</div>}
          </div>
        </Section>



      </div>
    </div>
  );
}
