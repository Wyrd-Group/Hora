import React, { useState, useMemo } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useResizable } from '../../hooks/useResizable';
import { BANKS, TRADE_CORRIDORS } from '../../data/seed';
import { fmtGameTime } from '../../lib/fmtGameTime';
import ShoppingHub from './ShoppingHub';
import SportsAcquisitionModal from './SportsAcquisitionModal';
import PerksModule from './PerksModule';
import FundsModule from './FundsModule';
import ShadowOpsModule from './ShadowOpsModule';
import EmpireOverview from './EmpireOverview';
import ListToolbar from './ListToolbar';
import { PriceFilter, applyPriceFilter } from './PriceFilter';
import DivisionsModule from './DivisionsModule';
import TransportEmpire from './TransportEmpire';
import PvPPanel from '../pvp/PvPPanel';
import PoliticsPanel from '../politics/PoliticsPanel';
import PersonalPoliticsPanel from '../politics/PersonalPoliticsPanel';
import BureaucracyPanel from './BureaucracyPanel';
import LuxuryStore from '../luxury/LuxuryStore';
import NewsFeed from '../news/NewsFeed';
import EquityPanel from './EquityPanel';

const STRUCTURES = [
  { name: 'Sole Trader', desc: 'Single owner, unlimited liability. Lowest tax overhead.', icon: '👤', color: '#9c8e7e', taxMod: 0.90,
    pros: ['10% tax reduction', 'No governance overhead', 'Full autonomy'], cons: ['Unlimited personal liability', 'No investor access', 'Limited growth potential'], conditions: ['Starting structure', 'No minimum net worth'] },
  { name: 'Partnership', desc: 'Shared ownership and liability. Good for early growth.', icon: '🤝', color: '#10b981', taxMod: 0.95,
    pros: ['5% tax reduction', 'Shared risk', 'Unlocks joint ventures'], cons: ['Partner disputes possible', 'Shared decision-making', 'Moderate governance cost'], conditions: ['Net worth > €50K', '1 quarter cooldown'] },
  { name: 'Privately Held (LLC)', desc: 'Limited liability, flexible management. Standard choice.', icon: '🏢', color: '#7c3aed', taxMod: 1.0,
    pros: ['Limited liability protection', 'Flexible management structure', 'Investor-ready'], cons: ['Standard tax rate', 'Annual compliance filing', 'Board governance required'], conditions: ['Net worth > €200K', '1 quarter cooldown'] },
  { name: 'Public Company', desc: 'Publicly traded. Access to capital markets, high governance costs.', icon: '📈', color: '#00e5ff', taxMod: 1.10,
    pros: ['Access to capital markets', 'Maximum growth potential', 'Highest credibility'], cons: ['10% tax increase', 'Quarterly reporting required', 'Public scrutiny'], conditions: ['Net worth > €1M', '1 quarter cooldown'] },
  { name: 'Social Enterprise', desc: 'Profit with purpose. ESG bonuses, reduced power growth.', icon: '🌱', color: '#10b981', taxMod: 0.85,
    pros: ['15% tax reduction', 'Major ESG/Impact bonuses', 'Public goodwill'], cons: ['Reduced power growth', 'Profit cap restrictions', 'Impact audits'], conditions: ['ESG score > 40', '1 quarter cooldown'] },
  { name: 'NGO Watchdog', desc: 'Non-profit governance focus. Maximum impact, minimal profit.', icon: '⚖️', color: '#f59e0b', taxMod: 0.70,
    pros: ['30% tax reduction', 'Maximum governance bonus', 'Immunity from certain penalties'], cons: ['Minimal profit allowed', 'No luxury purchases', 'Restricted trading'], conditions: ['Governance > 60', '1 quarter cooldown'] },
];

const StructurePickerModal = ({ onClose }) => {
  const store = useEmpireStore();
  const [cooldownMsg, setCooldownMsg] = useState(null);
  const cooldownRemaining = store.getCooldownRemaining('structure');
  const onCooldown = cooldownRemaining > 0;

  const handleSelect = (name) => {
    if (store.structure === name) return;
    const success = store.setStructureCooldown(name);
    if (!success) {
      setCooldownMsg(`Cannot change structure — ${cooldownRemaining} tick${cooldownRemaining !== 1 ? 's' : ''} remaining in quarter cooldown.`);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0a0e18] border border-tactical-border/40 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[#7c3aed] text-lg">🏛</span>
            <span className="text-tactical-text font-mono text-sm font-bold uppercase tracking-[0.15em]">Corporate Structure</span>
          </div>
          <button onClick={onClose} aria-label="Close corporate structure" className="text-tactical-text/40 hover:text-tactical-text text-lg font-mono transition-colors">✕</button>
        </div>
        <div className="text-[9px] text-tactical-text/55 font-mono mb-2">Select a corporate structure. This affects tax rate, governance requirements, and empire growth modifiers.</div>
        {onCooldown && (
          <div className="flex items-center gap-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg px-3 py-2 mb-3">
            <span className="text-[10px]">⏳</span>
            <span className="text-[8px] font-mono text-[#f59e0b]">Quarter cooldown active — {cooldownRemaining} tick{cooldownRemaining !== 1 ? 's' : ''} remaining</span>
          </div>
        )}
        {cooldownMsg && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg px-3 py-2 mb-3">
            <span className="text-[8px] font-mono text-[#ef4444]">{cooldownMsg}</span>
          </div>
        )}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {STRUCTURES.map(s => {
            const isActive = store.structure === s.name;
            const taxLabel = s.taxMod < 1 ? `${Math.round((1 - s.taxMod) * 100)}% reduction` : s.taxMod > 1 ? `${Math.round((s.taxMod - 1) * 100)}% increase` : 'Standard rate';
            return (
              <button
                key={s.name}
                onClick={() => handleSelect(s.name)}
                disabled={onCooldown && !isActive}
                className={`w-full text-left rounded-lg p-3 transition-all border ${
                  isActive
                    ? 'border-[#7c3aed]/60 bg-[#7c3aed]/[0.06]'
                    : onCooldown
                    ? 'border-tactical-border/10 bg-tactical-bg/20 opacity-40 cursor-not-allowed'
                    : 'border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12]'
                }`}
                style={isActive ? { boxShadow: `0 0 12px ${s.color}18` } : {}}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{s.icon}</span>
                    <span className="text-[11px] font-bold text-tactical-text font-mono">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{ color: s.taxMod <= 1 ? '#10b981' : '#ef4444', backgroundColor: s.taxMod <= 1 ? '#10b98118' : '#ef444418' }}>
                      Tax: {taxLabel}
                    </span>
                    {isActive && <span className="text-[7px] font-mono text-[#7c3aed] bg-[#7c3aed]/20 px-1.5 py-0.5 rounded border border-[#7c3aed]/30">CURRENT</span>}
                  </div>
                </div>

                <p className="text-[9px] text-tactical-text/50 leading-relaxed mb-2 font-mono">{s.desc}</p>

                {/* Pros / Cons */}
                <div className="grid grid-cols-2 gap-1.5 text-[8px] font-mono">
                  <div>
                    {s.pros.map((p, i) => (
                      <div key={i} className="text-[#10b981] flex gap-1 mb-0.5"><span>+</span><span>{p}</span></div>
                    ))}
                  </div>
                  <div>
                    {s.cons.map((c, i) => (
                      <div key={i} className="text-[#ef4444] flex gap-1 mb-0.5"><span>-</span><span>{c}</span></div>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.conditions.map((cond, i) => (
                    <span key={i} className="text-[7px] px-1.5 py-0.5 rounded font-mono"
                      style={{ backgroundColor: '#7c3aed12', color: '#a78bfa', border: '1px solid #7c3aed25' }}>
                      {cond}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SECTOR_COL = {
  finance: "#00e5ff", tech: "#7c3aed", oil_gas: "#f59e0b",
  manufacturing: "#6366f1", energy: "#10b981", pharma: "#ec4899", venue: "#a78bfa"
};

const DEPT_COL = {
  HR: "#10b981", Trading: "#00e5ff", Marketing: "#f472b6", "R&D": "#7c3aed", Finance: "#f59e0b", Legal: "#6366f1"
};

const fmt = (n) => {
  if (n == null || !isFinite(n)) return '€0';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}€${(a/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}€${(a/1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}€${(a/1e3).toFixed(0)}K`;
  return `${sign}€${Math.round(a)}`;
};

const TAB_META = {
  office:      { icon: '\u2302', label: 'office' },
  overview:    { icon: '\u25C8', label: 'overview' },
  departments: { icon: '\u2630', label: 'depts' },
  funds:       { icon: '\u25B2', label: 'funds' },
  market:      { icon: '\u2616', label: 'market' },
  routes:      { icon: '\u21C4', label: 'routes' },
  esg:         { icon: '\u2618', label: 'esg' },
  rnd:         { icon: '\u2697', label: 'r&d' },
  defcon:      { icon: '\u26A0', label: 'defcon' },
  assets:      { icon: '\u25A3', label: 'assets' },
  shadow:      { icon: '\u2620', label: 'shadow' },
  perks:       { icon: '\u2605', label: 'perks' },
  shopping:    { icon: '\u2668', label: 'shop' },
  sports:      { icon: '\u26BD', label: 'sports' },
  transport:   { icon: '✈', label: 'transport' },
  divisions:   { icon: '\u25C6', label: 'divs' },
  equity:      { icon: '\u25CE', label: 'equity' },
  pvp:         { icon: '\u2694', label: 'pvp' },
  politics:    { icon: '🏛', label: 'politics' },
  career:      { icon: '🎖', label: 'career' },
  legal:       { icon: '\u2696', label: 'legal' },
  luxury:      { icon: '����', label: 'luxury' },
  news:        { icon: '📰', label: 'news' },
};

const ROUTE_TYPE_META = {
  sea:   { icon: '\u2693', label: 'Naval', color: '#00e5ff', buildCost: 500_000, income: 25_000, desc: 'Ocean freight — high volume, slow delivery' },
  air:   { icon: '\u2708', label: 'Air', color: '#a78bfa', buildCost: 750_000, income: 35_000, desc: 'Air cargo — fast, expensive, low volume' },
  rail:  { icon: '\uD83D\uDE82', label: 'Rail', color: '#f59e0b', buildCost: 600_000, income: 20_000, desc: 'Rail freight — medium speed, reliable' },
  truck: { icon: '\uD83D\uDE9A', label: 'Land', color: '#10b981', buildCost: 300_000, income: 15_000, desc: 'Truck logistics — flexible, short range' },
};

const LEVEL_DOTS = ['#6366f1', '#00e5ff', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#a78bfa'];

// ---- Subcomponents ---- //

const WalletCard = ({ label, val, sub, variant }) => {
  const glowClass = variant === 'company' ? 'glow-cyan' : 'glow-green';
  const borderColor = variant === 'company' ? 'border-[#00e5ff]/20' : 'border-empire-player/20';
  const accentColor = variant === 'company' ? 'text-[#00e5ff]' : 'text-empire-player';
  return (
    <div className={`bg-tactical-bg/60 ${borderColor} border rounded-lg p-2.5 flex-1 ${glowClass} transition-all duration-300 hover:scale-[1.02]`}>
      <div className={`text-[7px] ${accentColor} uppercase tracking-[0.2em] font-mono`}>{label}</div>
      <div className="text-base font-bold mt-1 text-tactical-text font-mono tabular-nums">{val}</div>
      {sub && <div className="text-[8px] text-empire-player mt-0.5 font-mono">{sub}</div>}
    </div>
  );
};

const AxisBar = ({ label, val, color }) => (
  <div className="mb-2.5">
    <div className="flex justify-between text-[8px] font-mono text-tactical-text/60 mb-1">
      <span className="tracking-[0.15em]">{label}</span>
      <span className="tabular-nums font-bold" style={{ color }}>{val}<span className="text-tactical-text/45">/100</span></span>
    </div>
    <div className="h-1.5 bg-tactical-border/30 rounded-full overflow-hidden relative">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out relative"
        style={{
          width: `${val}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}40, 0 0 2px ${color}80`,
        }}
      />
      {/* Animated pulse shimmer */}
      <div
        className="absolute top-0 h-full rounded-full opacity-40"
        style={{
          width: `${val}%`,
          background: `linear-gradient(90deg, transparent 0%, ${color}60 50%, transparent 100%)`,
          animation: 'pulse 2.5s ease-in-out infinite',
        }}
      />
    </div>
  </div>
);

// ---- Main Component ---- //

const EmpireLeftRail = () => {
  const store = useEmpireStore();
  const { size: railWidth, onMouseDown: onResizeStart } = useResizable({
    direction: 'horizontal',
    initialSize: 320,
    minSize: 260,
    maxSize: 600,
    storageKey: 'left-rail-width',
  });
  const [marketSearch, setMarketSearch] = useState('');
  const [marketSector, setMarketSector] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [routeView, setRouteView] = useState('list'); // 'list' | 'corridors' | 'build'
  const [selectedCorridor, setSelectedCorridor] = useState(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [selectedAcquisition, setSelectedAcquisition] = useState('built');
  const [rdFilter, setRdFilter] = useState('all');
  const [empireOverviewOpen, setEmpireOverviewOpen] = useState(false);
  const [structurePickerOpen, setStructurePickerOpen] = useState(false);

  // Price filter state for Market tab
  const [marketSort, setMarketSort] = useState('default');
  const [marketPriceMin, setMarketPriceMin] = useState('');
  const [marketPriceMax, setMarketPriceMax] = useState('');
  // Price filter state for Departments tab
  const [deptSort, setDeptSort] = useState('default');
  const [deptPriceMin, setDeptPriceMin] = useState('');
  const [deptPriceMax, setDeptPriceMax] = useState('');
  // Price filter state for R&D tab
  const [rndSort, setRndSort] = useState('default');
  const [rndPriceMin, setRndPriceMin] = useState('');
  const [rndPriceMax, setRndPriceMax] = useState('');
  // Price filter state for Routes tab (My Routes view)
  const [routeSort, setRouteSort] = useState('default');
  const [routePriceMin, setRoutePriceMin] = useState('');
  const [routePriceMax, setRoutePriceMax] = useState('');

  const handleTab = (tab) => store.setActiveTab(tab);

  // Compute total daily income (monthly values / 30)
  const DAILY_FACTOR = 1 / 30;
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const totalNodeIncome = playerNodes.reduce((s, n) => s + n.income, 0);
  const routeRevenue = store.routes.filter(r => r.active).reduce((s, r) => s + (r.monthlyRevenue || 0), 0);
  const sportsRevenue = store.sportsFranchises.filter(f => f.owned).reduce((s, f) => s + (f.monthlyRevenue || 0), 0);
  const totalDailyIncome = Math.round((totalNodeIncome + routeRevenue + sportsRevenue) * DAILY_FACTOR);

  return (
    <>
      <div
        className="fixed left-3 top-[52px] bottom-11 bg-tactical-bg/[0.94] border border-tactical-border/60 rounded-xl z-20 flex flex-col backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_60px_rgba(0,229,255,0.03)] overflow-hidden transition-transform duration-300"
        style={{ width: `${railWidth}px`, transform: store.leftRailOpen ? 'translateX(0)' : `translateX(-${railWidth + 24}px)` }}
      >
        {/* Resize handle — right edge */}
        <div
          onMouseDown={onResizeStart}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-30 group hover:bg-[#00e5ff]/20 transition-colors"
          title="Drag to resize"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-[#00e5ff]/20 group-hover:bg-[#00e5ff]/60 rounded-full transition-colors" />
        </div>
        {/* Top Section — Wallet */}
        <div className="p-3 border-b border-tactical-border/40">
          <div className="flex gap-2 mb-2.5">
            <WalletCard label="Personal" val={fmt(store.personalBalance)} variant="personal" />
            <WalletCard label="Company" val={fmt(store.companyBalance)} sub={`+${fmt(totalDailyIncome)}/day`} variant="company" />
          </div>
          <div className="bg-tactical-bg/60 border border-tactical-border/20 rounded-lg py-2 px-3 flex justify-between items-center">
            <span className="text-[8px] text-tactical-text/55 uppercase tracking-[0.2em] font-mono">Net Worth</span>
            <span className="text-sm font-bold text-tactical-text font-mono tabular-nums text-glow-cyan">{fmt(store.netWorth)}</span>
          </div>
          <button
            onClick={() => setEmpireOverviewOpen(true)}
            className="mt-2 w-full py-2 rounded-lg font-mono text-[8px] uppercase tracking-[0.2em] font-bold transition-all hover:brightness-125 flex items-center justify-center gap-2 bg-gradient-to-r from-[#00e5ff]/10 to-[#7c3aed]/10 border border-[#00e5ff]/30 text-[#00e5ff] hover:border-[#00e5ff]/60"
            style={{ boxShadow: '0 0 15px rgba(0,229,255,0.1)' }}
          >
            <span className="text-xs">◉</span> Empire Overview <span className="text-[7px] text-tactical-text/45 ml-1">⤢</span>
          </button>
        </div>

        {/* Middle Section — Axes */}
        <div className="p-3 border-b border-tactical-border/40">
          <div className="flex justify-between mb-3">
            <button onClick={() => setStructurePickerOpen(true)} className="text-[8px] text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-0.5 rounded font-mono tracking-[0.1em] hover:bg-[#7c3aed]/20 hover:brightness-125 transition-all cursor-pointer border border-transparent hover:border-[#7c3aed]/30">{store.structure} <span className="text-[6px] text-tactical-text/45 ml-0.5">▼</span></button>
            <span className="text-[9px] text-tactical-text/55 font-mono">TAX {(store.taxRate * 100).toFixed(0)}%</span>
          </div>

          <AxisBar label="GROWTH" val={store.growth} color="#00e5ff" />
          <AxisBar label="GOVERNANCE" val={store.governance} color="#10b981" />
          <AxisBar label="IMPACT" val={store.impact} color="#a78bfa" />
          <AxisBar label="POWER" val={store.power} color="#f59e0b" />

          <div className="flex justify-between mt-3 pt-2 border-t border-tactical-border/20">
            <span className="text-[8px] text-tactical-text/55 uppercase tracking-[0.15em] font-mono">
              Heat <span className="text-empire-rival font-bold text-[9px]">{store.heat}</span><span className="text-tactical-text/20">/100</span>
            </span>
            <span className="text-[8px] text-tactical-text/55 uppercase tracking-[0.15em] font-mono">
              Followers <span className="text-[#00e5ff] font-bold text-[9px]">{(store.followers).toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-tactical-border/40 overflow-x-auto overflow-y-hidden no-scrollbar shrink-0 bg-tactical-bg/40">
          {['overview', 'office', 'departments', 'assets', 'market', 'routes', 'transport', 'esg', 'politics', 'career', 'legal', 'rnd', 'funds', 'equity', 'defcon', 'shadow', 'perks', 'shopping', 'sports', 'divisions'].map((tab) => {
            const meta = TAB_META[tab];
            const isActive = store.activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTab(tab)}
                className={`px-1.5 py-2 text-[7px] uppercase tracking-[0.04em] font-mono border-b-2 whitespace-nowrap transition-all duration-200 flex-shrink-0 flex flex-col items-center gap-0.5 min-w-[2rem] ${
                  isActive
                    ? 'text-[#00e5ff] border-[#00e5ff] bg-[#00e5ff]/5 font-bold'
                    : 'text-tactical-text/60 border-transparent hover:text-tactical-text/80 hover:bg-white/[0.03]'
                }`}
              >
                <span className={`text-[10px] leading-none ${isActive ? 'text-glow-cyan' : ''}`}>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">

          {/* ── Office Tab: Condensed Urgent Briefing ── */}
          {store.activeTab === 'office' && (() => {
            // Dept levels
            const deptNames = ['HR', 'Trading', 'Marketing', 'R&D', 'Finance', 'Legal'];
            const deptLvl = {};
            deptNames.forEach(d => { deptLvl[d] = Math.min(store.projects.filter(p => p.dept === d && p.active).length, 4); });

            // Urgent emails (high + medium priority only)
            const urgentItems = [];
            const unassigned = Object.values(store.cards).filter(c => !c.assignedNodeId);
            if (unassigned.length > 0) urgentItems.push({ icon: '👤', text: `${unassigned.length} employee(s) unassigned`, color: '#f59e0b', tab: 'assets' });
            if (store.heat > 40) urgentItems.push({ icon: '🌡️', text: `Heat at ${store.heat}/100 — reduce exposure`, color: '#ef4444', tab: 'defcon' });
            if (store.ceoApproval < 50) urgentItems.push({ icon: '📉', text: `CEO approval low: ${store.ceoApproval}%`, color: '#f59e0b', tab: 'departments' });
            if (!store.companyCountry) urgentItems.push({ icon: '🏛️', text: 'No jurisdiction registered', color: '#f59e0b', tab: 'office' });
            if (store.governance < 30 && deptLvl.Legal >= 1) urgentItems.push({ icon: '⚖️', text: `Governance critically low: ${store.governance}`, color: '#ef4444', tab: 'esg' });
            const activeRD = store.rdProjects.filter(p => p.status === 'researching');
            if (activeRD.length > 0) urgentItems.push({ icon: '🔬', text: `${activeRD.length} R&D in progress`, color: '#7c3aed', tab: 'rnd' });
            const positions = Object.values(store.portfolio || {});
            if (positions.length > 0 && deptLvl.Trading >= 1) urgentItems.push({ icon: '📊', text: `${positions.length} open position(s)`, color: '#00e5ff', tab: 'assets' });

            // Quick advice (top 3)
            const quickAdvice = [];
            if (Object.values(store.nodes).filter(n => n.owner === 'player').length === 0) quickAdvice.push('Acquire your first node');
            else if (store.companyBalance < 10000) quickAdvice.push('Company cash low — focus on revenue');
            if (store.followers < 200 && deptLvl.Marketing >= 1) quickAdvice.push('Grow followers with campaigns');
            if (store.rdProjects.filter(p => p.status === 'completed').length === 0 && deptLvl['R&D'] >= 1) quickAdvice.push('Complete your first R&D project');
            if (store.taxRate > 0.25 && deptLvl.Finance >= 1) quickAdvice.push('Optimize tax rate — too high');

            return (
              <>
                <div className="text-[9px] text-tactical-text/55 mb-2.5 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#6366f1] inline-block" />
                  CEO Briefing <span className="text-[#6366f1]">({urgentItems.length} urgent)</span>
                </div>

                {/* Urgent Items */}
                {urgentItems.length === 0 && (
                  <div className="bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg p-3 mb-3 text-center">
                    <div className="text-[9px] font-mono text-[#10b981]">All clear — no urgent items</div>
                  </div>
                )}
                {urgentItems.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => item.tab && store.setActiveTab(item.tab)}
                    className="bg-[#0d1420] border border-tactical-border/30 hover:border-tactical-border/50 rounded-lg p-2.5 mb-2 cursor-pointer flex items-center gap-2.5 transition-all group"
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-[9px] font-mono text-tactical-text/80 group-hover:text-white transition-colors flex-1">{item.text}</span>
                    <span className="text-[7px] font-mono opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: item.color }}>→</span>
                  </div>
                ))}

                {/* Quick Advice */}
                {quickAdvice.length > 0 && (
                  <div className="mt-3 mb-3">
                    <div className="text-[7px] text-tactical-text/45 uppercase tracking-[0.15em] font-mono mb-1.5">Quick Advice</div>
                    {quickAdvice.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#a78bfa] mt-1.5 flex-shrink-0" />
                        <span className="text-[8px] font-mono text-tactical-text/60">{a}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Open Full Office button */}
                <button
                  onClick={() => store.setActiveTab('overview')}
                  className="w-full mt-2 mb-3 py-2 rounded-lg font-mono text-[8px] uppercase tracking-[0.15em] transition-all bg-[#6366f1]/10 border border-[#6366f1]/30 text-[#6366f1] hover:border-[#6366f1]/60 hover:brightness-125"
                >
                  Open Full Office in Empire Overview ⤢
                </button>

                <div className="border-t border-tactical-border/20 pt-3 mt-1">
                  <div className="text-[7px] text-tactical-text/45 uppercase tracking-[0.15em] font-mono mb-1.5">Empire Snapshot</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-2 text-center">
                      <div className="text-[7px] text-tactical-text/45 font-mono uppercase">Net Worth</div>
                      <div className="text-xs font-bold font-mono text-[#00e5ff]">{fmt(store.netWorth)}</div>
                    </div>
                    <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-2 text-center">
                      <div className="text-[7px] text-tactical-text/45 font-mono uppercase">Income</div>
                      <div className="text-xs font-bold font-mono text-[#10b981]">+{fmt(totalDailyIncome)}/day</div>
                    </div>
                    <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-2 text-center">
                      <div className="text-[7px] text-tactical-text/45 font-mono uppercase">Heat</div>
                      <div className="text-xs font-bold font-mono" style={{ color: store.heat > 50 ? '#ef4444' : '#10b981' }}>{store.heat}</div>
                    </div>
                    <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-2 text-center">
                      <div className="text-[7px] text-tactical-text/45 font-mono uppercase">Followers</div>
                      <div className="text-xs font-bold font-mono text-[#ec4899]">{store.followers.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* ── Overview Tab: Condensed Empire Summary ── */}
          {store.activeTab === 'overview' && (() => {
            const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
            const activeRoutes = store.routes.filter(r => r.active);
            const totalNodeIncome = playerNodes.reduce((s, n) => s + n.income, 0);
            const routeRevenue = activeRoutes.reduce((s, r) => s + (r.monthlyRevenue || 0), 0);
            const portfolioPositions = Object.values(store.portfolio || {});
            const portfolioValue = portfolioPositions.reduce((s, p) => s + p.quantity * p.avgCost, 0);
            const stakedFunds = store.funds.filter(f => (f.stakedAmount || 0) > 0);
            const totalStaked = stakedFunds.reduce((s, f) => s + (f.stakedAmount || 0), 0);
            const completedRD = store.rdProjects.filter(p => p.status === 'completed').length;
            const activeRD = store.rdProjects.filter(p => p.status === 'researching').length;
            const esgScore = Math.round(((store.impact * 0.6 + (100 - store.heat) * 0.4) + (store.governance * 0.5 + store.impact * 0.3 + store.ceoApproval * 0.2) + (store.governance * 0.7 + (100 - store.heat) * 0.3)) / 3);

            return (
              <>
                <div className="text-[9px] text-tactical-text/55 mb-2.5 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#00e5ff] inline-block" />
                  Empire Summary
                </div>

                {/* Financial snapshot */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-2">
                    <div className="text-[6px] text-tactical-text/45 font-mono uppercase">Net Worth</div>
                    <div className="text-sm font-bold font-mono text-[#00e5ff]">{fmt(store.netWorth)}</div>
                  </div>
                  <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-2">
                    <div className="text-[6px] text-tactical-text/45 font-mono uppercase">Daily Income</div>
                    <div className="text-sm font-bold font-mono text-[#10b981]">+{fmt(totalDailyIncome)}</div>
                  </div>
                </div>

                {/* Axes mini bars */}
                <div className="mb-3">
                  <div className="text-[7px] text-tactical-text/45 uppercase tracking-[0.15em] font-mono mb-1.5">Empire Axes</div>
                  {[
                    { label: 'Growth', val: store.growth, color: '#00e5ff' },
                    { label: 'Governance', val: store.governance, color: '#10b981' },
                    { label: 'Impact', val: store.impact, color: '#a78bfa' },
                    { label: 'Power', val: store.power, color: '#f59e0b' },
                  ].map(a => (
                    <div key={a.label} className="mb-1.5">
                      <div className="flex justify-between text-[7px] font-mono mb-0.5">
                        <span className="text-tactical-text/50">{a.label}</span>
                        <span style={{ color: a.color }} className="font-bold tabular-nums">{a.val}</span>
                      </div>
                      <div className="h-1 bg-tactical-border/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.val}%`, backgroundColor: a.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[
                    { label: 'Nodes', val: playerNodes.length, color: '#00e5ff' },
                    { label: 'Routes', val: activeRoutes.length, color: '#a78bfa' },
                    { label: 'Staff', val: Object.keys(store.cards).length, color: '#10b981' },
                    { label: 'Heat', val: store.heat, color: store.heat > 50 ? '#ef4444' : '#10b981' },
                    { label: 'ESG', val: esgScore, color: esgScore > 60 ? '#10b981' : '#f59e0b' },
                    { label: 'Tax', val: `${(store.taxRate * 100).toFixed(0)}%`, color: '#f59e0b' },
                  ].map(m => (
                    <div key={m.label} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-1.5 text-center">
                      <div className="text-[6px] text-tactical-text/45 font-mono uppercase">{m.label}</div>
                      <div className="text-[10px] font-bold font-mono" style={{ color: m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Quick breakdowns */}
                <div className="space-y-2 mb-3">
                  <div className="text-[7px] text-tactical-text/45 uppercase tracking-[0.15em] font-mono">Revenue Breakdown</div>
                  {[
                    { label: 'Node Income', val: fmt(totalNodeIncome), color: '#00e5ff' },
                    { label: 'Route Revenue', val: fmt(routeRevenue), color: '#a78bfa' },
                    { label: 'Portfolio Value', val: fmt(portfolioValue), color: '#7c3aed' },
                    { label: 'Fund Stakes', val: fmt(totalStaked), color: '#ec4899' },
                  ].filter(r => r.val !== '€0').map(r => (
                    <div key={r.label} className="flex justify-between text-[8px] font-mono bg-tactical-bg/40 rounded px-2 py-1.5">
                      <span className="text-tactical-text/50">{r.label}</span>
                      <span style={{ color: r.color }} className="tabular-nums font-bold">{r.val}</span>
                    </div>
                  ))}
                  {totalNodeIncome === 0 && routeRevenue === 0 && portfolioValue === 0 && totalStaked === 0 && (
                    <div className="text-[8px] text-tactical-text/25 font-mono text-center py-2">No revenue streams yet</div>
                  )}
                </div>

                {/* R&D + Activity */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-2">
                    <div className="text-[6px] text-tactical-text/45 font-mono uppercase mb-0.5">R&D</div>
                    <div className="text-[8px] font-mono text-tactical-text/60">{completedRD} done, {activeRD} active</div>
                  </div>
                  <div className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-2">
                    <div className="text-[6px] text-tactical-text/45 font-mono uppercase mb-0.5">Followers</div>
                    <div className="text-[8px] font-mono text-[#ec4899]">{store.followers.toLocaleString()}</div>
                  </div>
                </div>

                {/* Open full overview button */}
                <button
                  onClick={() => setEmpireOverviewOpen(true)}
                  className="w-full py-2 rounded-lg font-mono text-[8px] uppercase tracking-[0.15em] transition-all bg-gradient-to-r from-[#00e5ff]/10 to-[#7c3aed]/10 border border-[#00e5ff]/30 text-[#00e5ff] hover:border-[#00e5ff]/60 hover:brightness-125"
                >
                  Open Full Empire Overview ⤢
                </button>
              </>
            );
          })()}

          {store.activeTab === 'assets' && (
            <>
              <div className="text-[9px] text-tactical-text/55 mb-2.5 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#00e5ff] inline-block" />
                Owned Assets <span className="text-[#00e5ff]">({store.getOwnedNodes().length})</span>
              </div>
              {store.getOwnedNodes().length === 0 && (
                <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-4 text-center">
                  <div className="text-[20px] mb-2 opacity-40">▣</div>
                  <div className="text-[10px] text-tactical-text/60 font-mono mb-3">No assets acquired yet</div>
                  <div className="text-[8px] text-tactical-text/40 font-mono mb-4 leading-relaxed">
                    Browse the <span className="text-[#00e5ff]">MARKET</span> tab to find infrastructure nodes.
                    Click a node on the map to inspect and acquire it.
                  </div>
                  <button
                    onClick={() => store.setActiveTab('market')}
                    className="w-full py-2 rounded border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00e5ff] text-[9px] font-mono uppercase tracking-wider hover:bg-[#00e5ff]/20 transition-colors"
                  >
                    Browse Market ({store.getMarketNodes().length} available)
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-tactical-border/10 rounded p-2 text-center">
                      <div className="text-[7px] text-tactical-text/35 font-mono uppercase">Balance</div>
                      <div className="text-[10px] text-empire-player font-mono font-bold">{fmt(store.personalBalance)}</div>
                    </div>
                    <div className="bg-tactical-border/10 rounded p-2 text-center">
                      <div className="text-[7px] text-tactical-text/35 font-mono uppercase">Rival Nodes</div>
                      <div className="text-[10px] text-empire-rival font-mono font-bold">{store.getRivalNodes().length}</div>
                    </div>
                  </div>
                </div>
              )}
              {store.getOwnedNodes().map(n => {
                const dotColor = LEVEL_DOTS[(n.level - 1) % LEVEL_DOTS.length];
                return (
                  <div
                    key={n.id}
                    onClick={() => store.selectNode(n.id)}
                    className="bg-[#0d1420] border border-tactical-border/40 hover:border-[#00e5ff]/50 rounded-lg p-2.5 mb-2 cursor-pointer flex justify-between items-center transition-all duration-200 group"
                    style={{ '--hover-glow': `0 0 12px ${SECTOR_COL[n.type]}20` }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 16px ${SECTOR_COL[n.type]}15`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div className="flex items-center gap-2">
                      {/* Level indicator dot */}
                      <div className="flex flex-col gap-0.5 items-center">
                        {Array.from({ length: Math.min(n.level, 5) }, (_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: dotColor, boxShadow: `0 0 4px ${dotColor}60` }} />
                        ))}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-tactical-text group-hover:text-white transition-colors">{n.name}</div>
                        <div className="text-[7px] mt-0.5 font-mono tracking-wider uppercase" style={{ color: SECTOR_COL[n.type] }}>{n.type.replace('_', ' & ')}</div>
                      </div>
                    </div>
                    <div>
                      {n.status === 'building'
                        ? <span className="text-[8px] text-empire-rival font-mono tracking-wider animate-pulse">BUILDING</span>
                        : <span className="text-[10px] text-empire-player font-mono font-bold">{fmt(n.income)}<span className="text-tactical-text/45 text-[7px]">/day</span></span>
                      }
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {store.activeTab === 'departments' && (() => {
            const DEPTS = ['HR', 'Trading', 'Marketing', 'R&D', 'Finance', 'Legal'];
            const DEPT_ICONS = { HR: '👤', Trading: '📊', Marketing: '📣', 'R&D': '🔬', Finance: '💰', Legal: '⚖️' };
            const DEPT_REVENUE = { HR: 0, Trading: 0.35, Marketing: 0.15, 'R&D': 0, Finance: 0.25, Legal: 0.05 };
            const DEPT_BASE_COST = { HR: 8000, Trading: 15000, Marketing: 12000, 'R&D': 20000, Finance: 18000, Legal: 10000 };

            return (
            <>
              <div className="text-[9px] text-tactical-text/55 mb-2.5 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#7c3aed] inline-block" />
                Departments
              </div>
              {DEPTS.map(dept => {
                const c = DEPT_COL[dept] || '#64748b';
                const deptProjects = store.projects.filter(p => p.dept === dept);
                const completed = deptProjects.filter(p => p.active).length;
                const total = deptProjects.length;
                const level = Math.min(completed, 4);
                const nextProject = deptProjects.find(p => !p.active);
                const teamSize = completed + 1;
                const monthlyCost = DEPT_BASE_COST[dept] * teamSize;
                const monthlyRevenue = Math.round(store.monthlyIncome * (DEPT_REVENUE[dept] || 0));
                const canAfford = nextProject && store.companyBalance >= nextProject.cost;

                return (
                  <div
                    key={dept}
                    className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3 mb-2.5 transition-all duration-200 hover:bg-tactical-border/10 group"
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = c; e.currentTarget.style.boxShadow = `0 0 16px ${c}15`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(30, 37, 50, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{DEPT_ICONS[dept]}</span>
                        <div>
                          <div className="text-[11px] font-bold text-tactical-text group-hover:text-white transition-colors font-mono">{dept}</div>
                          <div className="text-[7px] font-mono uppercase tracking-widest mt-0.5" style={{ color: c }}>
                            Level {level} / 4
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 4 }, (_, i) => (
                          <div key={i} className="w-2 h-2 rounded-sm border" style={{
                            borderColor: i < level ? c : `${c}30`,
                            backgroundColor: i < level ? `${c}40` : 'transparent',
                          }} />
                        ))}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      <div className="text-center">
                        <div className="text-[6px] text-tactical-text/35 uppercase font-mono">Cost/day</div>
                        <div className="text-[9px] font-mono font-bold text-rose-400">{fmt(monthlyCost)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[6px] text-tactical-text/35 uppercase font-mono">Revenue</div>
                        <div className="text-[9px] font-mono font-bold text-emerald-400">{fmt(monthlyRevenue)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[6px] text-tactical-text/35 uppercase font-mono">Team</div>
                        <div className="text-[9px] font-mono font-bold text-tactical-text">{teamSize}</div>
                      </div>
                    </div>

                    {/* Upgrade / Create button */}
                    <div className="border-t border-tactical-border/20 pt-2">
                      {nextProject ? (
                        <button
                          onClick={() => store.startProject(nextProject.id)}
                          disabled={!canAfford}
                          className={`w-full py-1.5 rounded font-mono text-[8px] font-bold uppercase tracking-widest transition-all ${canAfford ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                          style={{ background: canAfford ? `${c}15` : '#333', color: c, border: `1px solid ${c}30` }}
                        >
                          {level === 0 ? 'Create' : 'Upgrade'} — {fmt(nextProject.cost)}
                        </button>
                      ) : (
                        <div className="text-[8px] font-mono text-[#10b981] bg-[#10b981]/10 py-1.5 rounded text-center font-bold border border-[#10b981]/20">
                          ✓ MAX LEVEL
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
            );
          })()}

          {store.activeTab === 'market' && (() => {
            const allMarket = store.getMarketNodes();
            const sectors = [...new Set(allMarket.map(n => n.type))];
            const preFiltered = allMarket.filter(n => {
              const matchSearch = !marketSearch || n.name.toLowerCase().includes(marketSearch.toLowerCase());
              const matchSector = marketSector === 'all' || n.type === marketSector;
              return matchSearch && matchSector;
            });
            const filtered = applyPriceFilter(preFiltered, 'capex', marketSort, marketPriceMin, marketPriceMax);
            return (
              <>
                <div className="text-[9px] text-tactical-text/55 mb-2 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-empire-market inline-block" />
                  Available Infrastructure <span className="text-empire-market">({filtered.length})</span>
                </div>

                {/* Search */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    placeholder="Search infrastructure..."
                    className="w-full bg-tactical-bg/80 border border-tactical-border/40 rounded-lg px-3 py-2 pl-7 text-[10px] text-tactical-text font-mono placeholder:text-tactical-text/20 outline-none focus:border-[#00e5ff]/50 transition-colors"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tactical-text/45 text-[10px]">⌕</span>
                  {marketSearch && (
                    <button onClick={() => setMarketSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-tactical-text/45 hover:text-white text-[10px] transition-colors">✕</button>
                  )}
                </div>

                {/* Sector filter pills */}
                <div className="flex gap-1 mb-3 flex-wrap">
                  <button
                    onClick={() => setMarketSector('all')}
                    className={`px-2 py-1 rounded text-[7px] font-mono uppercase tracking-wider transition-all ${
                      marketSector === 'all'
                        ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/40'
                        : 'bg-tactical-bg/50 text-tactical-text/45 border border-tactical-border/20 hover:text-tactical-text/60'
                    }`}
                  >All</button>
                  {sectors.map(s => (
                    <button
                      key={s}
                      onClick={() => setMarketSector(marketSector === s ? 'all' : s)}
                      className={`px-2 py-1 rounded text-[7px] font-mono uppercase tracking-wider transition-all ${
                        marketSector === s
                          ? 'border'
                          : 'bg-[#0d1420] border border-tactical-border/20 hover:text-tactical-text/60'
                      }`}
                      style={marketSector === s ? { color: SECTOR_COL[s], backgroundColor: `${SECTOR_COL[s]}15`, borderColor: `${SECTOR_COL[s]}50` } : { color: SECTOR_COL[s] ? `${SECTOR_COL[s]}80` : undefined }}
                    >{s.replace('_', ' ')}</button>
                  ))}
                </div>

                <PriceFilter sortBy={marketSort} setSortBy={setMarketSort} priceMin={marketPriceMin} setPriceMin={setMarketPriceMin} priceMax={marketPriceMax} setPriceMax={setMarketPriceMax} />

                {filtered.map(n => (
                  <div key={n.id} onClick={() => store.selectNode(n.id)} className="bg-[#0d1420] border border-[#ef444425] hover:border-[#ef4444]/60 rounded-lg p-3 mb-2.5 cursor-pointer transition-all duration-200 group hover:bg-[#ef4444]/[0.03]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-tactical-text group-hover:text-white transition-colors">{n.name}</span>
                      <span className="text-[7px] px-2 py-0.5 rounded font-mono uppercase tracking-wider" style={{ color: SECTOR_COL[n.type], backgroundColor: `${SECTOR_COL[n.type]}12`, border: `1px solid ${SECTOR_COL[n.type]}25` }}>{n.type.replace('_',' & ')}</span>
                    </div>
                    <div className="flex justify-between text-[9px] gap-2">
                      <span className="font-mono font-bold px-2 py-1 rounded bg-empire-market/10 border border-empire-market/20 text-empire-market">
                        CAPEX {fmt(n.capex || 0)}
                      </span>
                      <span className="font-mono font-bold px-2 py-1 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b]">
                        OPEX {fmt(n.opex || 0)}<span className="text-tactical-text/45 text-[7px]">/day</span>
                      </span>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-6 text-tactical-text/20 font-mono text-[10px]">No infrastructure matches your filter</div>
                )}
              </>
            );
          })()}

          {/* ── ROUTES TAB ── */}
          {store.activeTab === 'routes' && (() => {
            const allRoutes = store.routes;
            const typeFiltered = routeFilter === 'all' ? allRoutes : allRoutes.filter(r => r.type === routeFilter);
            const filteredRoutes = applyPriceFilter(typeFiltered, 'monthlyRevenue', routeSort, routePriceMin, routePriceMax);
            const activeCount = allRoutes.filter(r => r.active).length;
            const totalIncome = allRoutes.filter(r => r.active).reduce((sum, r) => sum + (r.monthlyRevenue || ROUTE_TYPE_META[r.type]?.income || 0), 0);

            const ACQ_META = {
              built:         { label: 'Build', icon: '\uD83D\uDD28', color: '#10b981', mult: '1x cost · full income', desc: 'Construct from scratch — full ownership' },
              bought:        { label: 'Buy',   icon: '\uD83D\uDCB0', color: '#00e5ff', mult: '1.5x cost · full income', desc: 'Acquire an existing route — premium price' },
              subcontracted: { label: 'Subcontract', icon: '\uD83D\uDCCB', color: '#f59e0b', mult: '0.6x cost · 50% income', desc: 'Hire a contractor — cheap but less revenue' },
              stolen:        { label: 'Steal', icon: '\u2620', color: '#ef4444', mult: '0.3x cost · 80% income · +heat', desc: 'Covert acquisition — risky, adds Heat' },
            };

            const UPGRADE_OPTIONS = [
              { name: 'Engine Overhaul',     cost: 50_000,  desc: '+Speed, +Capacity',    icon: '\u2699' },
              { name: 'Armored Escort',      cost: 75_000,  desc: '+Security',             icon: '\uD83D\uDEE1' },
              { name: 'Expanded Fleet',      cost: 100_000, desc: '+50% Capacity',         icon: '\uD83D\uDCE6' },
              { name: 'GPS Tracking Suite',   cost: 40_000,  desc: '+Security, -Risk',     icon: '\uD83D\uDCE1' },
              { name: 'Premium Cargo Bays',  cost: 120_000, desc: '+Revenue per trip',     icon: '\u2B50' },
            ];

            return (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-tactical-bg/60 border border-tactical-border/20 rounded-lg p-2 text-center">
                    <div className="text-[6px] text-tactical-text/40 uppercase tracking-wider font-mono">Active</div>
                    <div className="text-xs font-bold text-[#10b981] font-mono">{activeCount}<span className="text-tactical-text/20 text-[7px]">/{allRoutes.length}</span></div>
                  </div>
                  <div className="bg-tactical-bg/60 border border-tactical-border/20 rounded-lg p-2 text-center">
                    <div className="text-[6px] text-tactical-text/40 uppercase tracking-wider font-mono">Revenue</div>
                    <div className="text-xs font-bold text-[#00e5ff] font-mono">{fmt(totalIncome)}<span className="text-tactical-text/20 text-[6px]">/day</span></div>
                  </div>
                  <div className="bg-tactical-bg/60 border border-tactical-border/20 rounded-lg p-2 text-center">
                    <div className="text-[6px] text-tactical-text/40 uppercase tracking-wider font-mono">Corridors</div>
                    <div className="text-xs font-bold text-[#a78bfa] font-mono">{new Set(allRoutes.map(r => r.corridorId).filter(Boolean)).size}</div>
                  </div>
                </div>

                {/* View switcher */}
                <div className="flex gap-1 mb-3 bg-tactical-bg/40 p-0.5 rounded-lg border border-tactical-border/20">
                  {[
                    { id: 'list', label: 'My Routes' },
                    { id: 'corridors', label: 'Corridors' },
                    { id: 'build', label: '+ New' },
                  ].map(v => (
                    <button key={v.id} onClick={() => setRouteView(v.id)}
                      className={`flex-1 py-1.5 rounded-md font-mono text-[8px] uppercase tracking-widest transition-all ${
                        routeView === v.id ? 'bg-[#00e5ff]/10 text-[#00e5ff] font-bold' : 'text-tactical-text/45 hover:text-tactical-text/60'
                      }`}>{v.label}</button>
                  ))}
                </div>

                {/* ── MY ROUTES VIEW ── */}
                {routeView === 'list' && (
                  <>
                    <div className="flex gap-1 mb-2 flex-wrap">
                      <button onClick={() => setRouteFilter('all')} className={`px-2 py-0.5 rounded text-[7px] font-mono transition-all ${routeFilter === 'all' ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/40' : 'text-tactical-text/45 border border-tactical-border/20'}`}>All</button>
                      {Object.entries(ROUTE_TYPE_META).map(([key, meta]) => (
                        <button key={key} onClick={() => setRouteFilter(routeFilter === key ? 'all' : key)}
                          className={`px-2 py-0.5 rounded text-[7px] font-mono transition-all flex items-center gap-1 ${routeFilter === key ? 'border' : 'border border-tactical-border/20'}`}
                          style={routeFilter === key ? { color: meta.color, backgroundColor: `${meta.color}15`, borderColor: `${meta.color}50` } : { color: `${meta.color}60` }}
                        ><span className="text-[8px]">{meta.icon}</span>{meta.label}</button>
                      ))}
                    </div>

                    <PriceFilter sortBy={routeSort} setSortBy={setRouteSort} priceMin={routePriceMin} setPriceMin={setRoutePriceMin} priceMax={routePriceMax} setPriceMax={setRoutePriceMax} label="€ rev" />

                    {filteredRoutes.map(r => {
                      const meta = ROUTE_TYPE_META[r.type] || ROUTE_TYPE_META.truck;
                      const corridor = TRADE_CORRIDORS.find(c => c.id === r.corridorId);
                      const fromNode = store.getNodeById(r.fromNodeId);
                      const toNode = store.getNodeById(r.toNodeId);
                      const revenue = r.monthlyRevenue || meta.income;
                      const lvl = r.level || 1;
                      return (
                        <div key={r.id} className={`bg-[#0d1420] border rounded-lg p-2.5 mb-2 transition-all ${r.active ? 'border-tactical-border/40' : 'border-tactical-border/25 opacity-50'}`}
                          style={r.active ? { borderLeftColor: meta.color, borderLeftWidth: '3px' } : {}}>
                          {/* Header */}
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{meta.icon}</span>
                              <span className="text-[9px] font-mono font-bold" style={{ color: meta.color }}>{meta.label}</span>
                              <span className="text-[7px] font-mono text-tactical-text/45 bg-tactical-bg/60 px-1 rounded">LV{lvl}</span>
                            </div>
                            <button onClick={() => store.toggleRoute(r.id)}
                              className={`text-[6px] font-mono px-1.5 py-0.5 rounded border ${r.active ? 'text-[#10b981] border-[#10b981]/30 bg-[#10b981]/10' : 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10'}`}
                            >{r.active ? 'ON' : 'OFF'}</button>
                          </div>
                          {/* Corridor name */}
                          {corridor && <div className="text-[7px] font-mono text-[#a78bfa] mb-1">{corridor.name}</div>}
                          {/* From → To */}
                          <div className="flex items-center gap-1 text-[7px] font-mono text-tactical-text/40 mb-1.5">
                            <span className="truncate max-w-[80px]">{fromNode?.name || corridor?.from || r.fromNodeId}</span>
                            <span style={{ color: meta.color }}>{'\u2192'}</span>
                            <span className="truncate max-w-[80px]">{toNode?.name || corridor?.to || r.toNodeId}</span>
                          </div>
                          {/* Stats bar */}
                          <div className="flex gap-2 text-[7px] font-mono mb-1.5">
                            <span className="text-[#00e5ff]">{fmt(revenue)}/day</span>
                            <span className="text-tactical-text/20">|</span>
                            <span className="text-tactical-text/40">SPD {r.speed || 5}</span>
                            <span className="text-tactical-text/20">|</span>
                            <span className="text-tactical-text/40">CAP {r.capacity || 100}t</span>
                            <span className="text-tactical-text/20">|</span>
                            <span className="text-tactical-text/40">SEC {r.security || 5}</span>
                          </div>
                          {/* Acquisition badge */}
                          {r.acquisition && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-[6px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border"
                                style={{ color: ACQ_META[r.acquisition]?.color, borderColor: `${ACQ_META[r.acquisition]?.color}30`, backgroundColor: `${ACQ_META[r.acquisition]?.color}10` }}>
                                {ACQ_META[r.acquisition]?.icon} {r.acquisition}
                              </span>
                              {(r.upgrades || []).length > 0 && (
                                <span className="text-[6px] font-mono text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded border border-[#f59e0b]/20">{r.upgrades.length} upgrades</span>
                              )}
                            </div>
                          )}
                          {/* Upgrade button */}
                          {r.active && lvl < 5 && (
                            <button onClick={() => {
                              const upg = UPGRADE_OPTIONS[Math.min(lvl - 1, UPGRADE_OPTIONS.length - 1)];
                              store.upgradeRoute(r.id, upg.name, upg.cost);
                            }}
                              className="w-full mt-1 py-1.5 rounded font-mono text-[7px] uppercase tracking-widest transition-all hover:brightness-125"
                              style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                              {UPGRADE_OPTIONS[Math.min(lvl - 1, UPGRADE_OPTIONS.length - 1)]?.icon} Upgrade to LV{lvl + 1} — {fmt(UPGRADE_OPTIONS[Math.min(lvl - 1, UPGRADE_OPTIONS.length - 1)]?.cost)}
                            </button>
                          )}
                          {lvl >= 5 && <div className="text-[7px] font-mono text-[#f59e0b] text-center mt-1">{'\u2B50'} MAX LEVEL</div>}
                        </div>
                      );
                    })}
                    {filteredRoutes.length === 0 && <div className="text-center py-6 text-tactical-text/20 font-mono text-[10px]">No routes match filter</div>}
                  </>
                )}

                {/* ── CORRIDORS VIEW ── */}
                {routeView === 'corridors' && (
                  <>
                    <div className="text-[7px] text-tactical-text/45 mb-2 font-mono uppercase tracking-[0.15em]">Global Trade Corridors</div>
                    {TRADE_CORRIDORS.map(c => {
                      const existingRoutes = allRoutes.filter(r => r.corridorId === c.id);
                      const riskColor = c.risk === 'low' ? '#10b981' : c.risk === 'medium' ? '#f59e0b' : '#ef4444';
                      return (
                        <div key={c.id} className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3 mb-2 hover:border-tactical-border/50 transition-all cursor-pointer"
                          onClick={() => { setSelectedCorridor(c); setRouteView('build'); }}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold text-tactical-text font-mono">{c.name}</span>
                            <span className="text-[7px] font-mono px-1.5 py-0.5 rounded border" style={{ color: riskColor, borderColor: `${riskColor}30`, backgroundColor: `${riskColor}10` }}>{c.risk} risk</span>
                          </div>
                          <div className="flex items-center gap-1 text-[8px] font-mono text-tactical-text/50 mb-2">
                            <span>{c.from}</span>
                            <span className="text-[#a78bfa]">{'\u2192'}</span>
                            <span>{c.to}</span>
                            <span className="text-tactical-text/20 ml-auto">{c.distance.toLocaleString()} km</span>
                          </div>
                          <div className="flex gap-1 mb-1.5">
                            {c.availableTypes.map(t => (
                              <span key={t} className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{ color: ROUTE_TYPE_META[t]?.color, backgroundColor: `${ROUTE_TYPE_META[t]?.color}15` }}>
                                {ROUTE_TYPE_META[t]?.icon} {ROUTE_TYPE_META[t]?.label}
                              </span>
                            ))}
                          </div>
                          {existingRoutes.length > 0 && (
                            <div className="text-[7px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded inline-block">{existingRoutes.length} route{existingRoutes.length > 1 ? 's' : ''} active</div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* ── BUILD VIEW ── */}
                {routeView === 'build' && (
                  <>
                    <button onClick={() => { setRouteView('corridors'); setSelectedCorridor(null); setSelectedTransport(null); }}
                      className="text-[9px] font-mono text-tactical-text/55 hover:text-white mb-3 flex items-center gap-1 transition-colors">{'\u2190'} Back to corridors</button>

                    {!selectedCorridor ? (
                      <>
                        <div className="text-[9px] text-tactical-text/55 mb-2 font-mono uppercase tracking-widest">Select a Trade Corridor</div>
                        {TRADE_CORRIDORS.map(c => (
                          <button key={c.id} onClick={() => setSelectedCorridor(c)}
                            className="w-full bg-[#0d1420] border border-tactical-border/30 rounded-lg p-2.5 mb-2 text-left hover:border-[#a78bfa]/40 transition-all">
                            <div className="text-[9px] font-bold text-tactical-text font-mono">{c.name}</div>
                            <div className="text-[8px] text-tactical-text/55 font-mono">{c.from} {'\u2192'} {c.to} · {c.distance.toLocaleString()} km</div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/30 rounded-lg p-3 mb-3">
                          <div className="text-[10px] font-mono font-bold text-[#a78bfa] mb-1">{selectedCorridor.name}</div>
                          <div className="text-[8px] font-mono text-tactical-text/50">{selectedCorridor.from} {'\u2192'} {selectedCorridor.to} · {selectedCorridor.distance.toLocaleString()} km</div>
                        </div>

                        {/* Step 1: Transport method */}
                        <div className="text-[9px] text-tactical-text/55 mb-2 font-mono uppercase tracking-widest">1. Transport Method</div>
                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                          {selectedCorridor.availableTypes.map(t => {
                            const meta = ROUTE_TYPE_META[t];
                            const isSelected = selectedTransport === t;
                            return (
                              <button key={t} onClick={() => setSelectedTransport(t)}
                                className={`p-2 rounded-lg border text-left transition-all ${isSelected ? '' : 'border-tactical-border/20 hover:border-opacity-40'}`}
                                style={isSelected ? { borderColor: meta.color, backgroundColor: `${meta.color}10`, boxShadow: `0 0 12px ${meta.color}15` } : {}}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-sm">{meta.icon}</span>
                                  <span className="text-[9px] font-mono font-bold" style={{ color: meta.color }}>{meta.label}</span>
                                </div>
                                <div className="text-[8px] text-tactical-text/55 font-mono">{meta.desc}</div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedTransport && (
                          <>
                            {/* Step 2: Acquisition method */}
                            <div className="text-[9px] text-tactical-text/55 mb-2 font-mono uppercase tracking-widest">2. Acquisition Method</div>
                            <div className="flex flex-col gap-1.5 mb-3">
                              {Object.entries(ACQ_META).map(([key, acq]) => {
                                const isSelected = selectedAcquisition === key;
                                return (
                                  <button key={key} onClick={() => setSelectedAcquisition(key)}
                                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-3 ${isSelected ? '' : 'border-tactical-border/20 hover:border-opacity-40'}`}
                                    style={isSelected ? { borderColor: acq.color, backgroundColor: `${acq.color}08`, boxShadow: `0 0 10px ${acq.color}10` } : {}}>
                                    <span className="text-lg">{acq.icon}</span>
                                    <div className="flex-1">
                                      <div className="text-[9px] font-mono font-bold" style={{ color: acq.color }}>{acq.label}</div>
                                      <div className="text-[7px] text-tactical-text/45 font-mono">{acq.mult}</div>
                                      <div className="text-[8px] text-tactical-text/55 font-mono mt-0.5">{acq.desc}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Cost summary + confirm */}
                            {(() => {
                              const baseCost = ROUTE_TYPE_META[selectedTransport].buildCost;
                              const acqMult = { built: 1, bought: 1.5, subcontracted: 0.6, stolen: 0.3 };
                              const incMult = { built: 1, bought: 1, subcontracted: 0.5, stolen: 0.8 };
                              const totalCost = Math.round(baseCost * (acqMult[selectedAcquisition] || 1));
                              const monthlyRev = Math.round(ROUTE_TYPE_META[selectedTransport].income * (incMult[selectedAcquisition] || 1));
                              const canAfford = store.companyBalance >= totalCost;
                              return (
                                <div className="bg-tactical-bg/80 border border-tactical-border/30 rounded-lg p-3 mb-2">
                                  <div className="text-[7px] text-tactical-text/45 font-mono uppercase tracking-widest mb-2">Cost Summary</div>
                                  <div className="flex justify-between text-[9px] font-mono mb-1">
                                    <span className="text-tactical-text/60">Total Cost</span>
                                    <span className={`font-bold ${canAfford ? 'text-white' : 'text-[#ef4444]'}`}>{fmt(totalCost)}</span>
                                  </div>
                                  <div className="flex justify-between text-[9px] font-mono mb-1">
                                    <span className="text-tactical-text/60">Weekly Revenue</span>
                                    <span className="text-[#10b981] font-bold">+{fmt(monthlyRev)}/day</span>
                                  </div>
                                  {selectedAcquisition === 'stolen' && (
                                    <div className="flex justify-between text-[9px] font-mono mb-1">
                                      <span className="text-tactical-text/60">Heat Gain</span>
                                      <span className="text-[#ef4444] font-bold">+15</span>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      store.buildRoute(
                                        selectedCorridor.fromLat.toString(),
                                        selectedCorridor.toLat.toString(),
                                        selectedTransport,
                                        selectedCorridor.id,
                                        selectedAcquisition
                                      );
                                      setRouteView('list');
                                      setSelectedCorridor(null);
                                      setSelectedTransport(null);
                                    }}
                                    disabled={!canAfford}
                                    className={`w-full mt-2 py-2 rounded-lg font-mono text-[9px] font-bold uppercase tracking-widest transition-all ${canAfford ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                                    style={{ background: canAfford ? `${ACQ_META[selectedAcquisition].color}20` : '#333', color: ACQ_META[selectedAcquisition].color, border: `1px solid ${ACQ_META[selectedAcquisition].color}40` }}>
                                    {canAfford ? `${ACQ_META[selectedAcquisition].label} Route — ${fmt(totalCost)}` : 'INSUFFICIENT FUNDS'}
                                  </button>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            );
          })()}

          {/* ── TRANSPORT TAB ── */}
          {store.activeTab === 'transport' && (
            <TransportEmpire />
          )}

          {/* ── ESG TAB ── */}
          {store.activeTab === 'esg' && (() => {
            // ESG scoring based on current axes
            const envScore = Math.round(store.impact * 0.8 + store.governance * 0.2);
            const socScore = Math.round(store.governance * 0.5 + store.impact * 0.3 + (100 - store.heat) * 0.2);
            const govScore = Math.round(store.governance * 0.7 + (100 - store.heat) * 0.3);
            const overallESG = Math.round((envScore + socScore + govScore) / 3);

            const getGrade = (score) => score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';
            const getColor = (score) => score >= 80 ? '#10b981' : score >= 60 ? '#00e5ff' : score >= 40 ? '#f59e0b' : '#ef4444';

            const ownedCount = store.getOwnedNodes().length;
            const greenNodes = store.getOwnedNodes().filter(n => ['energy', 'education', 'healthcare'].includes(n.type)).length;
            const carbonIntensity = store.getOwnedNodes().filter(n => ['oil_gas', 'manufacturing'].includes(n.type)).length;

            return (
              <>
                <div className="text-[9px] text-tactical-text/55 mb-2.5 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#10b981] inline-block" />
                  ESG Dashboard
                </div>

                {/* Overall ESG Score Ring */}
                <div className="bg-tactical-bg/60 rounded-lg p-4 mb-3 text-center border border-[#10b981]/10 relative overflow-hidden">
                  <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center relative mb-2"
                    style={{ background: `conic-gradient(from 0deg, ${getColor(overallESG)} ${overallESG}%, transparent ${overallESG}%, transparent)`, padding: '3px' }}
                  >
                    <div className="w-full h-full rounded-full bg-tactical-bg flex items-center justify-center flex-col">
                      <span className="text-[24px] font-mono font-black leading-none" style={{ color: getColor(overallESG), textShadow: `0 0 15px ${getColor(overallESG)}40` }}>{getGrade(overallESG)}</span>
                      <span className="text-[9px] text-tactical-text/55 font-mono">{overallESG}/100</span>
                    </div>
                  </div>
                  <div className="text-[7px] text-tactical-text/45 uppercase tracking-[0.2em] font-mono">Overall ESG Rating</div>
                </div>

                {/* E, S, G breakdown */}
                <div className="flex flex-col gap-2 mb-3">
                  {[
                    { label: 'Environmental', score: envScore, icon: '\uD83C\uDF3F', tip: 'Green energy nodes, low carbon footprint' },
                    { label: 'Social', score: socScore, icon: '\uD83E\uDD1D', tip: 'Low heat, community impact, governance' },
                    { label: 'Governance', score: govScore, icon: '\uD83C\uDFDB', tip: 'Strong governance axis, transparency' },
                  ].map(({ label, score, icon, tip }) => (
                    <div key={label} className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{icon}</span>
                          <span className="text-[9px] font-mono font-bold text-tactical-text tracking-wider">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black" style={{ color: getColor(score) }}>{getGrade(score)}</span>
                          <span className="text-[9px] font-mono text-tactical-text/55">{score}/100</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-tactical-border/30 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${getColor(score)}88, ${getColor(score)})`, boxShadow: `0 0 8px ${getColor(score)}40` }} />
                      </div>
                      <div className="text-[7px] text-tactical-text/45 font-mono mt-1.5">{tip}</div>
                    </div>
                  ))}
                </div>

                {/* Portfolio Impact */}
                <div className="text-[7px] text-tactical-text/45 mb-2 font-mono uppercase tracking-[0.15em]">Portfolio Composition</div>
                <div className="bg-[#0d1420] border border-tactical-border/20 rounded-lg p-3 mb-3">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                      <span className="text-[8px] font-mono text-tactical-text/60">Green Assets</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-[#10b981]">{greenNodes}<span className="text-tactical-text/45">/{ownedCount}</span></span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                      <span className="text-[8px] font-mono text-tactical-text/60">Carbon Intensive</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-[#ef4444]">{carbonIntensity}<span className="text-tactical-text/45">/{ownedCount}</span></span>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-tactical-border"></span>
                      <span className="text-[8px] font-mono text-tactical-text/60">Other</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-tactical-text/50">{ownedCount - greenNodes - carbonIntensity}<span className="text-tactical-text/45">/{ownedCount}</span></span>
                  </div>
                </div>

                {/* ESG Tips */}
                <div className="text-[7px] text-tactical-text/45 mb-2 font-mono uppercase tracking-[0.15em]">Improvement Actions</div>
                {[
                  { text: 'Acquire renewable energy infrastructure', impact: '+Environmental', color: '#10b981', locked: greenNodes < 2 },
                  { text: 'Reduce Heat level below 30', impact: '+Social', color: '#00e5ff', locked: store.heat > 30 },
                  { text: 'Complete compliance department projects', impact: '+Governance', color: '#a78bfa', locked: govScore < 60 },
                  { text: 'Divest from carbon-intensive assets', impact: '+Environmental', color: '#10b981', locked: carbonIntensity > 0 },
                ].map((tip, i) => (
                  <div key={i} className={`bg-[#0d1420] border rounded-lg p-2.5 mb-2 ${tip.locked ? 'border-tactical-border/20' : 'border-[#10b981]/30 bg-[#10b981]/[0.03]'}`}>
                    <div className="text-[9px] font-mono text-tactical-text mb-1">{tip.text}</div>
                    <div className="flex justify-between">
                      <span className="text-[7px] font-mono font-bold" style={{ color: tip.color }}>{tip.impact}</span>
                      {tip.locked
                        ? <span className="text-[7px] font-mono text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded border border-[#f59e0b]/20">IN PROGRESS</span>
                        : <span className="text-[7px] font-mono text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded border border-[#10b981]/20">ACHIEVED</span>
                      }
                    </div>
                  </div>
                ))}
              </>
            );
          })()}

          {/* ── R&D TAB ── */}
          {store.activeTab === 'rnd' && (() => {
            const projects = store.rdProjects || [];
            const categories = ['all', 'production', 'transport', 'market', 'security', 'green'];
            const catFiltered = rdFilter === 'all' ? projects : projects.filter(p => p.category === rdFilter);
            const filtered = applyPriceFilter(catFiltered, 'cost', rndSort, rndPriceMin, rndPriceMax);
            const activeResearch = projects.filter(p => p.status === 'researching');
            const completed = projects.filter(p => p.status === 'completed');

            const CAT_META = {
              production: { icon: '\u2699', color: '#f59e0b', label: 'Production' },
              transport:  { icon: '\uD83D\uDE80', color: '#a78bfa', label: 'Transport' },
              market:     { icon: '\uD83D\uDCC8', color: '#00e5ff', label: 'Market' },
              security:   { icon: '\uD83D\uDEE1', color: '#ef4444', label: 'Security' },
              green:      { icon: '\uD83C\uDF3F', color: '#10b981', label: 'Green Tech' },
            };

            return (
              <>
                <div className="text-[9px] text-tactical-text/55 mb-2 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#7c3aed] inline-block" />
                  Research & Development
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-tactical-bg/60 border border-tactical-border/20 rounded-lg p-2 text-center">
                    <div className="text-[6px] text-tactical-text/40 uppercase font-mono">Active</div>
                    <div className="text-xs font-bold text-[#f59e0b] font-mono">{activeResearch.length}</div>
                  </div>
                  <div className="bg-tactical-bg/60 border border-tactical-border/20 rounded-lg p-2 text-center">
                    <div className="text-[6px] text-tactical-text/40 uppercase font-mono">Complete</div>
                    <div className="text-xs font-bold text-[#10b981] font-mono">{completed.length}</div>
                  </div>
                  <div className="bg-tactical-bg/60 border border-tactical-border/20 rounded-lg p-2 text-center">
                    <div className="text-[6px] text-tactical-text/40 uppercase font-mono">Available</div>
                    <div className="text-xs font-bold text-[#7c3aed] font-mono">{projects.filter(p => p.status === 'available').length}</div>
                  </div>
                </div>

                {/* Active research progress */}
                {activeResearch.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[7px] text-[#f59e0b] font-mono uppercase tracking-widest mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full animate-pulse"></span> In Progress
                    </div>
                    {activeResearch.map(p => {
                      const cm = CAT_META[p.category];
                      return (
                        <div key={p.id} className="bg-[#f59e0b]/[0.04] border border-[#f59e0b]/20 rounded-lg p-2.5 mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-mono font-bold text-white">{p.name}</span>
                            <span className="text-[8px] font-mono text-[#f59e0b] font-bold">{p.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-tactical-border/30 rounded-full overflow-hidden mb-1">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${cm?.color}88, ${cm?.color})`, boxShadow: `0 0 8px ${cm?.color}40` }} />
                          </div>
                          <div className="text-[7px] font-mono text-tactical-text/40">{p.effect}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Category filter */}
                <div className="flex gap-1 mb-3 flex-wrap">
                  {categories.map(cat => {
                    const cm = CAT_META[cat];
                    return (
                      <button key={cat} onClick={() => setRdFilter(cat)}
                        className={`px-2 py-0.5 rounded text-[7px] font-mono uppercase tracking-wider transition-all ${
                          rdFilter === cat
                            ? cat === 'all' ? 'bg-[#7c3aed]/15 text-[#7c3aed] border border-[#7c3aed]/40' : 'border'
                            : 'border border-tactical-border/20 text-tactical-text/45 hover:text-tactical-text/60'
                        }`}
                        style={rdFilter === cat && cm ? { color: cm.color, backgroundColor: `${cm.color}15`, borderColor: `${cm.color}50` } : cm ? { color: `${cm.color}60` } : {}}
                      >{cm ? `${cm.icon} ${cm.label}` : 'All'}</button>
                    );
                  })}
                </div>

                <PriceFilter sortBy={rndSort} setSortBy={setRndSort} priceMin={rndPriceMin} setPriceMin={setRndPriceMin} priceMax={rndPriceMax} setPriceMax={setRndPriceMax} />

                {/* Project list */}
                {filtered.map(p => {
                  const cm = CAT_META[p.category] || CAT_META.production;
                  const isAvailable = p.status === 'available';
                  const isCompleted = p.status === 'completed';
                  const canAfford = store.companyBalance >= p.cost;
                  return (
                    <div key={p.id} className={`bg-[#0d1420] border rounded-lg p-3 mb-2 transition-all ${isCompleted ? 'border-[#10b981]/30 bg-[#10b981]/[0.03]' : 'border-tactical-border/30'}`}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{cm.icon}</span>
                          <span className="text-[9px] font-mono font-bold text-tactical-text">{p.name}</span>
                        </div>
                        <span className="text-[7px] font-mono px-1.5 py-0.5 rounded border"
                          style={{ color: cm.color, borderColor: `${cm.color}30`, backgroundColor: `${cm.color}10` }}>{cm.label}</span>
                      </div>
                      <div className="text-[8px] text-tactical-text/55 font-mono mb-2 leading-relaxed">{p.description}</div>
                      <div className="flex items-center gap-3 text-[7px] font-mono text-tactical-text/50 mb-2">
                        <span>{'\u23F1'} {fmtGameTime(p.duration)}</span>
                        <span className="text-tactical-text/20">|</span>
                        <span style={{ color: cm.color }}>{p.effect}</span>
                      </div>
                      {isCompleted ? (
                        <div className="text-[8px] font-mono text-[#10b981] bg-[#10b981]/10 py-1.5 rounded text-center font-bold border border-[#10b981]/20">{'\u2713'} RESEARCH COMPLETE</div>
                      ) : p.status === 'researching' ? (
                        <>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex-1 h-1.5 bg-tactical-border/30 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${cm.color}88, ${cm.color})` }} />
                            </div>
                            <span className="text-[7px] font-mono text-tactical-text/40">{Math.round(p.progress)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[6px] font-mono text-tactical-text/30 flex-1">
                              {fmtGameTime(Math.ceil(((100 - p.progress) / 100) * p.duration))} left
                            </span>
                            {(() => {
                              const remFrac = (100 - p.progress) / 100;
                              const rushCost = Math.round(p.cost * 0.75 * remFrac);
                              const canRush = store.companyBalance >= rushCost;
                              return (
                                <button
                                  onClick={() => store.accelerateResearch(p.id)}
                                  disabled={!canRush}
                                  className={`px-2 py-0.5 rounded font-mono text-[6px] font-bold uppercase tracking-widest transition-all ${canRush ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                                  style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}
                                  title={canRush ? `Pay ${fmt(rushCost)} to complete instantly` : `Need ${fmt(rushCost)}`}
                                >
                                  {'\u26A1'} Rush {fmt(rushCost)}
                                </button>
                              );
                            })()}
                          </div>
                        </>
                      ) : (
                        <button onClick={() => store.startResearch(p.id)}
                          disabled={!canAfford}
                          className={`w-full py-1.5 rounded font-mono text-[8px] font-bold uppercase tracking-widest transition-all ${canAfford ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                          style={{ background: canAfford ? `${cm.color}15` : '#333', color: cm.color, border: `1px solid ${cm.color}30` }}>
                          {canAfford ? `Start Research — ${fmt(p.cost)}` : `NEED ${fmt(p.cost)}`}
                        </button>
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && <div className="text-center py-6 text-tactical-text/20 font-mono text-[10px]">No projects in this category</div>}
              </>
            );
          })()}

          {store.activeTab === 'defcon' && (
            <>
              <div className="text-[8px] text-empire-market mb-3 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                <span className="text-[10px]">{'\u26A0'}</span>
                DEFCON Warfare Panel
              </div>

              {/* Heat Level Display */}
              <div className="bg-tactical-bg/60 rounded-lg p-4 mb-3 text-center border border-empire-rival/10 relative overflow-hidden">
                {/* Gradient glow ring */}
                <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center relative mb-2"
                  style={{
                    background: `conic-gradient(from 0deg, #10b981, #f59e0b ${store.heat}%, #ef4444 ${Math.min(store.heat + 20, 100)}%, transparent ${Math.min(store.heat + 30, 100)}%, transparent)`,
                    padding: '3px',
                  }}
                >
                  <div className="w-full h-full rounded-full bg-tactical-bg flex items-center justify-center">
                    <span
                      className="text-[28px] font-mono font-black leading-none tabular-nums"
                      style={{
                        color: store.heat > 70 ? '#ef4444' : store.heat > 40 ? '#f59e0b' : '#10b981',
                        textShadow: `0 0 20px ${store.heat > 70 ? 'rgba(239,68,68,0.5)' : store.heat > 40 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.3)'}`,
                      }}
                    >
                      {store.heat}
                    </span>
                  </div>
                </div>
                <div className="text-[7px] text-tactical-text/45 uppercase tracking-[0.2em] font-mono mb-2">Heat Level</div>
                <div className="h-1.5 bg-tactical-border/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${store.heat}%`,
                      background: 'linear-gradient(90deg, #10b981, #f59e0b 50%, #ef4444)',
                      boxShadow: '0 0 8px rgba(239,68,68,0.3)',
                    }}
                  />
                </div>
              </div>

              <div className="text-[7px] text-tactical-text/45 mb-2 font-mono uppercase tracking-[0.15em]">Banking Network</div>
              {BANKS.map(b => {
                const isActive = store.activeBanks?.includes(b.id);
                const deposited = store.bankDeposits?.[b.id] ?? 0;
                const auditPct = Math.round(b.auditMod * 100);
                return (
                  <div key={b.id} className={`rounded-lg p-3 mb-2 transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-[#10b981]/[0.06] border-[#10b981]/30'
                      : 'bg-[#0d1420] border-tactical-border/20 hover:border-tactical-border/50'
                  }`}
                    onClick={() => {
                      if (!isActive) store.openBankAccount(b.id);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">{b.flag}</span>
                        <span className="text-[10px] font-bold text-tactical-text font-mono">{b.name}</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                        style={{ color: auditPct <= 50 ? '#ef4444' : auditPct <= 80 ? '#f59e0b' : '#10b981', backgroundColor: auditPct <= 50 ? '#ef444418' : auditPct <= 80 ? '#f59e0b18' : '#10b98118' }}>
                        Audit: {auditPct}%
                      </span>
                    </div>
                    <p className="text-[8px] text-tactical-text/50 leading-relaxed mb-2 font-mono">{b.desc}</p>

                    {/* Pros / Cons */}
                    <div className="grid grid-cols-2 gap-1.5 text-[7px] font-mono">
                      <div>
                        {(b.pros || []).slice(0, 3).map((p, i) => (
                          <div key={i} className="text-[#10b981] flex gap-1 mb-0.5"><span>+</span><span>{p}</span></div>
                        ))}
                      </div>
                      <div>
                        {(b.cons || []).slice(0, 2).map((c, i) => (
                          <div key={i} className="text-[#ef4444] flex gap-1 mb-0.5"><span>-</span><span>{c}</span></div>
                        ))}
                      </div>
                    </div>

                    {/* Conditions */}
                    {b.conditions && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {b.conditions.map((cond, i) => (
                          <span key={i} className="text-[7px] px-1.5 py-0.5 rounded font-mono"
                            style={{ backgroundColor: '#7c3aed12', color: '#a78bfa', border: '1px solid #7c3aed25' }}>
                            {cond}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rates row */}
                    <div className="flex gap-3 mt-2 text-[7px] font-mono text-tactical-text/40">
                      <span>Deposit: <span className="text-[#10b981]">{(b.depositRate * 100).toFixed(1)}%</span></span>
                      <span>Loan: <span className="text-[#f59e0b]">{(b.loanRate * 100).toFixed(1)}%</span></span>
                      <span>Penalty: <span className="text-[#ef4444]">{b.penaltyMod}x</span></span>
                    </div>

                    {/* Active account info & actions */}
                    {isActive && (
                      <div className="mt-2 pt-2 border-t border-tactical-border/20">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[7px] text-[#10b981] font-mono uppercase tracking-wider">✓ Active Account</span>
                          {deposited > 0 && <span className="text-[8px] text-tactical-text/60 font-mono">€{deposited.toLocaleString()}</span>}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); store.depositToBank(b.id, Math.min(50000, store.companyBalance)); }}
                            className="flex-1 py-1 rounded text-[7px] font-mono uppercase tracking-wider border border-[#10b981]/20 bg-[#10b981]/5 text-[#10b981]/80 hover:bg-[#10b981]/10 transition-all"
                          >
                            Deposit €50K
                          </button>
                          {deposited > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); store.withdrawFromBank(b.id, Math.min(50000, deposited)); }}
                              className="flex-1 py-1 rounded text-[7px] font-mono uppercase tracking-wider border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-[#f59e0b]/80 hover:bg-[#f59e0b]/10 transition-all"
                            >
                              Withdraw
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); store.closeBankAccount(b.id); }}
                            className="px-2 py-1 rounded text-[7px] font-mono uppercase tracking-wider border border-[#ef4444]/20 bg-[#ef4444]/5 text-[#ef4444]/60 hover:bg-[#ef4444]/10 transition-all"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                    {!isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); store.openBankAccount(b.id); }}
                        className="w-full mt-2 py-1.5 rounded text-[7px] font-mono uppercase tracking-wider border border-[#00e5ff]/20 bg-[#00e5ff]/5 text-[#00e5ff]/80 hover:bg-[#00e5ff]/10 transition-all"
                      >
                        Open Account
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="text-[7px] text-empire-market/60 mb-2 mt-3 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-empire-market animate-pulse inline-block" />
                Available Operations
              </div>
              {store.crimes.map(c => (
                <div key={c.id} className="bg-[#ef4444]/[0.03] border border-[#ef444420] hover:border-[#ef4444]/50 rounded-lg p-2.5 mb-2 cursor-pointer transition-all duration-200 group hover:bg-[#ef4444]/[0.06]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-empire-market font-mono group-hover:text-[#ff6b6b] transition-colors">{c.name}</span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded font-mono font-bold bg-empire-rival/10 border border-empire-rival/20 text-empire-rival">+{c.heatGain} heat</span>
                  </div>
                  <div className="text-[7px] text-tactical-text/35 mt-1 font-mono flex gap-2">
                    <span className="text-empire-market/60">DET {c.detectionPct}%</span>
                    <span className="text-tactical-text/20">|</span>
                    <span className="text-empire-rival/60">PEN x{c.penaltyMultiplier}</span>
                    <span className="text-tactical-text/20">|</span>
                    <span className="text-[#7c3aed]/60">{c.axisHit}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Removed placeholder logic */}

          {store.activeTab === 'politics' && (
            <>
              <div className="text-[8px] text-[#a78bfa] mb-3 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                <span className="text-[10px]">🏛</span>
                Corporate Politics & Influence
              </div>
              <PoliticsPanel />
            </>
          )}

          {store.activeTab === 'career' && (
            <>
              <div className="text-[8px] text-[#ec4899] mb-3 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                <span className="text-[10px]">🎖</span>
                Political Career
              </div>
              <PersonalPoliticsPanel />
            </>
          )}

          {store.activeTab === 'legal' && (
            <>
              <div className="text-[8px] text-[#f59e0b] mb-3 uppercase tracking-[0.15em] font-mono flex items-center gap-1.5">
                <span className="text-[10px]">{'\u2696'}</span>
                Bureaucracy & Legal
              </div>
              <BureaucracyPanel />
            </>
          )}

        </div>
      </div>

      {store.activeTab === 'shopping' && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="w-full h-full relative z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <button type="button" onClick={() => store.setActiveTab('overview')} aria-label="Close shopping hub" className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer z-50 bg-black/50 w-8 h-8 flex items-center justify-center rounded-full">✕</button>
                <ShoppingHub />
            </div>
        </div>
      )}

      {store.activeTab === 'sports' && (
        <SportsAcquisitionModal onClose={() => store.setActiveTab('overview')} />
      )}

      {store.activeTab === 'perks' && (
        <PerksModule onClose={() => store.setActiveTab('overview')} />
      )}

      {store.activeTab === 'funds' && (
        <FundsModule onClose={() => store.setActiveTab('overview')} />
      )}

      {store.activeTab === 'shadow' && (
        <ShadowOpsModule onClose={() => store.setActiveTab('overview')} />
      )}

      {store.activeTab === 'pvp' && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl h-[85vh] relative z-50 rounded-2xl overflow-hidden shadow-2xl border border-[#ef4444]/20 bg-[#0A101D] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#ef4444]/20 bg-[#060A13] shrink-0">
              <span className="text-[12px] font-bold text-[#ef4444] font-mono tracking-[0.2em]">PVP TAKEOVERS</span>
              <button onClick={() => store.setActiveTab('overview')} aria-label="Close PvP takeovers" className="text-tactical-text/40 hover:text-white text-sm transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><PvPPanel /></div>
          </div>
        </div>
      )}

      {/* Politics now rendered inline in the left rail content area */}

      {store.activeTab === 'luxury' && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl h-[85vh] relative z-50 rounded-2xl overflow-hidden shadow-2xl border border-[#ffd700]/20 bg-[#0A101D] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#ffd700]/20 bg-[#060A13] shrink-0">
              <span className="text-[12px] font-bold text-[#ffd700] font-mono tracking-[0.2em]">LUXURY ASSETS</span>
              <button onClick={() => store.setActiveTab('overview')} aria-label="Close luxury assets" className="text-tactical-text/40 hover:text-white text-sm transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><LuxuryStore /></div>
          </div>
        </div>
      )}

      {store.activeTab === 'news' && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl h-[85vh] relative z-50 rounded-2xl overflow-hidden shadow-2xl border border-[#00e5ff]/20 bg-[#0A101D] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#00e5ff]/20 bg-[#060A13] shrink-0">
              <span className="text-[12px] font-bold text-[#00e5ff] font-mono tracking-[0.2em]">NEWS & BULLETINS</span>
              <button onClick={() => store.setActiveTab('overview')} aria-label="Close news feed" className="text-tactical-text/40 hover:text-white text-sm transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><NewsFeed /></div>
          </div>
        </div>
      )}

      {store.activeTab === 'equity' && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-2xl h-[85vh] relative z-50 rounded-2xl overflow-hidden shadow-2xl border border-[#00e5ff]/20 bg-[#0A101D] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#00e5ff]/20 bg-[#060A13] shrink-0">
              <div>
                <span className="text-[12px] font-bold text-[#00e5ff] font-mono tracking-[0.2em]">EQUITY</span>
                <span className="ml-3 text-[9px] text-tactical-text/40 font-mono tracking-widest">CAP TABLE &middot; FUNDRAISING &middot; IPO</span>
              </div>
              <button onClick={() => store.setActiveTab('overview')} aria-label="Close equity panel" className="text-tactical-text/40 hover:text-white text-sm transition-colors cursor-pointer">{'\u2715'}</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <EquityPanel />
            </div>
          </div>
        </div>
      )}

      {store.activeTab === 'divisions' && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-5xl h-[85vh] relative z-50 rounded-2xl overflow-hidden shadow-2xl border border-[#00e5ff]/20 bg-[#0A101D] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#00e5ff]/20 bg-[#060A13] shrink-0">
              <div>
                <span className="text-[12px] font-bold text-[#00e5ff] font-mono tracking-[0.2em]">DIVISIONS</span>
                <span className="ml-3 text-[9px] text-tactical-text/40 font-mono tracking-widest">VC · PE · HEDGE FUND · IB · MEDIA · AUCTIONS</span>
              </div>
              <button onClick={() => store.setActiveTab('overview')} aria-label="Close divisions" className="text-tactical-text/40 hover:text-white text-sm transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DivisionsModule />
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => store.setLeftRailOpen(!store.leftRailOpen)}
        className={`fixed top-1/2 z-[25] w-6 h-12 bg-tactical-bg/90 border border-tactical-border/60 text-[#00e5ff]/60 flex items-center justify-center text-[11px] font-mono rounded-r-lg transition-all duration-300 hover:text-[#00e5ff] hover:border-[#00e5ff]/40 hover:bg-tactical-bg`}
        style={{
          left: store.leftRailOpen ? '333px' : '0',
          boxShadow: store.leftRailOpen ? '0 0 12px rgba(0,229,255,0.08)' : '2px 0 12px rgba(0,229,255,0.1)',
        }}
      >
        {store.leftRailOpen ? '\u2039' : '\u203A'}
      </button>

      {/* Empire Overview Fullscreen */}
      {empireOverviewOpen && <EmpireOverview onClose={() => setEmpireOverviewOpen(false)} />}
      {structurePickerOpen && <StructurePickerModal onClose={() => setStructurePickerOpen(false)} />}
    </>
  );
};

export default EmpireLeftRail;
