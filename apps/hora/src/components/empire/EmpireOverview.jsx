import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { usePersonalPoliticsStore } from '../../store/personalPoliticsStore';
import { fmtGameTime } from '../../lib/fmtGameTime';
import { POLITICAL_RANKS } from '../../data/personalPoliticsData';
import AdCardInline from '../ads/AdCardInline';
import PersonalPoliticsPanel from '../politics/PersonalPoliticsPanel';
import BureaucracyPanel from './BureaucracyPanel';
import DivisionsModule from './DivisionsModule';
import FundsModule from './FundsModule';
import ShoppingHub from './ShoppingHub';
import TransportEmpire from './TransportEmpire';
import ShadowOpsModule from './ShadowOpsModule';
import PerksModule from './PerksModule';
import IntelHubPanel from './IntelHubPanel';
import EquityPanel from './EquityPanel';
import { useWorldPoliticsStore } from '../../store/worldPoliticsStore';

const fmt = (n) => {
  if (n == null || !isFinite(n)) return '€0';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}€${(a/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}€${(a/1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}€${(a/1e3).toFixed(0)}K`;
  return `${sign}€${Math.round(a)}`;
};

const StatCard = ({ label, value, sub, color = '#00e5ff' }) => (
  <div className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-3">
    <div className="text-[8px] text-tactical-text/60 uppercase tracking-[0.2em] font-mono mb-1">{label}</div>
    <div className="text-lg font-bold font-mono tabular-nums" style={{ color }}>{value}</div>
    {sub && <div className="text-[8px] text-tactical-text/45 font-mono mt-0.5">{sub}</div>}
  </div>
);

const AxisRing = ({ label, value, color }) => {
  const r = 28, c = 2 * Math.PI * r;
  const pct = Math.min(value, 100) / 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round"
          transform="rotate(-90 34 34)" style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
        <text x="34" y="37" textAnchor="middle" fill={color} fontSize="13" fontFamily="monospace" fontWeight="bold">{value}</text>
      </svg>
      <span className="text-[7px] text-tactical-text/50 uppercase tracking-[0.15em] font-mono">{label}</span>
    </div>
  );
};

const SectionHeader = ({ children }) => (
  <div className="text-[9px] text-tactical-text/60 uppercase tracking-[0.2em] font-mono mb-2 mt-1 border-b border-tactical-border/30 pb-1.5 font-semibold">{children}</div>
);

const MiniBar = ({ label, value, max = 100, color }) => (
  <div className="mb-2.5">
    <div className="flex justify-between text-[9px] font-mono mb-1">
      <span className="text-tactical-text/70">{label}</span>
      <span style={{ color }} className="font-bold">{value}{typeof max === 'number' && max !== 100 ? '' : '%'}</span>
    </div>
    <div className="h-1.5 bg-tactical-border/15 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }} />
    </div>
  </div>
);

const ActionCard = ({ title, description, cost, effect, color, status, onAction, actionLabel }) => (
  <div className="bg-tactical-bg/50 border border-tactical-border/20 rounded-lg p-3 hover:border-tactical-border/40 transition-all">
    <div className="flex justify-between items-start mb-1.5">
      <span className="text-[9px] font-mono text-tactical-text/80 font-bold">{title}</span>
      {status && <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>{status}</span>}
    </div>
    <div className="text-[8px] text-tactical-text/40 font-mono mb-2">{description}</div>
    <div className="flex justify-between items-center">
      <span className="text-[8px] font-mono" style={{ color }}>{effect}</span>
      {onAction && (
        <button onClick={onAction} className="text-[7px] font-mono uppercase tracking-widest px-2 py-1 rounded border transition-all hover:brightness-125" style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>
          {actionLabel || 'Activate'} — {fmt(cost)}
        </button>
      )}
    </div>
  </div>
);

const TAB_GROUPS = [
  { group: 'Core', tabs: [
    { key: 'overview', icon: '◉', label: 'Overview', color: '#00e5ff' },
    { key: 'office', icon: '⌂', label: 'Office', color: '#6366f1' },
    { key: 'board', icon: '♛', label: 'Board', color: '#f59e0b' },
  ]},
  { group: 'Finance', tabs: [
    { key: 'capital', icon: '◆', label: 'Capital', color: '#10b981' },
    { key: 'accounting', icon: '⊞', label: 'Accounting', color: '#10b981' },
    { key: 'financial', icon: '▲', label: 'Financial', color: '#7c3aed' },
    { key: 'funds', icon: '▲', label: 'Funds & Equity', color: '#7c3aed' },
    { key: 'defcon', icon: '⚠', label: 'Banking (DEFCON)', color: '#ef4444' },
  ]},
  { group: 'Operations', tabs: [
    { key: 'operations', icon: '⚙', label: 'Operations', color: '#f59e0b' },
    { key: 'departments', icon: '☰', label: 'Departments', color: '#6366f1' },
    { key: 'routes', icon: '⇄', label: 'Trade Routes', color: '#a78bfa' },
    { key: 'transport', icon: '✈', label: 'Transport', color: '#00e5ff' },
    { key: 'assets', icon: '▣', label: 'Assets', color: '#00e5ff' },
  ]},
  { group: 'Growth', tabs: [
    { key: 'marketing', icon: '◈', label: 'Marketing', color: '#ec4899' },
    { key: 'projects', icon: '⚗', label: 'R&D Projects', color: '#7c3aed' },
    { key: 'market', icon: '☖', label: 'Market Intel', color: '#00e5ff' },
    { key: 'divisions', icon: '◆', label: 'Divisions', color: '#ec4899' },
  ]},
  { group: 'Influence', tabs: [
    { key: 'politics', icon: '⚖', label: 'Politics', color: '#a78bfa' },
    { key: 'career', icon: '🏛', label: 'Career', color: '#ec4899' },
    { key: 'legal', icon: '📜', label: 'Bureaucracy', color: '#f59e0b' },
    { key: 'esg', icon: '☘', label: 'ESG & Ethics', color: '#10b981' },
    { key: 'shadow', icon: '☠', label: 'Shadow Ops', color: '#ef4444' },
  ]},
  { group: 'Lifestyle', tabs: [
    { key: 'perks', icon: '★', label: 'Perks', color: '#ec4899' },
    { key: 'shopping', icon: '♨', label: 'Shopping', color: '#a78bfa' },
    { key: 'sports', icon: '⚽', label: 'Sports', color: '#f59e0b' },
    { key: 'luxury', icon: '💎', label: 'Luxury', color: '#ec4899' },
    { key: 'news', icon: '📰', label: 'News Wire', color: '#00e5ff' },
  ]},
];

// Flat array for backward compat
const TABS = TAB_GROUPS.flatMap(g => g.tabs);

const MANAGEMENT_STYLES = [
  { key: 'collaborative', label: 'Collaborative', icon: '🤝', color: '#10b981', pros: ['+5 CEO Approval/quarter', '+3 Impact', 'Lower turnover'], cons: ['-10% project speed', 'Slower decisions'] },
  { key: 'authoritarian', label: 'Authoritarian', icon: '👊', color: '#ef4444', pros: ['+20% project speed', '+3 Power', 'Fast execution'], cons: ['-3 CEO Approval/quarter', '+5 Heat', 'Higher turnover'] },
  { key: 'visionary', label: 'Visionary', icon: '🔭', color: '#7c3aed', pros: ['+5 Growth', '+15% R&D speed', 'Innovation bonus'], cons: ['-2 Governance', 'Higher risk projects'] },
  { key: 'democratic', label: 'Democratic', icon: '🗳️', color: '#00e5ff', pros: ['+4 Governance', '+3 CEO Approval', 'Better retention'], cons: ['-15% project speed', 'Consensus delays'] },
  { key: 'laissez_faire', label: 'Laissez-Faire', icon: '🏖️', color: '#f59e0b', pros: ['+10% employee creativity', '-3 Heat', 'Low stress'], cons: ['-3 Governance', '-10% efficiency', 'Inconsistent output'] },
  { key: 'transformational', label: 'Transformational', icon: '⚡', color: '#ec4899', pros: ['+4 Growth', '+4 Impact', '+500 Followers/quarter'], cons: ['High energy cost (€10K/quarter)', 'Burnout risk'] },
];

const INVESTOR_TYPES = [
  { id: 'angel1', type: 'Angel Investor', name: 'Sofia Reyes', portrait: '👩‍💼', focus: 'Early-stage tech', minValuation: 100_000, maxInvestment: 50_000, equityAsk: 15, patience: 'High', requirements: 'Growth > 30', color: '#ec4899' },
  { id: 'angel2', type: 'Angel Investor', name: 'Marcus Webb', portrait: '🧑‍💼', focus: 'Social enterprise', minValuation: 75_000, maxInvestment: 30_000, equityAsk: 10, patience: 'Very High', requirements: 'Impact > 25', color: '#10b981' },
  { id: 'vc1', type: 'Venture Capital', name: 'Meridian Partners', portrait: '🏢', focus: 'Series A — Growth', minValuation: 500_000, maxInvestment: 250_000, equityAsk: 20, patience: 'Medium', requirements: 'Net Worth > €500K, Growth > 40', color: '#7c3aed' },
  { id: 'vc2', type: 'Venture Capital', name: 'Nordic Ventures', portrait: '🏔️', focus: 'Series A — ESG', minValuation: 400_000, maxInvestment: 200_000, equityAsk: 18, patience: 'Medium', requirements: 'ESG > 50, Governance > 40', color: '#00e5ff' },
  { id: 'vc3', type: 'Venture Capital', name: 'Apex Capital', portrait: '🦅', focus: 'Series B — Scale', minValuation: 2_000_000, maxInvestment: 1_000_000, equityAsk: 25, patience: 'Low', requirements: 'Net Worth > €2M, Income > €100K/day', color: '#f59e0b' },
  { id: 'pe1', type: 'Private Equity', name: 'Blackridge Group', portrait: '🏛️', focus: 'Buyout / Control', minValuation: 5_000_000, maxInvestment: 3_000_000, equityAsk: 40, patience: 'Very Low', requirements: 'Net Worth > €5M, Governance > 60', color: '#ef4444' },
  { id: 'seed1', type: 'Seed Fund', name: 'Sprout Capital', portrait: '🌱', focus: 'Pre-revenue ideas', minValuation: 0, maxInvestment: 25_000, equityAsk: 8, patience: 'Very High', requirements: 'None — open to all', color: '#10b981' },
  { id: 'gov1', type: 'Government Grant', name: 'EU Innovation Fund', portrait: '🇪🇺', focus: 'Green & ESG', minValuation: 0, maxInvestment: 100_000, equityAsk: 0, patience: 'High', requirements: 'Impact > 30, ESG > 40', color: '#00e5ff' },
];

const ALL_CAREER_OPPORTUNITIES = [
  { id: 'co1', company: 'NovaTech Industries', structure: 'Public Company', sector: 'tech', salary: 8_000, bonus: 80_000, netWorth: 800_000, difficulty: 'normal', description: 'Mid-cap tech firm seeking growth-oriented CEO', reqExperience: 0, color: '#7c3aed' },
  { id: 'co2', company: 'Green Horizon Corp', structure: 'Social Enterprise', sector: 'energy', salary: 6_000, bonus: 40_000, netWorth: 400_000, difficulty: 'easy', description: 'Sustainable energy company, ESG-focused board', reqExperience: 50, color: '#10b981' },
  { id: 'co3', company: 'Vanguard Dynamics', structure: 'Privately Held (LLC)', sector: 'defense', salary: 12_000, bonus: 150_000, netWorth: 2_000_000, difficulty: 'hard', description: 'Defense contractor with demanding shareholders', reqExperience: 200, color: '#ef4444' },
  { id: 'co4', company: 'Apex Global Holdings', structure: 'Public Company', sector: 'finance', salary: 20_000, bonus: 300_000, netWorth: 10_000_000, difficulty: 'legendary', description: 'Fortune 500 financial empire. Board has zero tolerance.', reqExperience: 500, color: '#f59e0b' },
  { id: 'co5', company: 'Atlas Pharmaceuticals', structure: 'Partnership', sector: 'pharma', salary: 10_000, bonus: 100_000, netWorth: 1_500_000, difficulty: 'normal', description: 'Biotech firm with strong R&D pipeline', reqExperience: 100, color: '#ec4899' },
  { id: 'co6', company: 'Meridian Logistics', structure: 'Privately Held (LLC)', sector: 'manufacturing', salary: 9_000, bonus: 70_000, netWorth: 600_000, difficulty: 'normal', description: 'Global supply chain operator expanding into new markets', reqExperience: 75, color: '#f59e0b' },
  { id: 'co7', company: 'Solaris Media Group', structure: 'Public Company', sector: 'tech', salary: 11_000, bonus: 120_000, netWorth: 1_200_000, difficulty: 'hard', description: 'Digital media conglomerate with volatile advertising revenue', reqExperience: 150, color: '#ec4899' },
  { id: 'co8', company: 'Nordic Shield Insurance', structure: 'Partnership', sector: 'finance', salary: 7_000, bonus: 50_000, netWorth: 500_000, difficulty: 'easy', description: 'Scandinavian insurance firm, stable but slow growth', reqExperience: 25, color: '#00e5ff' },
  { id: 'co9', company: 'Titan Extractors', structure: 'Public Company', sector: 'energy', salary: 15_000, bonus: 200_000, netWorth: 5_000_000, difficulty: 'hard', description: 'Oil & mining giant under ESG pressure. High pay, high scrutiny.', reqExperience: 300, color: '#ef4444' },
  { id: 'co10', company: 'Crescendo Education', structure: 'Social Enterprise', sector: 'tech', salary: 5_000, bonus: 30_000, netWorth: 200_000, difficulty: 'easy', description: 'EdTech startup with mission-driven board. Low stress.', reqExperience: 0, color: '#10b981' },
  { id: 'co11', company: 'Aegis Cybersecurity', structure: 'Privately Held (LLC)', sector: 'defense', salary: 14_000, bonus: 180_000, netWorth: 3_000_000, difficulty: 'hard', description: 'Government cybersecurity contractor. Clearance required.', reqExperience: 250, color: '#7c3aed' },
  { id: 'co12', company: 'Zenith Hospitality', structure: 'Public Company', sector: 'hospitality', salary: 8_500, bonus: 60_000, netWorth: 700_000, difficulty: 'normal', description: 'Luxury hotel chain looking to expand into Asia-Pacific', reqExperience: 80, color: '#f59e0b' },
];

// Rotate positions: pick 5 based on real-world date (changes every 3 days) + in-game quarter
function getAvailablePositions(gameTick) {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const realCycle = Math.floor(daysSinceEpoch / 3); // changes every 3 real days
  const gameQuarter = Math.floor((gameTick || 0) / 90); // changes every quarter in-game
  const seed = realCycle * 7 + gameQuarter * 13;
  // Shuffle deterministically and pick 5
  const shuffled = ALL_CAREER_OPPORTUNITIES.map((opp, i) => ({ opp, sort: ((seed + i * 31 + i * i * 7) % 997) }));
  shuffled.sort((a, b) => a.sort - b.sort);
  return shuffled.slice(0, 5).map(s => s.opp);
}

const LockedSection = ({ deptName, requiredLevel, currentLevel, children }) => {
  if (currentLevel >= requiredLevel) return children;
  const c = DEPT_COLORS[deptName] || '#6366f1';
  return (
    <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#060a12]/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-1">🔒</div>
          <div className="text-[9px] font-mono font-bold" style={{ color: c }}>{deptName} Dept Level {requiredLevel} Required</div>
          <div className="text-[7px] font-mono text-tactical-text/45 mt-0.5">Current: Level {currentLevel} — Complete {deptName} projects to unlock</div>
        </div>
      </div>
      <div className="opacity-20 pointer-events-none">{children}</div>
    </div>
  );
};

const DEPT_COLORS = { HR: '#10b981', Trading: '#00e5ff', Marketing: '#ec4899', 'R&D': '#7c3aed', Finance: '#f59e0b', Legal: '#6366f1' };

const ClickableSection = ({ children, tab, onNavigate, color = '#00e5ff' }) => (
  <div
    onClick={() => onNavigate(tab)}
    className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4 cursor-pointer transition-all hover:border-opacity-60 hover:bg-tactical-bg/60 group"
    style={{ '--hover-color': color }}
  >
    {children}
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color }}>Open &amp; Manage →</span>
    </div>
  </div>
);

// ── Overview Tab ──
function OverviewTab({ store, onNavigate }) {
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const totalIncome = playerNodes.reduce((s, n) => s + n.income, 0);
  const activeRoutes = store.routes.filter(r => r.active);
  const routeRevenue = activeRoutes.reduce((s, r) => s + (r.monthlyRevenue || 0), 0);
  const activeProjects = store.projects.filter(p => p.active);
  const completedRD = store.rdProjects.filter(p => p.status === 'completed').length;
  const activeRD = store.rdProjects.filter(p => p.status === 'researching').length;
  const ownedSports = store.sportsFranchises.filter(f => f.owned);
  const ownedPerks = store.perks.filter(p => p.owned);
  const ownedShopping = store.shoppingAssets.filter(a => a.owned);
  const stakedFunds = store.funds.filter(f => (f.stakedAmount || 0) > 0);
  const totalStaked = stakedFunds.reduce((s, f) => s + (f.stakedAmount || 0), 0);
  const portfolioPositions = Object.values(store.portfolio || {});
  const portfolioValue = portfolioPositions.reduce((s, p) => s + p.quantity * p.avgCost, 0);
  const esgE = Math.round(store.impact * 0.6 + (100 - store.heat) * 0.4);
  const esgS = Math.round(store.governance * 0.5 + store.impact * 0.3 + store.ceoApproval * 0.2);
  const esgG = Math.round(store.governance * 0.7 + (100 - store.heat) * 0.3);
  const esgOverall = Math.round((esgE + esgS + esgG) / 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Net Worth" value={fmt(store.netWorth)} color="#00e5ff" />
        <StatCard label="Personal" value={fmt(store.personalBalance)} color="#e8e0d0" />
        <StatCard label="Company" value={fmt(store.companyBalance)} color="#7c3aed" />
        <StatCard label="Daily Income" value={`+${fmt(store.monthlyIncome)}`} sub={`Nodes: ${fmt(totalIncome)} | Routes: ${fmt(routeRevenue)}`} color="#10b981" />
        <StatCard label="Tax Rate" value={`${(store.taxRate * 100).toFixed(0)}%`} sub={store.companyCountry || 'No jurisdiction'} color="#f59e0b" />
        <StatCard label="Heat" value={`${store.heat}`} sub={store.heat > 60 ? 'HIGH RISK' : store.heat > 30 ? 'MODERATE' : 'LOW'} color={store.heat > 60 ? '#ef4444' : store.heat > 30 ? '#f59e0b' : '#10b981'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ClickableSection tab="overview" onNavigate={onNavigate} color="#00e5ff">
          <SectionHeader>Empire Axes</SectionHeader>
          <div className="flex justify-around">
            <AxisRing label="Growth" value={store.growth} color="#00e5ff" />
            <AxisRing label="Governance" value={store.governance} color="#10b981" />
            <AxisRing label="Impact" value={store.impact} color="#f59e0b" />
            <AxisRing label="Power" value={store.power} color="#ec4899" />
          </div>
        </ClickableSection>
        <ClickableSection tab="esg" onNavigate={onNavigate} color="#10b981">
          <SectionHeader>ESG Score — {esgOverall}/100</SectionHeader>
          <div className="flex justify-around">
            <AxisRing label="Environmental" value={esgE} color="#10b981" />
            <AxisRing label="Social" value={esgS} color="#00e5ff" />
            <AxisRing label="Governance" value={esgG} color="#7c3aed" />
          </div>
        </ClickableSection>
        <ClickableSection tab="politics" onNavigate={onNavigate} color="#a78bfa">
          <SectionHeader>Politics & Influence</SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-[#a78bfa]">{store.power ?? 0}</div>
              <div className="text-[7px] text-tactical-text/40 font-mono uppercase">Power</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-[#f59e0b]">{store.followers?.toLocaleString() ?? 0}</div>
              <div className="text-[7px] text-tactical-text/40 font-mono uppercase">Followers</div>
            </div>
          </div>
        </ClickableSection>
        <ClickableSection tab="career" onNavigate={onNavigate} color="#ec4899">
          <SectionHeader>Political Career</SectionHeader>
          {(() => {
            const pp = usePersonalPoliticsStore.getState();
            const rankData = POLITICAL_RANKS[pp.currentRank] || POLITICAL_RANKS[0];
            const approvalColor = pp.approval >= 60 ? '#10b981' : pp.approval >= 30 ? '#f59e0b' : '#ef4444';
            return (
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-sm font-bold font-mono text-[#ec4899]">{rankData.title}</div>
                  <div className="text-[7px] text-tactical-text/40 font-mono uppercase mt-0.5">Rank {pp.currentRank}/6</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <div className="text-sm font-bold font-mono" style={{ color: approvalColor }}>{pp.approval}%</div>
                    <div className="text-[7px] text-tactical-text/40 font-mono uppercase">Approval</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold font-mono text-[#a78bfa]">{fmt(pp.campaignFund)}</div>
                    <div className="text-[7px] text-tactical-text/40 font-mono uppercase">War Chest</div>
                  </div>
                </div>
                {pp.activeCampaign && (
                  <div className="text-[8px] text-[#ec4899] font-mono text-center animate-pulse">⚡ Campaign Active</div>
                )}
              </div>
            );
          })()}
        </ClickableSection>
        <ClickableSection tab="legal" onNavigate={onNavigate} color="#f59e0b">
          <SectionHeader>Bureaucracy & Legal</SectionHeader>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-sm font-bold font-mono" style={{ color: store.governance > 50 ? '#10b981' : store.governance > 25 ? '#f59e0b' : '#ef4444' }}>{store.governance ?? 0}</div>
              <div className="text-[7px] text-tactical-text/40 font-mono uppercase">Governance</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold font-mono" style={{ color: store.heat < 40 ? '#10b981' : store.heat < 70 ? '#f59e0b' : '#ef4444' }}>{store.heat ?? 0}</div>
              <div className="text-[7px] text-tactical-text/40 font-mono uppercase">Heat</div>
            </div>
            <div className="text-center">
              <div className={`text-sm font-bold font-mono ${store.complianceFines > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                {store.complianceFines > 0 ? fmt(store.complianceFines) : '\u2713'}
              </div>
              <div className="text-[7px] text-tactical-text/40 font-mono uppercase">Fines</div>
            </div>
          </div>
        </ClickableSection>
        {/* Inline ad fills empty grid slot */}
        <AdCardInline variant="section" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ClickableSection tab="market" onNavigate={onNavigate} color="#00e5ff">
          <SectionHeader>Infrastructure — {playerNodes.length} Nodes</SectionHeader>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {playerNodes.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No owned nodes — click to browse market</div>}
            {playerNodes.slice(0, 12).map(n => (
              <div key={n.id} className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-tactical-text/70 truncate max-w-[60%]">{n.name}</span>
                <span className="text-emerald-400 tabular-nums">+{fmt(n.income)}/day</span>
              </div>
            ))}
          </div>
        </ClickableSection>
        <ClickableSection tab="routes" onNavigate={onNavigate} color="#a78bfa">
          <SectionHeader>Trade Routes — {activeRoutes.length} Active</SectionHeader>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {activeRoutes.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No active routes — click to build</div>}
            {activeRoutes.slice(0, 10).map(r => (
              <div key={r.id} className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-tactical-text/70 truncate max-w-[50%]">{r.fromNodeId} → {r.toNodeId}</span>
                <span className="text-emerald-400 tabular-nums">+{fmt(r.monthlyRevenue || 0)}/day</span>
              </div>
            ))}
          </div>
        </ClickableSection>
        <ClickableSection tab="rnd" onNavigate={onNavigate} color="#7c3aed">
          <SectionHeader>R&D Progress</SectionHeader>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <StatCard label="Done" value={completedRD} color="#10b981" />
            <StatCard label="Active" value={activeRD} color="#00e5ff" />
            <StatCard label="Avail" value={store.rdProjects.filter(p => p.status === 'available').length} color="#9c8e7e" />
          </div>
        </ClickableSection>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ClickableSection tab="departments" onNavigate={onNavigate} color="#6366f1">
          <SectionHeader>Active Department Projects — {activeProjects.length}</SectionHeader>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {activeProjects.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No active projects — click to manage</div>}
            {activeProjects.map(p => (
              <div key={p.id} className="flex justify-between text-[9px] font-mono">
                <span className="text-tactical-text/70">{p.name}</span>
                <span className="text-[#7c3aed]">{p.dept}</span>
              </div>
            ))}
          </div>
        </ClickableSection>
        <ClickableSection tab="assets" onNavigate={onNavigate} color="#00e5ff">
          <SectionHeader>Trading Portfolio — {portfolioPositions.length} Positions</SectionHeader>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {portfolioPositions.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No open positions — click to view assets</div>}
            {portfolioPositions.slice(0, 8).map(p => (
              <div key={p.symbol} className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-tactical-text/70">{p.symbol} <span className="text-tactical-text/45">x{p.quantity}</span></span>
                <span className="text-[#00e5ff] tabular-nums">{fmt(p.quantity * p.avgCost)}</span>
              </div>
            ))}
            {portfolioPositions.length > 0 && (
              <div className="flex justify-between text-[9px] font-mono border-t border-tactical-border/20 pt-1 mt-1">
                <span className="text-tactical-text/50">Total Portfolio Value</span>
                <span className="text-[#00e5ff] font-bold">{fmt(portfolioValue)}</span>
              </div>
            )}
          </div>
        </ClickableSection>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <ClickableSection tab="funds" onNavigate={onNavigate} color="#7c3aed">
          <SectionHeader>Funds — {stakedFunds.length} Staked</SectionHeader>
          <div className="text-lg font-bold font-mono text-[#7c3aed]">{fmt(totalStaked)}</div>
          <div className="text-[8px] text-tactical-text/45 font-mono">Total allocated</div>
        </ClickableSection>
        <ClickableSection tab="sports" onNavigate={onNavigate} color="#f59e0b">
          <SectionHeader>Sports — {ownedSports.length}</SectionHeader>
          {ownedSports.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No franchises — click to acquire</div>}
          {ownedSports.slice(0, 3).map(f => (
            <div key={f.id} className="text-[9px] text-tactical-text/60 font-mono truncate">{f.name}</div>
          ))}
        </ClickableSection>
        <ClickableSection tab="perks" onNavigate={onNavigate} color="#ec4899">
          <SectionHeader>Perks — {ownedPerks.length}</SectionHeader>
          {ownedPerks.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No perks — click to browse</div>}
          {ownedPerks.slice(0, 3).map(p => (
            <div key={p.id} className="text-[9px] text-tactical-text/60 font-mono truncate">{p.name}</div>
          ))}
        </ClickableSection>
        <ClickableSection tab="shopping" onNavigate={onNavigate} color="#a78bfa">
          <SectionHeader>Shopping — {ownedShopping.length}</SectionHeader>
          {ownedShopping.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No assets — click to shop</div>}
          {ownedShopping.slice(0, 3).map(a => (
            <div key={a.id} className="text-[9px] text-tactical-text/60 font-mono truncate">{a.name}</div>
          ))}
        </ClickableSection>
      </div>

      {/* Inline ad between sections */}
      <AdCardInline variant="wide" />

      <ClickableSection tab="office" onNavigate={onNavigate} color="#7c3aed">
        <SectionHeader>Corporate Status</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Structure" value={store.structure} color="#7c3aed" />
          <StatCard label="Followers" value={store.followers.toLocaleString()} color="#ec4899" />
          <StatCard label="CEO Approval" value={`${store.ceoApproval}%`} color={store.ceoApproval > 60 ? '#10b981' : '#f59e0b'} />
          <StatCard label="Employees" value={Object.values(store.cards).filter(c => c.assignedNodeId).length} sub={`${Object.keys(store.cards).length} total cards`} color="#00e5ff" />
        </div>
      </ClickableSection>

      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>ECFL Academy Progress</SectionHeader>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="ECFL Score" value={store.ecflScore} color="#f59e0b" />
          <StatCard label="Lessons" value={store.completedLessons.length} color="#10b981" />
          <StatCard label="Exams Passed" value={store.passedExams.length} color="#7c3aed" />
          <AdCardInline variant="stat" />
        </div>
      </div>
    </div>
  );
}

// ── Marketing Tab ──
function MarketingTab({ store, onNavigate }) {
  const deptLevels = getDeptLevels(store.projects);
  const brandScore = Math.round(store.followers / 100 + store.ceoApproval * 0.4 + store.impact * 0.2);
  const marketingBudget = Math.round(store.companyBalance * 0.05);
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const sectorPresence = {};
  playerNodes.forEach(n => { sectorPresence[n.type] = (sectorPresence[n.type] || 0) + 1; });

  const campaigns = [
    { title: 'Social Media Blitz', description: 'Aggressive paid social campaign across platforms', cost: 50000, effect: '+500 Followers, +5 CEO Approval', color: '#ec4899', status: 'AVAILABLE' },
    { title: 'Corporate PR Package', description: 'Press releases, interviews, thought leadership articles', cost: 100000, effect: '+3 Governance, +1000 Followers', color: '#7c3aed', status: 'AVAILABLE' },
    { title: 'Influencer Partnership', description: 'Partner with industry influencers for brand exposure', cost: 75000, effect: '+800 Followers, +2 Growth', color: '#00e5ff', status: 'AVAILABLE' },
    { title: 'ESG Awareness Campaign', description: 'Promote sustainability initiatives to improve public image', cost: 120000, effect: '+5 Impact, +3 ESG Score', color: '#10b981', status: 'AVAILABLE' },
    { title: 'Product Launch Event', description: 'High-profile launch event with media coverage', cost: 200000, effect: '+2000 Followers, +5 Growth, +3 Power', color: '#f59e0b', status: playerNodes.length > 0 ? 'AVAILABLE' : 'LOCKED' },
    { title: 'Community Sponsorship', description: 'Sponsor local events and community programmes', cost: 30000, effect: '+3 Impact, +200 Followers', color: '#10b981', status: 'AVAILABLE' },
  ];

  const channels = [
    { name: 'Digital Advertising', reach: Math.min(store.followers * 3, 100000), conversion: '2.4%', cost: '€5K/day', color: '#00e5ff' },
    { name: 'Social Media', reach: store.followers, conversion: '4.1%', cost: '€2K/day', color: '#ec4899' },
    { name: 'PR & Media', reach: Math.min(store.followers * 5, 250000), conversion: '0.8%', cost: '€8K/day', color: '#7c3aed' },
    { name: 'Events & Sponsorships', reach: Math.min(playerNodes.length * 5000, 50000), conversion: '6.2%', cost: '€15K/day', color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Marketing KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Brand Score" value={brandScore} color="#ec4899" />
        <StatCard label="Followers" value={store.followers.toLocaleString()} color="#00e5ff" />
        <StatCard label="CEO Approval" value={`${store.ceoApproval}%`} color={store.ceoApproval > 60 ? '#10b981' : '#f59e0b'} />
        <StatCard label="Marketing Budget" value={fmt(marketingBudget)} sub="5% of company balance" color="#7c3aed" />
      </div>

      {/* Market Presence */}
      <ClickableSection tab="market" onNavigate={onNavigate} color="#00e5ff">
        <SectionHeader>Market Presence by Sector</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(sectorPresence).map(([sector, count]) => (
            <div key={sector} className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/40 rounded-lg px-3 py-2">
              <span className="text-tactical-text/60 uppercase">{sector.replace('_', ' ')}</span>
              <span className="text-[#00e5ff] font-bold">{count} nodes</span>
            </div>
          ))}
          {Object.keys(sectorPresence).length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono col-span-4">No market presence yet</div>}
        </div>
      </ClickableSection>

      {/* Marketing Channels — requires Marketing dept Lv1 */}
      <LockedSection deptName="Marketing" requiredLevel={1} currentLevel={deptLevels.Marketing}>
        <ClickableSection tab="departments" onNavigate={onNavigate} color="#ec4899">
          <SectionHeader>Marketing Channels Performance</SectionHeader>
          <div className="space-y-3">
            {channels.map(ch => (
              <div key={ch.name} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-mono font-bold" style={{ color: ch.color }}>{ch.name}</span>
                  <span className="text-[8px] text-tactical-text/45 font-mono">{ch.cost}</span>
                </div>
                <div className="flex gap-4 text-[8px] font-mono text-tactical-text/50">
                  <span>Reach: <span className="text-tactical-text/80">{ch.reach.toLocaleString()}</span></span>
                  <span>Conv: <span className="text-tactical-text/80">{ch.conversion}</span></span>
                </div>
              </div>
            ))}
          </div>
        </ClickableSection>
      </LockedSection>

      {/* Campaigns — requires Marketing dept Lv2 */}
      <LockedSection deptName="Marketing" requiredLevel={2} currentLevel={deptLevels.Marketing}>
        <ClickableSection tab="departments" onNavigate={onNavigate} color="#7c3aed">
          <SectionHeader>Available Campaigns</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campaigns.map((c, i) => (
              <ActionCard key={i} {...c} />
            ))}
          </div>
        </ClickableSection>
      </LockedSection>

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Operations Tab ──
function OperationsTab({ store, onNavigate }) {
  const deptLevels = getDeptLevels(store.projects);
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const operationalNodes = playerNodes.filter(n => n.status === 'operational');
  const buildingNodes = playerNodes.filter(n => n.status === 'building');
  const disabledNodes = playerNodes.filter(n => n.status === 'disabled');
  const activeRoutes = store.routes.filter(r => r.active);
  const totalCapacity = activeRoutes.reduce((s, r) => s + (r.capacity || 0), 0);
  const avgSecurity = activeRoutes.length > 0 ? Math.round(activeRoutes.reduce((s, r) => s + (r.security || 0), 0) / activeRoutes.length) : 0;
  const avgSpeed = activeRoutes.length > 0 ? Math.round(activeRoutes.reduce((s, r) => s + (r.speed || 0), 0) / activeRoutes.length * 10) / 10 : 0;
  const assignedCards = Object.values(store.cards).filter(c => c.assignedNodeId);
  const unassignedCards = Object.values(store.cards).filter(c => !c.assignedNodeId);
  const efficiency = playerNodes.length > 0 ? Math.round((operationalNodes.length / playerNodes.length) * 100) : 0;
  const utilization = Object.keys(store.cards).length > 0 ? Math.round((assignedCards.length / Object.keys(store.cards).length) * 100) : 0;

  const deptBreakdown = {};
  store.projects.forEach(p => {
    if (!deptBreakdown[p.dept]) deptBreakdown[p.dept] = { total: 0, active: 0 };
    deptBreakdown[p.dept].total++;
    if (p.active) deptBreakdown[p.dept].active++;
  });

  return (
    <div className="space-y-6">
      {/* Operations KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Operational Efficiency" value={`${efficiency}%`} sub={`${operationalNodes.length}/${playerNodes.length} nodes online`} color={efficiency > 80 ? '#10b981' : '#f59e0b'} />
        <StatCard label="Workforce Utilization" value={`${utilization}%`} sub={`${assignedCards.length} assigned / ${Object.keys(store.cards).length} total`} color={utilization > 70 ? '#10b981' : '#f59e0b'} />
        <StatCard label="Logistics Capacity" value={`${totalCapacity}t`} sub={`${activeRoutes.length} active routes`} color="#00e5ff" />
        <StatCard label="Heat Index" value={store.heat} sub={store.heat > 60 ? 'CRITICAL — reduce exposure' : 'Under control'} color={store.heat > 60 ? '#ef4444' : '#10b981'} />
      </div>

      {/* Node Status Breakdown */}
      <ClickableSection tab="market" onNavigate={onNavigate} color="#10b981">
        <SectionHeader>Infrastructure Status</SectionHeader>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg p-3">
            <div className="text-2xl font-bold font-mono text-[#10b981]">{operationalNodes.length}</div>
            <div className="text-[8px] text-tactical-text/55 font-mono uppercase">Operational</div>
          </div>
          <div className="text-center bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-lg p-3">
            <div className="text-2xl font-bold font-mono text-[#f59e0b]">{buildingNodes.length}</div>
            <div className="text-[8px] text-tactical-text/55 font-mono uppercase">Building</div>
          </div>
          <div className="text-center bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-lg p-3">
            <div className="text-2xl font-bold font-mono text-[#ef4444]">{disabledNodes.length}</div>
            <div className="text-[8px] text-tactical-text/55 font-mono uppercase">Disabled</div>
          </div>
        </div>
        {playerNodes.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {playerNodes.map(n => (
              <div key={n.id} className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/40 rounded px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: n.status === 'operational' ? '#10b981' : n.status === 'building' ? '#f59e0b' : '#ef4444' }} />
                  <span className="text-tactical-text/70">{n.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-tactical-text/45 uppercase text-[7px]">Lv{n.level}</span>
                  <span className="text-emerald-400 tabular-nums">+{fmt(n.income)}/day</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ClickableSection>

      {/* Supply Chain — requires Trading dept Lv1 */}
      <LockedSection deptName="Trading" requiredLevel={1} currentLevel={deptLevels.Trading}>
        <ClickableSection tab="routes" onNavigate={onNavigate} color="#a78bfa">
          <SectionHeader>Supply Chain & Logistics</SectionHeader>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <StatCard label="Avg Speed" value={avgSpeed} sub="rating /10" color="#a78bfa" />
            <StatCard label="Avg Security" value={avgSecurity} sub="rating /10" color="#10b981" />
            <StatCard label="Total Capacity" value={`${totalCapacity}t`} color="#00e5ff" />
          </div>
          <MiniBar label="Route Network Utilization" value={Math.min(activeRoutes.length * 15, 100)} color="#a78bfa" />
          <MiniBar label="Delivery Reliability" value={Math.min(avgSecurity * 10, 100)} color="#10b981" />
        </ClickableSection>
      </LockedSection>

      {/* Department Operations */}
      <ClickableSection tab="departments" onNavigate={onNavigate} color="#6366f1">
        <SectionHeader>Department Activity</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(deptBreakdown).map(([dept, data]) => {
            return (
              <div key={dept} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3">
                <div className="text-[9px] font-mono font-bold mb-1" style={{ color: DEPT_COLORS[dept] || '#9c8e7e' }}>{dept}</div>
                <div className="text-[8px] text-tactical-text/40 font-mono">{data.active} active / {data.total} total projects</div>
                <div className="h-1 bg-tactical-border/10 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${data.total > 0 ? (data.active / data.total) * 100 : 0}%`, backgroundColor: DEPT_COLORS[dept] || '#9c8e7e' }} />
                </div>
              </div>
            );
          })}
        </div>
      </ClickableSection>

      {/* Workforce — requires HR dept Lv1 */}
      <LockedSection deptName="HR" requiredLevel={1} currentLevel={deptLevels.HR}>
        <ClickableSection tab="assets" onNavigate={onNavigate} color="#00e5ff">
        <SectionHeader>Workforce Management</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[8px] text-tactical-text/40 font-mono mb-2">Assigned Employees</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {assignedCards.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">No assigned staff</div>}
              {assignedCards.slice(0, 8).map(c => (
                <div key={c.id} className="flex justify-between text-[8px] font-mono">
                  <span className="text-tactical-text/60">{c.name}</span>
                  <span className="text-[#00e5ff]">{c.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[8px] text-tactical-text/40 font-mono mb-2">Unassigned ({unassignedCards.length})</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {unassignedCards.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono">All staff assigned</div>}
              {unassignedCards.slice(0, 8).map(c => (
                <div key={c.id} className="flex justify-between text-[8px] font-mono">
                  <span className="text-tactical-text/60">{c.name}</span>
                  <span className="text-tactical-text/45">{c.tier}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ClickableSection>
      </LockedSection>

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Accounting Tab ──
function AccountingTab({ store, onNavigate }) {
  const [activeStatement, setActiveStatement] = useState('pnl');
  const deptLevels = getDeptLevels(store.projects);
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const operationalNodes = playerNodes.filter(n => n.status === 'operational');

  // ── ALL FIGURES CONVERTED TO DAILY (monthly / 30) ──
  // 1 in-game day = 1440 ticks (~3.43 real hours). Income settles daily.
  const DAILY_FACTOR = 1 / 30;
  const TICKS_PER_DAY = 1440; // 24h × 60min

  // Node income is stored as monthly — apply monopoly bonus then convert to daily
  const typeCounts = {};
  for (const n of operationalNodes) typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
  let totalNodeIncome = 0;
  for (const n of operationalNodes) {
    let mult = 1.0;
    if ((typeCounts[n.type] || 0) >= 3) mult *= 1.5;
    totalNodeIncome += n.income * mult;
  }
  totalNodeIncome = Math.round(totalNodeIncome * DAILY_FACTOR);

  // Route revenue (stored as monthly → convert to daily)
  const activeRoutes = (store.routes || []).filter(r => r.active);
  const routeRevenue = Math.round(activeRoutes.reduce((s, r) => s + (r.monthlyRevenue || 0), 0) * DAILY_FACTOR);

  // Sports revenue (stored as monthly → convert to daily)
  const ownedSports = (store.sportsFranchises || []).filter(f => f.owned);
  const sportsRevenue = Math.round(ownedSports.reduce((s, f) => s + (f.monthlyRevenue || 0), 0) * DAILY_FACTOR);

  // Transport revenue & costs (per-tick × TICKS_PER_DAY for daily)
  const transportCompanies = store.transportCompanies || [];
  let transportRevenuePerTick = 0, transportCostsPerTick = 0, infraFeePerTick = 0;
  for (const tc of transportCompanies) {
    for (const r of tc.routes) {
      if (!r.active) continue;
      transportRevenuePerTick += r.ticketRevenue * r.frequency;
      transportCostsPerTick += (r.fuelCost + r.landingFee) * r.frequency;
    }
    transportCostsPerTick += (tc.monthlyCost * DAILY_FACTOR) / TICKS_PER_DAY; // convert monthly to daily, then amortize per tick
  }
  for (const fee of (store.infraFees || [])) {
    if (fee.ownerIsPlayer) infraFeePerTick += fee.feePerUse * fee.usesPerTick;
  }
  const transportRevenue = Math.round(transportRevenuePerTick * TICKS_PER_DAY);
  const transportCosts = Math.round(transportCostsPerTick * TICKS_PER_DAY);
  const infraFeeIncome = Math.round(infraFeePerTick * TICKS_PER_DAY);

  // Fund yields (expected daily)
  const stakedFunds = store.funds.filter(f => (f.stakedAmount || 0) > 0);
  const totalStaked = stakedFunds.reduce((s, f) => s + (f.stakedAmount || 0), 0);
  const expectedFundYieldPerTick = stakedFunds.reduce((s, f) => {
    const stake = f.stakedAmount || 0;
    const edge = f.edge || 0.5;
    const ty = f.targetYield || 0;
    return s + stake * (ty / 100) * (edge - (1 - edge) * 0.5);
  }, 0);
  const expectedFundYield = Math.round(expectedFundYieldPerTick * TICKS_PER_DAY);

  // Media outlet revenue (stored as monthly → convert to daily)
  const ownedMedia = (store.mediaOutlets || []).filter(o => o.owned);
  const mediaRevenue = Math.round(ownedMedia.reduce((s, o) => s + (o.monthlyRevenue || 0), 0) * DAILY_FACTOR);

  // Hedge fund management fees as expense (monthly → daily)
  const activeHF = (store.hfStrategies || []).filter(s => s.active && s.capitalAllocated > 0);
  const hfManagementFees = Math.round(activeHF.reduce((s, st) => s + ((st.capitalAllocated * st.managementFee / 100) / 12), 0) * DAILY_FACTOR);

  // IB deal advisory fee revenue (monthly → daily)
  const activeIB = (store.ibDeals || []).filter(d => d.status === 'in-progress');
  const ibAdvisoryRevenue = Math.round(activeIB.reduce((s, d) => s + ((d.dealSize * d.advisoryFee / 100) / (d.duration || 1)), 0) * DAILY_FACTOR);

  // VC portfolio value (for balance sheet)
  const ownedVC = (store.vcDeals || []).filter(d => d.owned);
  const vcPortfolioValue = ownedVC.reduce((s, d) => s + (d.valuation * d.equityOffered / 100), 0);

  // PE portfolio value (for balance sheet)
  const ownedPE = (store.peTargets || []).filter(t => t.owned);
  const pePortfolioValue = ownedPE.reduce((s, t) => s + (t.askingPrice || 0), 0);

  // Auction items value (for balance sheet)
  const ownedAuctions = (store.auctionItems || []).filter(a => a.owned);
  const auctionItemsValue = ownedAuctions.reduce((s, a) => s + (a.estimatedValue || 0), 0);

  // Creator earnings (total earned ÷ days elapsed)
  const daysElapsed = Math.max(1, Math.floor(store.gameTick / TICKS_PER_DAY));
  const creatorRevenue = store.creatorEarnings > 0 ? Math.round(store.creatorEarnings / daysElapsed) : 0;

  // CEO salary (stored as monthly → convert to daily)
  const ceoSalary = store.currentContract && !store.sacked && store.gameTick >= 10 ? Math.round(store.currentContract.salary * DAILY_FACTOR) : 0;

  // ── EXPENSES (all daily) ──
  // Tax on node income
  const taxExpense = Math.round(totalNodeIncome * store.taxRate);
  const netNodeIncome = Math.round(totalNodeIncome * (1 - store.taxRate));

  // Agent payroll — stored as monthly in processTick, convert to daily
  const agentPayroll = Math.round((store.agentPayroll || 0) * DAILY_FACTOR);

  // Compliance fines (10% of outstanding paid per day)
  const finePayment = store.complianceFines > 0 ? Math.round(store.complianceFines * 0.1 * DAILY_FACTOR) : 0;

  // Loan payments (stored as monthly → daily)
  const activeLoans = (store.loans || []).filter(l => l.status === 'active');
  const totalLoanDebt = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);
  const dailyLoanPayment = Math.round(activeLoans.reduce((s, l) => s + l.monthlyPayment, 0) * DAILY_FACTOR);

  // ── TOTALS (all daily) ──
  const totalRevenue = totalNodeIncome + routeRevenue + sportsRevenue + transportRevenue + infraFeeIncome + creatorRevenue + mediaRevenue + ibAdvisoryRevenue;
  const totalExpenses = taxExpense + transportCosts + ceoSalary + agentPayroll + finePayment + dailyLoanPayment + hfManagementFees;
  const operatingProfit = totalRevenue - transportCosts;
  const ebitda = operatingProfit;
  const netProfit = netNodeIncome + routeRevenue + sportsRevenue + transportRevenue - transportCosts + infraFeeIncome + expectedFundYield + creatorRevenue + mediaRevenue + ibAdvisoryRevenue - ceoSalary - agentPayroll - finePayment - dailyLoanPayment - hfManagementFees;
  const cashFlow = netProfit + ceoSalary; // CEO salary goes to personal, not lost

  // Reality check: if company balance is negative, we're clearly not profitable regardless of estimates
  const actuallyProfitable = netProfit > 0 && store.companyBalance >= 0;

  // ── BALANCE SHEET ──
  const portfolioPositions = Object.values(store.portfolio || {});
  const portfolioValue = portfolioPositions.reduce((s, p) => s + p.quantity * (p.currentPrice || p.avgCost), 0);
  const portfolioCost = portfolioPositions.reduce((s, p) => s + p.quantity * p.avgCost, 0);
  const unrealizedPnL = portfolioValue - portfolioCost;
  const totalAssetValue = operationalNodes.reduce((s, n) => s + (n.capex || n.income * 120), 0);
  const buildingValue = playerNodes.filter(n => n.status === 'building').reduce((s, n) => s + (n.capex || 0), 0);
  const ownedShopping = (store.shoppingAssets || []).filter(a => a.owned);
  const shoppingValue = ownedShopping.reduce((s, a) => s + a.value, 0);
  const sportsValue = ownedSports.reduce((s, f) => s + (f.acquisitionCost || 0), 0);
  const totalAssets = store.personalBalance + store.companyBalance + totalAssetValue + buildingValue + portfolioValue + totalStaked + shoppingValue + sportsValue + vcPortfolioValue + pePortfolioValue + auctionItemsValue;
  const totalLiabilities = totalLoanDebt + store.complianceFines + taxExpense;
  const equity = totalAssets - totalLiabilities;

  // ── FORECAST (next 30 days) ──
  const forecastDays = 30;
  const projectedRevenue = totalRevenue * forecastDays;
  const projectedExpenses = totalExpenses * forecastDays;
  const projectedProfit = netProfit * forecastDays;
  const projectedCash = store.companyBalance + projectedProfit;
  const burnRate = netProfit < 0 ? Math.abs(netProfit) : 0;
  const reserveDays = totalExpenses > 0 ? Math.floor(store.companyBalance / totalExpenses) : 0;
  const runwayDays = burnRate > 0 ? Math.floor(store.companyBalance / burnRate) : 0;
  const runwayLabel = burnRate > 0
    ? (runwayDays > 99 ? '99+ d' : `${runwayDays}d`)
    : totalExpenses > 0
      ? (reserveDays > 99 ? '99+ d' : `${reserveDays}d`)
      : 'HEALTHY';

  // ── P&L LEDGER ──
  const revenueLines = [
    { label: 'Infrastructure Income', amount: totalNodeIncome, detail: `${operationalNodes.length} nodes` },
    routeRevenue > 0 && { label: 'Supply Route Revenue', amount: routeRevenue, detail: `${activeRoutes.length} routes` },
    sportsRevenue > 0 && { label: 'Sports Franchise Revenue', amount: sportsRevenue, detail: `${ownedSports.length} teams` },
    transportRevenue > 0 && { label: 'Transport Ticket Revenue', amount: transportRevenue, detail: `${transportCompanies.length} companies` },
    infraFeeIncome > 0 && { label: 'Infrastructure Fees (Airports/Ports)', amount: infraFeeIncome },
    expectedFundYield !== 0 && { label: 'Fund Yields (Expected)', amount: Math.round(expectedFundYield), detail: `${stakedFunds.length} funds` },
    creatorRevenue > 0 && { label: 'Creator Economy Earnings', amount: creatorRevenue },
    mediaRevenue > 0 && { label: 'Media Outlet Revenue', amount: mediaRevenue, detail: `${ownedMedia.length} outlets` },
    ibAdvisoryRevenue > 0 && { label: 'IB Advisory Fees', amount: ibAdvisoryRevenue, detail: `${activeIB.length} deals` },
    ceoSalary > 0 && { label: 'CEO Salary (→ Personal)', amount: ceoSalary, detail: 'daily' },
  ].filter(Boolean);

  const expenseLines = [
    taxExpense > 0 && { label: `Corporate Tax (${(store.taxRate * 100).toFixed(0)}%)`, amount: taxExpense },
    agentPayroll > 0 && { label: 'Agent Payroll', amount: agentPayroll, detail: 'all deployed agents' },
    transportCosts > 0 && { label: 'Transport Costs (Fuel + Fees)', amount: transportCosts },
    ceoSalary > 0 && { label: 'CEO Salary Expense', amount: ceoSalary },
    finePayment > 0 && { label: 'Compliance Fine Payments', amount: finePayment, detail: `${fmt(store.complianceFines)} outstanding` },
    dailyLoanPayment > 0 && { label: 'Loan Repayments', amount: dailyLoanPayment, detail: `${activeLoans.length} active loans` },
    hfManagementFees > 0 && { label: 'Hedge Fund Mgmt Fees', amount: hfManagementFees, detail: `${activeHF.length} strategies` },
  ].filter(Boolean);

  const statementTabs = [
    { key: 'pnl', label: 'P&L' },
    { key: 'balance', label: 'Balance Sheet' },
    { key: 'cashflow', label: 'Cash Flow' },
    { key: 'forecast', label: 'Forecast' },
  ];

  const LedgerRow = ({ label, amount, type, detail, bold }) => (
    <div className={`flex justify-between items-center text-[9px] font-mono ${bold ? 'font-bold border-t border-tactical-border/30 pt-2 mt-2' : 'bg-tactical-bg/40 rounded'} px-3 py-1.5`}>
      <div className="flex items-center gap-2">
        <span className={bold ? 'text-tactical-text/80 text-[10px]' : 'text-tactical-text/60'}>{label}</span>
        {detail && <span className="text-[7px] text-tactical-text/30">({detail})</span>}
      </div>
      <span className={`tabular-nums ${type === 'income' || (amount >= 0 && bold) ? 'text-emerald-400' : 'text-rose-400'}`}>
        {amount >= 0 ? '+' : ''}{fmt(Math.abs(amount))}
      </span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Revenue / day" value={fmt(totalRevenue)} color="#10b981" />
        <StatCard label="Expenses / day" value={fmt(totalExpenses)} color="#ef4444" />
        <StatCard label="Net Profit / day" value={`${netProfit >= 0 ? '+' : ''}${fmt(Math.abs(netProfit))}`} color={netProfit >= 0 ? '#10b981' : '#ef4444'} />
        <StatCard label="Cash Runway" value={store.companyBalance < 0 ? 'INSOLVENT' : runwayLabel} sub={store.companyBalance < 0 ? `deficit: ${fmt(store.companyBalance)}` : burnRate > 0 ? `burn: ${fmt(burnRate)}/day` : totalExpenses > 0 ? `reserve: ${fmt(store.companyBalance)}` : actuallyProfitable ? 'no expenses' : 'break-even'} color={store.companyBalance < 0 ? '#ef4444' : burnRate > 0 ? '#f59e0b' : '#10b981'} />
      </div>

      {/* Statement Tabs */}
      <div className="flex gap-1 border-b border-tactical-border/20 pb-1">
        {statementTabs.map(t => (
          <button key={t.key} onClick={() => setActiveStatement(t.key)}
            className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider rounded-t transition-colors ${activeStatement === t.key ? 'bg-white/[0.06] text-white border-b-2 border-emerald-400' : 'text-tactical-text/50 hover:text-tactical-text/80'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* P&L Statement */}
      {activeStatement === 'pnl' && (
        <div className="space-y-4">
          <div>
            <div className="text-[8px] text-emerald-400/80 font-mono font-bold mb-2 uppercase tracking-wider">Revenue</div>
            <div className="space-y-1">
              {revenueLines.map((l, i) => <LedgerRow key={i} {...l} type="income" />)}
            </div>
            <LedgerRow label="Total Revenue" amount={totalRevenue + Math.round(expectedFundYield) + creatorRevenue + ceoSalary} type="income" bold />
          </div>

          <div>
            <div className="text-[8px] text-rose-400/80 font-mono font-bold mb-2 uppercase tracking-wider">Expenses</div>
            <div className="space-y-1">
              {expenseLines.map((l, i) => <LedgerRow key={i} {...l} type="expense" amount={-l.amount} />)}
            </div>
            <LedgerRow label="Total Expenses" amount={-totalExpenses} type="expense" bold />
          </div>

          <div className="border-t-2 border-tactical-border/40 pt-3">
            <div className="flex justify-between items-center px-3">
              <div>
                <div className="text-[11px] font-mono font-bold text-tactical-text/90">EBITDA</div>
                <div className="text-[7px] text-tactical-text/40 font-mono">Earnings Before Interest, Tax, Depreciation</div>
              </div>
              <span className={`text-[14px] font-mono font-bold tabular-nums ${ebitda >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ebitda >= 0 ? '+' : ''}{fmt(Math.abs(ebitda))}
              </span>
            </div>
            <div className="flex justify-between items-center px-3 mt-2">
              <div>
                <div className="text-[11px] font-mono font-bold text-tactical-text/90">Net Profit</div>
                <div className="text-[7px] text-tactical-text/40 font-mono">After all deductions</div>
              </div>
              <span className={`text-[14px] font-mono font-bold tabular-nums ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netProfit >= 0 ? '+' : ''}{fmt(Math.abs(netProfit))}
              </span>
            </div>
            <div className="flex justify-between items-center px-3 mt-2">
              <div>
                <div className="text-[11px] font-mono font-bold text-tactical-text/90">Margin</div>
              </div>
              <span className={`text-[12px] font-mono font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {activeStatement === 'balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[8px] text-emerald-400/80 font-mono font-bold mb-2 uppercase tracking-wider">Assets</div>
            <div className="space-y-1">
              <div className="text-[7px] text-tactical-text/40 font-mono uppercase mt-1 mb-0.5 px-2">Current Assets</div>
              {[
                { label: 'Cash (Company)', value: store.companyBalance },
                { label: 'Cash (Personal)', value: store.personalBalance },
                portfolioValue !== 0 && { label: 'Trading Portfolio', value: portfolioValue, detail: unrealizedPnL !== 0 ? `P&L: ${fmt(unrealizedPnL)}` : null },
                totalStaked > 0 && { label: 'Fund Allocations', value: totalStaked, detail: `${stakedFunds.length} funds` },
              ].filter(Boolean).map((a, i) => (
                <div key={i} className="flex justify-between text-[9px] font-mono bg-tactical-bg/40 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-tactical-text/60">{a.label}</span>
                    {a.detail && <span className="text-[7px] text-tactical-text/30">({a.detail})</span>}
                  </div>
                  <span className={`tabular-nums ${a.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(a.value)}</span>
                </div>
              ))}
              <div className="text-[7px] text-tactical-text/40 font-mono uppercase mt-2 mb-0.5 px-2">Fixed Assets</div>
              {[
                totalAssetValue > 0 && { label: 'Infrastructure (Operational)', value: totalAssetValue, detail: `${operationalNodes.length} nodes` },
                buildingValue > 0 && { label: 'Under Construction', value: buildingValue },
                sportsValue > 0 && { label: 'Sports Franchises', value: sportsValue },
                shoppingValue > 0 && { label: 'Luxury & Physical Assets', value: shoppingValue },
                vcPortfolioValue > 0 && { label: 'VC Portfolio', value: vcPortfolioValue, detail: `${ownedVC.length} deals` },
                pePortfolioValue > 0 && { label: 'PE Holdings', value: pePortfolioValue, detail: `${ownedPE.length} targets` },
                auctionItemsValue > 0 && { label: 'Auction Collectibles', value: auctionItemsValue, detail: `${ownedAuctions.length} items` },
              ].filter(Boolean).map((a, i) => (
                <div key={i} className="flex justify-between text-[9px] font-mono bg-tactical-bg/40 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-tactical-text/60">{a.label}</span>
                    {a.detail && <span className="text-[7px] text-tactical-text/30">({a.detail})</span>}
                  </div>
                  <span className={`tabular-nums ${a.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(a.value)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[10px] font-mono font-bold border-t border-tactical-border/20 pt-1.5 px-2.5 mt-1">
                <span className="text-tactical-text/80">Total Assets</span>
                <span className={totalAssets >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{fmt(totalAssets)}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-[8px] text-rose-400/80 font-mono font-bold mb-2 uppercase tracking-wider">Liabilities</div>
            <div className="space-y-1">
              {[
                totalLoanDebt > 0 && { label: 'Outstanding Loans', value: totalLoanDebt, detail: `${activeLoans.length} active` },
                store.complianceFines > 0 && { label: 'Compliance Fines Owed', value: store.complianceFines },
                taxExpense > 0 && { label: 'Tax Obligations (Current)', value: taxExpense },
              ].filter(Boolean).map((l, i) => (
                <div key={i} className="flex justify-between text-[9px] font-mono bg-tactical-bg/40 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-tactical-text/60">{l.label}</span>
                    {l.detail && <span className="text-[7px] text-tactical-text/30">({l.detail})</span>}
                  </div>
                  <span className="text-rose-400 tabular-nums">{fmt(l.value)}</span>
                </div>
              ))}
              {totalLiabilities === 0 && <div className="text-[9px] text-tactical-text/40 font-mono text-center py-3">No liabilities</div>}
              <div className="flex justify-between text-[10px] font-mono font-bold border-t border-tactical-border/20 pt-1.5 px-2.5 mt-1">
                <span className="text-tactical-text/80">Total Liabilities</span>
                <span className="text-rose-400">{fmt(totalLiabilities)}</span>
              </div>
            </div>

            <div className="text-[8px] text-[#7c3aed]/80 font-mono font-bold mb-2 mt-4 uppercase tracking-wider">Equity</div>
            <div className="space-y-1">
              <div className={`flex justify-between text-[9px] font-mono border rounded px-2.5 py-2 ${equity >= 0 ? 'bg-[#7c3aed]/5 border-[#7c3aed]/20' : 'bg-rose-500/10 border-rose-500/30'}`}>
                <span className="text-tactical-text/60">Shareholders Equity</span>
                <span className={`font-bold tabular-nums ${equity >= 0 ? 'text-[#7c3aed]' : 'text-rose-400'}`}>{fmt(equity)}</span>
              </div>
              <div className="flex justify-between text-[9px] font-mono bg-tactical-bg/40 rounded px-2.5 py-1.5">
                <span className="text-tactical-text/60">Net Worth (Reported)</span>
                <span className="text-tactical-text/80 tabular-nums">{fmt(store.netWorth)}</span>
              </div>
            </div>

            {/* Balance check */}
            <div className={`mt-3 text-[8px] font-mono px-2 py-1.5 rounded ${Math.abs(totalAssets - totalLiabilities - equity) < 1 ? 'text-emerald-400/60 bg-emerald-400/5' : 'text-rose-400/60 bg-rose-400/5'}`}>
              A = L + E check: {fmt(totalAssets)} = {fmt(totalLiabilities)} + {fmt(equity)} {Math.abs(totalAssets - totalLiabilities - equity) < 1 ? '✓' : '⚠'}
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Statement */}
      {activeStatement === 'cashflow' && (
        <div className="space-y-4">
          <div>
            <div className="text-[8px] text-[#00e5ff]/80 font-mono font-bold mb-2 uppercase tracking-wider">Operating Activities</div>
            <div className="space-y-1">
              <LedgerRow label="Net Node Income (after tax)" amount={netNodeIncome} type="income" />
              {routeRevenue > 0 && <LedgerRow label="Route Revenue" amount={routeRevenue} type="income" />}
              {sportsRevenue > 0 && <LedgerRow label="Sports Revenue" amount={sportsRevenue} type="income" />}
              {transportRevenue > 0 && <LedgerRow label="Transport Revenue" amount={transportRevenue} type="income" />}
              {transportCosts > 0 && <LedgerRow label="Transport Costs" amount={-transportCosts} type="expense" />}
              {infraFeeIncome > 0 && <LedgerRow label="Infrastructure Fees" amount={infraFeeIncome} type="income" />}
              {creatorRevenue > 0 && <LedgerRow label="Creator Earnings" amount={creatorRevenue} type="income" />}
              {agentPayroll > 0 && <LedgerRow label="Agent Payroll" amount={-agentPayroll} type="expense" />}
              {finePayment > 0 && <LedgerRow label="Compliance Fines Paid" amount={-finePayment} type="expense" />}
            </div>
            <LedgerRow label="Operating Cash Flow" amount={netNodeIncome + routeRevenue + sportsRevenue + transportRevenue - transportCosts + infraFeeIncome + creatorRevenue - agentPayroll - finePayment} bold />
          </div>

          <div>
            <div className="text-[8px] text-[#7c3aed]/80 font-mono font-bold mb-2 uppercase tracking-wider">Investing Activities</div>
            <div className="space-y-1">
              {expectedFundYield !== 0 && <LedgerRow label="Fund Yield (Expected)" amount={Math.round(expectedFundYield)} type={expectedFundYield >= 0 ? 'income' : 'expense'} />}
              {unrealizedPnL !== 0 && <LedgerRow label="Unrealized Portfolio P&L" amount={unrealizedPnL} type={unrealizedPnL >= 0 ? 'income' : 'expense'} detail="mark-to-market" />}
            </div>
          </div>

          <div>
            <div className="text-[8px] text-[#f59e0b]/80 font-mono font-bold mb-2 uppercase tracking-wider">Financing Activities</div>
            <div className="space-y-1">
              {loanPaymentPerTick > 0 && <LedgerRow label="Loan Repayments" amount={-loanPaymentPerTick} type="expense" />}
              {ceoSalary > 0 && <LedgerRow label="CEO Salary (to Personal)" amount={-ceoSalary} type="expense" detail="company → personal" />}
            </div>
          </div>

          <div className="border-t-2 border-tactical-border/40 pt-3 px-3">
            <div className="flex justify-between items-center">
              <div className="text-[11px] font-mono font-bold text-tactical-text/90">Net Cash Change / month</div>
              <span className={`text-[14px] font-mono font-bold tabular-nums ${cashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cashFlow >= 0 ? '+' : ''}{fmt(Math.abs(cashFlow))}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[8px] text-tactical-text/40 font-mono">Company Balance</span>
              <span className="text-[10px] text-tactical-text/70 font-mono tabular-nums">{fmt(store.companyBalance)}</span>
            </div>
            <div className="flex justify-between items-center mt-0.5">
              <span className="text-[8px] text-tactical-text/40 font-mono">Personal Balance</span>
              <span className="text-[10px] text-tactical-text/70 font-mono tabular-nums">{fmt(store.personalBalance)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Forecast */}
      {activeStatement === 'forecast' && (
        <div className="space-y-4">
          <div className="text-[8px] text-tactical-text/40 font-mono mb-1">Projection based on current daily rates × {forecastDays} days</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Projected Revenue" value={fmt(projectedRevenue)} sub={`${forecastDays} days`} color="#10b981" />
            <StatCard label="Projected Expenses" value={fmt(projectedExpenses)} sub={`${forecastDays} days`} color="#ef4444" />
            <StatCard label="Projected Profit" value={`${projectedProfit >= 0 ? '+' : ''}${fmt(Math.abs(projectedProfit))}`} color={projectedProfit >= 0 ? '#10b981' : '#ef4444'} />
            <StatCard label="Projected Cash" value={fmt(projectedCash)} sub={projectedCash < 0 ? 'CASH DEFICIT' : ''} color={projectedCash >= 0 ? '#00e5ff' : '#ef4444'} />
          </div>

          {/* Revenue Breakdown Forecast */}
          <div>
            <SectionHeader>Revenue Breakdown (daily → {forecastDays} days)</SectionHeader>
            <div className="space-y-1">
              {revenueLines.map((l, i) => (
                <div key={i} className="flex justify-between text-[9px] font-mono bg-tactical-bg/40 rounded px-3 py-1.5">
                  <span className="text-tactical-text/60">{l.label}</span>
                  <div className="flex gap-3">
                    <span className="text-tactical-text/40 tabular-nums">{fmt(l.amount)}/day</span>
                    <span className="text-emerald-400 tabular-nums">{fmt(l.amount * forecastDays)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Breakdown Forecast */}
          <div>
            <SectionHeader>Expense Breakdown (daily → {forecastDays} days)</SectionHeader>
            <div className="space-y-1">
              {expenseLines.map((l, i) => (
                <div key={i} className="flex justify-between text-[9px] font-mono bg-tactical-bg/40 rounded px-3 py-1.5">
                  <span className="text-tactical-text/60">{l.label}</span>
                  <div className="flex gap-3">
                    <span className="text-tactical-text/40 tabular-nums">{fmt(l.amount)}/day</span>
                    <span className="text-rose-400 tabular-nums">{fmt(l.amount * forecastDays)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {store.companyBalance < 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
              <div className="text-[10px] font-mono font-bold text-rose-400 mb-1">🚨 INSOLVENT — NEGATIVE CASH</div>
              <div className="text-[9px] font-mono text-rose-300/80">
                Company balance is {fmt(store.companyBalance)}. Operations are running at a deficit.
                {netProfit > 0 ? ` Recovering at ${fmt(netProfit)}/day — estimated ${Math.ceil(Math.abs(store.companyBalance) / netProfit)} days to break even.` : ` Still losing ${fmt(burnRate)}/day.`}
              </div>
            </div>
          )}
          {burnRate > 0 && store.companyBalance >= 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
              <div className="text-[10px] font-mono font-bold text-rose-400 mb-1">⚠ CASH BURN WARNING</div>
              <div className="text-[9px] font-mono text-rose-300/80">
                Losing {fmt(burnRate)} per month. At this rate, company funds run out in ~{runwayLabel}.
                {projectedCash < 0 && ` Projected cash deficit of ${fmt(Math.abs(projectedCash))} in ${forecastDays} days.`}
              </div>
            </div>
          )}
          {actuallyProfitable && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <div className="text-[10px] font-mono font-bold text-emerald-400 mb-1">✓ PROFITABLE</div>
              <div className="text-[9px] font-mono text-emerald-300/80">
                Generating {fmt(netProfit)} profit per month. {forecastDays}-month projection: +{fmt(projectedProfit)}.
                Margin: {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tax & Compliance — always visible */}
      <ClickableSection tab="office" onNavigate={onNavigate} color="#f59e0b">
        <SectionHeader>Tax & Compliance</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Effective Rate" value={`${(store.taxRate * 100).toFixed(1)}%`} color="#f59e0b" />
          <StatCard label="Jurisdiction" value={store.companyCountry || 'Unregistered'} color="#9c8e7e" />
          <StatCard label="Heat Level" value={`${store.heat.toFixed(0)}`} sub={store.heat > 80 ? 'ASSETS FROZEN' : store.heat > 60 ? 'Income penalty' : 'Normal'} color={store.heat > 60 ? '#ef4444' : '#10b981'} />
          <StatCard label="Fines Owed" value={fmt(store.complianceFines)} color={store.complianceFines > 0 ? '#ef4444' : '#10b981'} />
        </div>
      </ClickableSection>

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Financial Tab ──
function FinancialTab({ store, onNavigate }) {
  const deptLevels = getDeptLevels(store.projects);
  const portfolioPositions = Object.values(store.portfolio || {});
  const portfolioValue = portfolioPositions.reduce((s, p) => s + p.quantity * p.avgCost, 0);
  const stakedFunds = store.funds.filter(f => (f.stakedAmount || 0) > 0);
  const totalStaked = stakedFunds.reduce((s, f) => s + (f.stakedAmount || 0), 0);
  const totalLiquid = store.personalBalance + store.companyBalance;
  const totalInvested = portfolioValue + totalStaked;
  const allocationPct = store.netWorth > 0 ? {
    cash: Math.round((totalLiquid / store.netWorth) * 100),
    portfolio: Math.round((portfolioValue / store.netWorth) * 100),
    funds: Math.round((totalStaked / store.netWorth) * 100),
    infra: 100 - Math.round((totalLiquid / store.netWorth) * 100) - Math.round((portfolioValue / store.netWorth) * 100) - Math.round((totalStaked / store.netWorth) * 100),
  } : { cash: 0, portfolio: 0, funds: 0, infra: 0 };

  const riskMetrics = {
    diversification: Math.min(portfolioPositions.length * 10 + stakedFunds.length * 15, 100),
    liquidity: store.netWorth > 0 ? Math.round((totalLiquid / store.netWorth) * 100) : 0,
    leverage: 0,
    volatility: Math.min(store.heat * 1.2, 100),
  };

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Liquid" value={fmt(totalLiquid)} sub="Cash available" color="#00e5ff" />
        <StatCard label="Total Invested" value={fmt(totalInvested)} sub="Portfolio + Funds" color="#7c3aed" />
        <StatCard label="Net Worth" value={fmt(store.netWorth)} color="#10b981" />
        <StatCard label="Cash Ratio" value={`${allocationPct.cash}%`} sub={allocationPct.cash < 20 ? 'LOW — consider liquidity' : 'Healthy'} color={allocationPct.cash < 20 ? '#f59e0b' : '#10b981'} />
      </div>

      {/* Asset Allocation */}
      <ClickableSection tab="assets" onNavigate={onNavigate} color="#00e5ff">
        <SectionHeader>Asset Allocation</SectionHeader>
        <div className="space-y-2">
          <MiniBar label={`Cash & Equivalents — ${allocationPct.cash}%`} value={allocationPct.cash} color="#00e5ff" />
          <MiniBar label={`Trading Portfolio — ${allocationPct.portfolio}%`} value={allocationPct.portfolio} color="#7c3aed" />
          <MiniBar label={`Fund Allocations — ${allocationPct.funds}%`} value={allocationPct.funds} color="#ec4899" />
          <MiniBar label={`Infrastructure & Assets — ${Math.max(allocationPct.infra, 0)}%`} value={Math.max(allocationPct.infra, 0)} color="#f59e0b" />
        </div>
      </ClickableSection>

      {/* Risk Metrics — requires Finance dept Lv1 */}
      <LockedSection deptName="Finance" requiredLevel={1} currentLevel={deptLevels.Finance}>
        <ClickableSection tab="defcon" onNavigate={onNavigate} color="#ef4444">
          <SectionHeader>Risk Assessment</SectionHeader>
          <div className="flex justify-around py-2">
            <AxisRing label="Diversification" value={riskMetrics.diversification} color="#10b981" />
            <AxisRing label="Liquidity" value={riskMetrics.liquidity} color="#00e5ff" />
            <AxisRing label="Volatility" value={riskMetrics.volatility} color="#ef4444" />
          </div>
        </ClickableSection>
      </LockedSection>

      {/* Portfolio Breakdown */}
      <ClickableSection tab="assets" onNavigate={onNavigate} color="#7c3aed">
        <SectionHeader>Trading Portfolio — {portfolioPositions.length} Positions</SectionHeader>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {portfolioPositions.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono text-center py-4">No open positions</div>}
          {portfolioPositions.map(p => (
            <div key={p.symbol} className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/40 rounded px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-tactical-text/80 font-bold">{p.symbol}</span>
                <span className="text-[7px] text-tactical-text/45 uppercase">{p.instrumentType}</span>
              </div>
              <div className="text-right">
                <span className="text-[#00e5ff] tabular-nums">{fmt(p.quantity * p.avgCost)}</span>
                <span className="text-tactical-text/45 text-[7px] ml-1">({p.quantity} × {fmt(p.avgCost)})</span>
              </div>
            </div>
          ))}
          {portfolioPositions.length > 0 && (
            <div className="flex justify-between text-[10px] font-mono font-bold border-t border-tactical-border/20 pt-2 mt-1 px-3">
              <span className="text-tactical-text/70">Total</span>
              <span className="text-[#00e5ff]">{fmt(portfolioValue)}</span>
            </div>
          )}
        </div>
      </ClickableSection>

      {/* Fund Allocations */}
      <ClickableSection tab="funds" onNavigate={onNavigate} color="#ec4899">
        <SectionHeader>Fund Allocations — {stakedFunds.length} Active</SectionHeader>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {stakedFunds.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono text-center py-4">No fund allocations</div>}
          {stakedFunds.map(f => (
            <div key={f.id} className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/40 rounded px-3 py-2">
              <div>
                <span className="text-tactical-text/80 font-bold">{f.name}</span>
                <span className="text-tactical-text/45 text-[7px] ml-1.5">{f.strategy}</span>
              </div>
              <div className="text-right">
                <span className="text-[#7c3aed] tabular-nums">{fmt(f.stakedAmount || 0)}</span>
                <span className="text-tactical-text/45 text-[7px] ml-1">@ {f.managementFee}</span>
              </div>
            </div>
          ))}
        </div>
      </ClickableSection>

      {/* Financial Strategies — requires Finance dept Lv2 */}
      <LockedSection deptName="Finance" requiredLevel={2} currentLevel={deptLevels.Finance}>
        <ClickableSection tab="office" onNavigate={onNavigate} color="#f59e0b">
          <SectionHeader>Financial Strategies</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: 'Tax Optimization', description: 'Register in a low-tax jurisdiction to reduce effective rate', cost: 50000, effect: `Current rate: ${(store.taxRate * 100).toFixed(0)}%`, color: '#f59e0b', status: store.companyCountry ? 'ACTIVE' : 'AVAILABLE' },
              { title: 'Portfolio Rebalancing', description: 'Diversify holdings to reduce risk exposure', cost: 10000, effect: `Diversification: ${riskMetrics.diversification}%`, color: '#7c3aed', status: 'AVAILABLE' },
              { title: 'Cash Reserve Strategy', description: 'Maintain 20%+ liquidity for opportunities', cost: 0, effect: `Current liquidity: ${riskMetrics.liquidity}%`, color: '#00e5ff', status: riskMetrics.liquidity >= 20 ? 'MET' : 'BELOW TARGET' },
              { title: 'Income Diversification', description: 'Balance income across nodes, routes, sports, and funds', cost: 0, effect: 'Reduce single-source dependency', color: '#10b981', status: 'REVIEW' },
            ].map((s, i) => (
              <ActionCard key={i} {...s} />
            ))}
          </div>
        </ClickableSection>
      </LockedSection>

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Department Level Helper ──
// Department level = completed projects in that dept (0-4). Gates how much intel each tab reveals.
function getDeptLevels(projects) {
  const DEPTS = ['HR', 'Trading', 'Marketing', 'R&D', 'Finance', 'Legal'];
  const levels = {};
  DEPTS.forEach(d => {
    const completed = projects.filter(p => p.dept === d && p.active).length;
    levels[d] = Math.min(completed, 4);
  });
  levels._total = Object.values(levels).reduce((s, v) => s + v, 0);
  return levels;
}

// ── CEO Inbox Generator ──
function generateCeoInbox(store, deptLevels) {
  const emails = [];
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const activeRoutes = store.routes.filter(r => r.active);
  const now = Date.now();
  const timeAgo = (mins) => `${mins}m ago`;

  // HR emails
  if (deptLevels.HR >= 0) {
    const unassigned = Object.values(store.cards).filter(c => !c.assignedNodeId);
    if (unassigned.length > 0)
      emails.push({ from: 'HR Department', dept: 'HR', icon: '👤', priority: 'medium', time: timeAgo(15), subject: `${unassigned.length} employee(s) unassigned`, body: `We have ${unassigned.length} team member${unassigned.length > 1 ? 's' : ''} without a post. Consider deploying them to nodes for maximum output.`, action: 'View Workforce', tab: 'assets' });
    if (deptLevels.HR >= 1)
      emails.push({ from: 'HR Department', dept: 'HR', icon: '👤', priority: 'low', time: timeAgo(45), subject: 'Monthly morale report', body: `CEO approval is at ${store.ceoApproval}%. ${store.ceoApproval < 50 ? 'Consider running an employee engagement project.' : 'Morale is healthy.'}`, action: null, tab: null });
    if (deptLevels.HR >= 2)
      emails.push({ from: 'HR Department', dept: 'HR', icon: '👤', priority: 'info', time: timeAgo(120), subject: 'Talent pipeline update', body: `Current headcount: ${Object.keys(store.cards).length} cards. Open packs to recruit more talent.`, action: 'Open Packs', tab: 'assets' });
  }

  // Trading emails
  if (deptLevels.Trading >= 0) {
    const positions = Object.values(store.portfolio || {});
    if (positions.length > 0)
      emails.push({ from: 'Trading Desk', dept: 'Trading', icon: '📊', priority: 'medium', time: timeAgo(5), subject: `Portfolio: ${positions.length} open position${positions.length > 1 ? 's' : ''}`, body: `Total portfolio value: ${fmt(positions.reduce((s, p) => s + p.quantity * p.avgCost, 0))}. Monitor for rebalancing opportunities.`, action: 'View Portfolio', tab: 'assets' });
    if (deptLevels.Trading >= 1 && store.heat > 30)
      emails.push({ from: 'Trading Desk', dept: 'Trading', icon: '📊', priority: 'high', time: timeAgo(3), subject: 'Heat level warning', body: `Current heat: ${store.heat}/100. High heat increases regulatory scrutiny. Consider reducing exposure.`, action: 'View DEFCON', tab: 'defcon' });
    if (deptLevels.Trading >= 2)
      emails.push({ from: 'Trading Desk', dept: 'Trading', icon: '📊', priority: 'info', time: timeAgo(60), subject: 'Market regime analysis', body: `ATHENA signal: ${store.athenaRegime}. Geopolitical risk score: ${store.athenaScore}/100. ${store.athenaRegime === 'risk-off' ? 'Consider defensive positioning.' : 'Conditions favorable for growth.'}`, action: null, tab: null });
  }

  // Marketing emails
  if (deptLevels.Marketing >= 0) {
    emails.push({ from: 'Marketing', dept: 'Marketing', icon: '📣', priority: 'low', time: timeAgo(30), subject: `Brand reach: ${store.followers.toLocaleString()} followers`, body: `Current follower base at ${store.followers.toLocaleString()}. ${store.followers < 1000 ? 'Run campaigns to grow brand awareness.' : 'Strong brand presence.'}`, action: 'View Marketing', tab: 'departments' });
    if (deptLevels.Marketing >= 1 && playerNodes.length > 0) {
      const sectors = {};
      playerNodes.forEach(n => { sectors[n.type] = (sectors[n.type] || 0) + 1; });
      const topSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0];
      emails.push({ from: 'Marketing', dept: 'Marketing', icon: '📣', priority: 'info', time: timeAgo(90), subject: 'Sector dominance report', body: `Strongest sector: ${topSector[0].replace('_', ' ')} (${topSector[1]} node${topSector[1] > 1 ? 's' : ''}). Sector focus can unlock synergies.`, action: null, tab: null });
    }
  }

  // R&D emails
  if (deptLevels['R&D'] >= 0) {
    const activeRD = store.rdProjects.filter(p => p.status === 'researching');
    const availableRD = store.rdProjects.filter(p => p.status === 'available');
    if (activeRD.length > 0)
      emails.push({ from: 'R&D Lab', dept: 'R&D', icon: '🔬', priority: 'medium', time: timeAgo(20), subject: `${activeRD.length} research project(s) in progress`, body: activeRD.map(p => `${p.name}: ${p.progress}% complete`).join('. '), action: 'View R&D', tab: 'rnd' });
    if (deptLevels['R&D'] >= 1 && availableRD.length > 0)
      emails.push({ from: 'R&D Lab', dept: 'R&D', icon: '🔬', priority: 'info', time: timeAgo(180), subject: `${availableRD.length} research opportunities available`, body: 'New technologies available for research. Investing in R&D can unlock major income multipliers.', action: 'Browse R&D', tab: 'rnd' });
  }

  // Finance emails
  if (deptLevels.Finance >= 0) {
    emails.push({ from: 'Finance', dept: 'Finance', icon: '💰', priority: store.taxRate > 0.25 ? 'high' : 'low', time: timeAgo(10), subject: `Effective tax rate: ${(store.taxRate * 100).toFixed(0)}%`, body: `Current tax rate at ${(store.taxRate * 100).toFixed(1)}%.${store.companyCountry ? ` Registered in ${store.companyCountry}.` : ' No jurisdiction registered — consider tax optimisation.'}`, action: !store.companyCountry ? 'Set Jurisdiction' : null, tab: 'office' });
    if (deptLevels.Finance >= 1) {
      const stakedTotal = store.funds.filter(f => (f.stakedAmount || 0) > 0).reduce((s, f) => s + (f.stakedAmount || 0), 0);
      if (stakedTotal > 0)
        emails.push({ from: 'Finance', dept: 'Finance', icon: '💰', priority: 'info', time: timeAgo(60), subject: `Fund allocations: ${fmt(stakedTotal)}`, body: `${store.funds.filter(f => (f.stakedAmount || 0) > 0).length} fund(s) active. Review performance and rebalance as needed.`, action: 'View Funds', tab: 'funds' });
    }
    if (deptLevels.Finance >= 2) {
      const totalRevenue = playerNodes.reduce((s, n) => s + n.income, 0) + activeRoutes.reduce((s, r) => s + (r.monthlyRevenue || 0), 0);
      emails.push({ from: 'Finance', dept: 'Finance', icon: '💰', priority: 'info', time: timeAgo(240), subject: 'Monthly P&L summary', body: `Gross revenue: ${fmt(totalRevenue)}/day. Tax burden: ${fmt(Math.round(totalRevenue * store.taxRate))}/day. Net: ${fmt(Math.round(totalRevenue * (1 - store.taxRate)))}/day.`, action: null, tab: null });
    }
  }

  // Legal emails
  if (deptLevels.Legal >= 0) {
    if (store.heat > 0)
      emails.push({ from: 'Legal Counsel', dept: 'Legal', icon: '⚖️', priority: store.heat > 50 ? 'high' : 'low', time: timeAgo(8), subject: `Regulatory exposure: ${store.heat}/100 heat`, body: `${store.heat > 50 ? 'URGENT: High heat level. Compliance review strongly recommended.' : 'Heat levels manageable. Continue monitoring.'}`, action: store.heat > 50 ? 'View DEFCON' : null, tab: store.heat > 50 ? 'defcon' : null });
    if (deptLevels.Legal >= 1)
      emails.push({ from: 'Legal Counsel', dept: 'Legal', icon: '⚖️', priority: 'info', time: timeAgo(360), subject: 'Governance compliance', body: `Governance score: ${store.governance}/100. ${store.governance < 40 ? 'Below threshold — risk of penalties.' : 'Within acceptable range.'}`, action: null, tab: null });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
  emails.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
  return emails;
}

// ── CEO Advice Generator ──
function generateAdvice(store, deptLevels) {
  const advice = [];
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');

  // Always-visible basic advice
  if (playerNodes.length === 0) advice.push({ text: 'Acquire your first node to start generating income.', dept: null, color: '#00e5ff', priority: 0 });
  if (store.companyBalance < 10000 && playerNodes.length > 0) advice.push({ text: 'Company cash is low. Focus on revenue before expanding.', dept: 'Finance', color: '#f59e0b', priority: 0 });
  if (store.heat > 60) advice.push({ text: 'Heat is critical. Pause shadow ops and consider compliance projects.', dept: 'Legal', color: '#ef4444', priority: 0 });

  // Dept-gated advice
  if (deptLevels.HR >= 1) {
    const unassigned = Object.values(store.cards).filter(c => !c.assignedNodeId).length;
    if (unassigned > 2) advice.push({ text: `Deploy ${unassigned} idle employees to nodes for bonus multipliers.`, dept: 'HR', color: '#10b981', priority: 1 });
  }
  if (deptLevels.Trading >= 1 && store.athenaRegime === 'risk-off') advice.push({ text: 'Markets are risk-off. Consider defensive positions or cash reserves.', dept: 'Trading', color: '#00e5ff', priority: 1 });
  if (deptLevels.Trading >= 2 && Object.values(store.portfolio || {}).length < 3) advice.push({ text: 'Portfolio is under-diversified. Spread across 3+ instruments.', dept: 'Trading', color: '#7c3aed', priority: 1 });
  if (deptLevels.Marketing >= 1 && store.followers < 500) advice.push({ text: 'Brand awareness is low. Run a social media campaign.', dept: 'Marketing', color: '#ec4899', priority: 1 });
  if (deptLevels.Marketing >= 2 && store.ceoApproval < 50) advice.push({ text: 'CEO approval below 50%. Launch a PR initiative.', dept: 'Marketing', color: '#ec4899', priority: 1 });
  if (deptLevels['R&D'] >= 1 && store.rdProjects.filter(p => p.status === 'researching').length === 0) advice.push({ text: 'No active R&D. Start a research project to unlock multipliers.', dept: 'R&D', color: '#7c3aed', priority: 1 });
  if (deptLevels.Finance >= 1 && !store.companyCountry) advice.push({ text: 'Register a jurisdiction to optimize your tax rate.', dept: 'Finance', color: '#f59e0b', priority: 1 });
  if (deptLevels.Finance >= 2 && store.personalBalance + store.companyBalance < store.netWorth * 0.15) advice.push({ text: 'Cash reserves below 15% of net worth. Liquidate or reduce spending.', dept: 'Finance', color: '#f59e0b', priority: 1 });
  if (deptLevels.Legal >= 1 && store.governance < 30) advice.push({ text: 'Governance critically low. Run compliance or audit projects.', dept: 'Legal', color: '#6366f1', priority: 1 });
  if (deptLevels.Legal >= 2) advice.push({ text: `Structure: ${store.structure}. Review if it still fits your growth strategy.`, dept: 'Legal', color: '#6366f1', priority: 2 });

  // Deep insight at high dept levels
  if (deptLevels._total >= 8) {
    const growth = store.growth, gov = store.governance, imp = store.impact, pow = store.power;
    const weakest = [{ n: 'Growth', v: growth }, { n: 'Governance', v: gov }, { n: 'Impact', v: imp }, { n: 'Power', v: pow }].sort((a, b) => a.v - b.v)[0];
    advice.push({ text: `Weakest axis: ${weakest.n} (${weakest.v}/100). Balance your empire for long-term stability.`, dept: null, color: '#a78bfa', priority: 2 });
  }
  if (deptLevels._total >= 12) {
    const esg = Math.round((store.impact * 0.6 + (100 - store.heat) * 0.4 + store.governance * 0.5 + store.impact * 0.3 + store.ceoApproval * 0.2 + store.governance * 0.7 + (100 - store.heat) * 0.3) / 3);
    advice.push({ text: `ESG composite: ~${esg}. Strong ESG unlocks Social Enterprise benefits.`, dept: null, color: '#10b981', priority: 2 });
  }

  advice.sort((a, b) => a.priority - b.priority);
  return advice;
}

// ── Absence Report Generator ──
function generateAbsenceReport(store, deptLevels) {
  const items = [];
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');
  const activeRoutes = store.routes.filter(r => r.active);
  const totalIncome = playerNodes.reduce((s, n) => s + n.income, 0) + activeRoutes.reduce((s, r) => s + (r.monthlyRevenue || 0), 0);

  items.push({ label: 'Revenue collected while away', value: fmt(totalIncome), color: '#10b981', icon: '💵' });
  items.push({ label: 'Nodes operational', value: `${playerNodes.filter(n => n.status === 'operational').length}/${playerNodes.length}`, color: '#00e5ff', icon: '🏢' });
  items.push({ label: 'Active routes', value: `${activeRoutes.length}`, color: '#a78bfa', icon: '🚢' });
  items.push({ label: 'Heat change', value: store.heat > 0 ? `+${store.heat}` : '0', color: store.heat > 30 ? '#ef4444' : '#10b981', icon: '🌡️' });

  if (deptLevels.HR >= 1) {
    const newCards = Object.values(store.cards).length;
    items.push({ label: 'Workforce headcount', value: `${newCards}`, color: '#10b981', icon: '👥' });
  }
  if (deptLevels.Trading >= 1) {
    const positions = Object.values(store.portfolio || {}).length;
    items.push({ label: 'Open trading positions', value: `${positions}`, color: '#7c3aed', icon: '📈' });
  }
  if (deptLevels['R&D'] >= 1) {
    const researching = store.rdProjects.filter(p => p.status === 'researching').length;
    const completed = store.rdProjects.filter(p => p.status === 'completed').length;
    items.push({ label: 'R&D progress', value: `${completed} done, ${researching} active`, color: '#7c3aed', icon: '🔬' });
  }
  if (deptLevels.Finance >= 1) {
    items.push({ label: 'Tax obligations', value: `${fmt(Math.round(totalIncome * store.taxRate))}/day`, color: '#f59e0b', icon: '🏛️' });
  }
  if (deptLevels.Marketing >= 1) {
    items.push({ label: 'Follower count', value: store.followers.toLocaleString(), color: '#ec4899', icon: '📣' });
  }

  return items;
}

// ── CEO To-Do Generator ──
function generateTodos(store, deptLevels) {
  const todos = [];
  const playerNodes = Object.values(store.nodes).filter(n => n.owner === 'player');

  // Always-visible todos
  if (playerNodes.length === 0)
    todos.push({ text: 'Acquire your first node from the market', priority: 'high', tab: 'market', done: false });
  const unassigned = Object.values(store.cards).filter(c => !c.assignedNodeId);
  if (unassigned.length > 0)
    todos.push({ text: `Assign ${unassigned.length} idle employee${unassigned.length > 1 ? 's' : ''} to nodes`, priority: 'medium', tab: 'assets', done: false });
  if (!store.companyCountry)
    todos.push({ text: 'Register a company jurisdiction for tax benefits', priority: 'medium', tab: 'office', done: false });
  if (store.routes.filter(r => r.active).length === 0 && playerNodes.length >= 2)
    todos.push({ text: 'Establish your first trade route between nodes', priority: 'medium', tab: 'routes', done: false });

  // Dept-gated todos
  if (deptLevels.HR >= 1 && Object.keys(store.cards).length < 5)
    todos.push({ text: 'Recruit more talent — open card packs', priority: 'low', tab: 'assets', done: false });
  if (deptLevels.Trading >= 1 && Object.values(store.portfolio || {}).length === 0)
    todos.push({ text: 'Make your first trade on the exchange', priority: 'low', tab: null, done: false });
  if (deptLevels.Marketing >= 1 && store.followers < 200)
    todos.push({ text: 'Run a marketing campaign to grow followers', priority: 'low', tab: 'departments', done: false });
  if (deptLevels['R&D'] >= 1 && store.rdProjects.filter(p => p.status === 'completed').length === 0)
    todos.push({ text: 'Complete your first R&D project', priority: 'low', tab: 'rnd', done: false });
  if (deptLevels.Finance >= 1 && store.funds.filter(f => (f.stakedAmount || 0) > 0).length === 0)
    todos.push({ text: 'Allocate capital to an investment fund', priority: 'low', tab: 'funds', done: false });
  if (deptLevels.Legal >= 1 && store.heat > 40)
    todos.push({ text: 'Reduce heat — run a compliance review', priority: 'high', tab: 'departments', done: false });
  if (deptLevels._total >= 6 && store.growth < 30)
    todos.push({ text: 'Growth axis is lagging — focus on expansion', priority: 'medium', tab: 'overview', done: false });
  if (deptLevels._total >= 10 && store.governance < 40)
    todos.push({ text: 'Improve governance to avoid regulatory penalties', priority: 'high', tab: 'esg', done: false });

  // Mark completed items
  if (store.companyCountry) {
    const idx = todos.findIndex(t => t.text.includes('jurisdiction'));
    if (idx !== -1) todos[idx].done = true;
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  todos.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
  return todos;
}

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981', info: '#6366f1' };

// ── Office Tab ──
function OfficeTab({ store, onNavigate }) {
  const deptLevels = getDeptLevels(store.projects);
  const emails = generateCeoInbox(store, deptLevels);
  const absenceReport = generateAbsenceReport(store, deptLevels);
  const todos = generateTodos(store, deptLevels);
  const advice = generateAdvice(store, deptLevels);
  const [emailFilter, setEmailFilter] = useState('all');
  const [officeSubTab, setOfficeSubTab] = useState('inbox');

  const filteredEmails = emailFilter === 'all' ? emails : emails.filter(e => e.dept === emailFilter);
  const deptNames = [...new Set(emails.map(e => e.dept))];

  const difficultyColors = { easy: '#10b981', normal: '#00e5ff', hard: '#f59e0b', legendary: '#ef4444' };

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 bg-tactical-bg/40 p-1 rounded-lg border border-tactical-border/20 w-fit">
        {[{ key: 'inbox', label: 'CEO Office', icon: '📋' }, { key: 'career', label: 'My Career', icon: '💼' }].map(st => {
          const isActive = officeSubTab === st.key;
          return (
            <button key={st.key} onClick={() => setOfficeSubTab(st.key)}
              className={`px-4 py-2 rounded-md text-[9px] font-mono uppercase tracking-widest transition-all flex items-center gap-2 ${isActive ? 'bg-[#6366f1]/15 text-[#6366f1] font-bold border border-[#6366f1]/30' : 'text-tactical-text/40 hover:text-tactical-text/70 border border-transparent'}`}>
              <span>{st.icon}</span>{st.label}
            </button>
          );
        })}
      </div>

      {officeSubTab === 'career' && (
        <div className="space-y-6">
          {/* Career KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="CEO Experience" value={store.ceoExperience || 0} sub="XP from leading companies" color="#6366f1" />
            <StatCard label="Career History" value={`${(store.careerHistory || []).length} roles`} color="#00e5ff" />
            <StatCard label="Current Salary" value={fmt(store.currentContract?.salary || 0)} sub="per tick" color="#10b981" />
            <StatCard label="Contract Term" value={`${store.currentContract?.termRemaining || store.currentContract?.term || 0} ticks`} color="#f59e0b" />
          </div>

          {/* Current Contract */}
          {store.currentContract && (
            <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
              <SectionHeader>Current Contract</SectionHeader>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3 text-center">
                  <div className="text-[7px] text-tactical-text/40 uppercase font-mono mb-1">Salary / Tick</div>
                  <div className="text-sm font-bold font-mono text-[#10b981]">{fmt(store.currentContract.salary)}</div>
                </div>
                <div className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3 text-center">
                  <div className="text-[7px] text-tactical-text/40 uppercase font-mono mb-1">Bonus Target</div>
                  <div className="text-sm font-bold font-mono text-[#f59e0b]">{fmt(store.currentContract.bonusTarget)}</div>
                </div>
                <div className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3 text-center">
                  <div className="text-[7px] text-tactical-text/40 uppercase font-mono mb-1">Bonus Payout</div>
                  <div className="text-sm font-bold font-mono text-[#7c3aed]">{fmt(store.currentContract.bonusPayout)}</div>
                </div>
                <div className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3 text-center">
                  <div className="text-[7px] text-tactical-text/40 uppercase font-mono mb-1">Contract Length</div>
                  <div className="text-sm font-bold font-mono text-[#00e5ff]">{store.currentContract.term} ticks</div>
                </div>
              </div>
            </div>
          )}

          {/* Sacked State */}
          {store.sacked && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/40 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">💼</div>
              <div className="text-sm font-mono font-bold text-[#ef4444] mb-1">CONTRACT TERMINATED</div>
              <div className="text-[9px] font-mono text-tactical-text/50 mb-3">The board has ended your tenure. Use your experience to find a new position below.</div>
            </div>
          )}

          {/* Career History */}
          {(store.careerHistory || []).length > 0 && (
            <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
              <SectionHeader>Career History</SectionHeader>
              <div className="space-y-2">
                {(store.careerHistory || []).map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${difficultyColors[entry.difficulty] || '#00e5ff'}15` }}>
                      {entry.sacked ? '❌' : '✅'}
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-mono font-bold text-tactical-text/90">{entry.company}</div>
                      <div className="text-[7px] font-mono text-tactical-text/40">{entry.role || 'CEO'} · {fmtGameTime(entry.duration || 0)} · {entry.difficulty || 'normal'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-mono font-bold" style={{ color: entry.sacked ? '#ef4444' : '#10b981' }}>{entry.sacked ? 'SACKED' : 'RESIGNED'}</div>
                      <div className="text-[7px] font-mono text-tactical-text/45">+{entry.xpEarned || 0} XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Positions — rotate every 3 real days + every in-game quarter */}
          <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
            <SectionHeader>Available CEO Positions — Refreshes Periodically</SectionHeader>
            <div className="space-y-3">
              {getAvailablePositions(store.gameTick).map(opp => {
                const eligible = (store.ceoExperience || 0) >= opp.reqExperience;
                const dc = difficultyColors[opp.difficulty];
                return (
                  <div key={opp.id} className={`bg-tactical-bg/50 border rounded-lg p-4 transition-all ${eligible ? 'border-tactical-border/20 hover:border-tactical-border/40' : 'border-tactical-border/10 opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${opp.color}15`, border: `1px solid ${opp.color}30` }}>
                        {opp.sector === 'tech' ? '💻' : opp.sector === 'energy' ? '⚡' : opp.sector === 'defense' ? '🛡️' : opp.sector === 'finance' ? '🏦' : '🔬'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-tactical-text/90">{opp.company}</span>
                            <span className="text-[7px] font-mono px-1.5 py-0.5 rounded font-bold" style={{ color: dc, backgroundColor: `${dc}15`, border: `1px solid ${dc}30` }}>{opp.difficulty.toUpperCase()}</span>
                          </div>
                          {!eligible && <span className="text-[7px] font-mono text-[#ef4444]">Req: {opp.reqExperience} XP</span>}
                        </div>
                        <div className="text-[9px] font-mono text-tactical-text/55 mb-2">{opp.description}</div>
                        <div className="grid grid-cols-4 gap-2 text-[8px] font-mono mb-2">
                          <div><span className="text-tactical-text/45">Structure:</span> <span className="text-tactical-text/60">{opp.structure}</span></div>
                          <div><span className="text-tactical-text/45">Salary:</span> <span className="text-[#10b981] font-bold">{fmt(opp.salary)}/tick</span></div>
                          <div><span className="text-tactical-text/45">Bonus:</span> <span className="text-[#f59e0b] font-bold">{fmt(opp.bonus)}</span></div>
                          <div><span className="text-tactical-text/45">Company NW:</span> <span className="text-[#00e5ff] font-bold">{fmt(opp.netWorth)}</span></div>
                        </div>
                        {eligible && (
                          <button
                            onClick={() => store.acceptPosition({
                              company: opp.company,
                              structure: opp.structure,
                              salary: opp.salary,
                              bonus: opp.bonus,
                              netWorth: opp.netWorth,
                              difficulty: opp.difficulty,
                            })}
                            className="text-[7px] font-mono uppercase tracking-widest px-3 py-1.5 rounded border transition-all hover:brightness-125"
                            style={{ color: opp.color, borderColor: `${opp.color}40`, backgroundColor: `${opp.color}10` }}
                          >
                            Apply for Position →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {officeSubTab === 'inbox' && <>
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Unread Messages" value={emails.length} color="#6366f1" />
        <StatCard label="Urgent" value={emails.filter(e => e.priority === 'high').length} color="#ef4444" />
        <StatCard label="To-Do Items" value={todos.filter(t => !t.done).length} color="#f59e0b" />
        <StatCard label="Dept Intel Level" value={`${deptLevels._total}/24`} sub="Improve depts for more intel" color="#a78bfa" />
      </div>

      {/* Absence Report */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Absence Report — What Happened While You Were Away</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {absenceReport.map((item, i) => (
            <div key={i} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3 text-center">
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-sm font-bold font-mono tabular-nums" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[8px] text-tactical-text/55 font-mono uppercase mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CEO Inbox */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>CEO Inbox — {emails.length} Messages</SectionHeader>
        {/* Dept filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setEmailFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[8px] font-mono uppercase tracking-[0.08em] border transition-all ${emailFilter === 'all' ? 'text-[#6366f1] border-[#6366f1]/40 bg-[#6366f1]/10 font-bold' : 'border-transparent text-tactical-text/40 hover:text-tactical-text/70 bg-tactical-bg/40'}`}
          >All ({emails.length})</button>
          {deptNames.map(dept => {
            const c = DEPT_COLORS[dept] || '#9c8e7e';
            const count = emails.filter(e => e.dept === dept).length;
            return (
              <button key={dept} onClick={() => setEmailFilter(dept)}
                className={`px-2.5 py-1 rounded-md text-[8px] font-mono uppercase tracking-[0.08em] border transition-all ${emailFilter === dept ? 'font-bold' : 'border-transparent text-tactical-text/40 hover:text-tactical-text/70 bg-tactical-bg/40'}`}
                style={emailFilter === dept ? { color: c, borderColor: `${c}40`, backgroundColor: `${c}10` } : {}}
              >{dept} ({count})</button>
            );
          })}
        </div>
        {/* Email list */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredEmails.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono text-center py-4">No messages in this category</div>}
          {filteredEmails.map((email, i) => {
            const pColor = PRIORITY_COLORS[email.priority] || '#6366f1';
            return (
              <div key={i} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3 hover:border-tactical-border/40 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="text-lg flex-shrink-0 mt-0.5">{email.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-tactical-text/90">{email.from}</span>
                        <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{ color: pColor, backgroundColor: `${pColor}15`, border: `1px solid ${pColor}30` }}>{email.priority.toUpperCase()}</span>
                      </div>
                      <span className="text-[8px] text-tactical-text/45 font-mono flex-shrink-0">{email.time}</span>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-tactical-text/90 mb-1">{email.subject}</div>
                    <div className="text-[9px] text-tactical-text/60 font-mono leading-relaxed">{email.body}</div>
                    {email.action && (
                      <button
                        onClick={() => onNavigate(email.tab)}
                        className="mt-2 text-[7px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border transition-all hover:brightness-125"
                        style={{ color: pColor, borderColor: `${pColor}40`, backgroundColor: `${pColor}10` }}
                      >{email.action} →</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* To-Do List */}
        <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
          <SectionHeader>CEO To-Do List</SectionHeader>
          <div className="space-y-2">
            {todos.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono text-center py-4">All clear — no action items</div>}
            {todos.map((todo, i) => {
              const pColor = PRIORITY_COLORS[todo.priority] || '#6366f1';
              return (
                <div key={i} className={`flex items-start gap-2.5 bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3 ${todo.done ? 'opacity-40' : ''}`}>
                  <div className="mt-0.5 w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: todo.done ? '#10b981' : `${pColor}60`, backgroundColor: todo.done ? '#10b98120' : 'transparent' }}
                  >
                    {todo.done && <span className="text-[8px] text-[#10b981]">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[9px] font-mono ${todo.done ? 'line-through text-tactical-text/45' : 'text-tactical-text/80'}`}>{todo.text}</div>
                  </div>
                  {!todo.done && todo.tab && (
                    <button onClick={() => onNavigate(todo.tab)} className="text-[7px] font-mono uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0 transition-all hover:brightness-125" style={{ color: pColor, backgroundColor: `${pColor}10` }}>Go →</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Advice */}
        <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
          <SectionHeader>Strategic Advice</SectionHeader>
          <div className="space-y-2">
            {advice.length === 0 && <div className="text-[9px] text-tactical-text/45 font-mono text-center py-4">No advice at this time</div>}
            {advice.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: a.color }} />
                <div className="flex-1">
                  <div className="text-[9px] font-mono text-tactical-text/80">{a.text}</div>
                  {a.dept && <div className="text-[7px] font-mono mt-0.5" style={{ color: DEPT_COLORS[a.dept] || '#9c8e7e' }}>— {a.dept} Department</div>}
                </div>
              </div>
            ))}
            {deptLevels._total < 6 && (
              <div className="flex items-center gap-2 bg-[#6366f1]/5 border border-[#6366f1]/20 rounded-lg px-3 py-2 mt-2">
                <span className="text-[10px]">🔒</span>
                <div className="text-[8px] font-mono text-[#6366f1]">Complete more department projects to unlock deeper strategic insights</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Intel Levels */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Department Intelligence Levels — Unlock More Info</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(deptLevels).filter(([k]) => k !== '_total').map(([dept, level]) => {
            const c = DEPT_COLORS[dept] || '#9c8e7e';
            return (
              <div key={dept} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-mono font-bold" style={{ color: c }}>{dept}</span>
                  <span className="text-[9px] font-mono text-tactical-text/55">Lv {level}/4</span>
                </div>
                <div className="h-1.5 bg-tactical-border/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(level / 4) * 100}%`, backgroundColor: c }} />
                </div>
                <div className="text-[8px] text-tactical-text/45 font-mono mt-1">
                  {level === 0 ? 'Basic reports only' : level === 1 ? 'Status reports unlocked' : level === 2 ? 'Analytics unlocked' : level === 3 ? 'Deep insights unlocked' : 'Full intelligence'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AdCardInline variant="wide" />
      </>}
    </div>
  );
}

// ── Board Tab ──
function BoardTab({ store, onNavigate }) {
  const difficultyColors = { easy: '#10b981', normal: '#00e5ff', hard: '#f59e0b', legendary: '#ef4444' };
  const sackThresholds = { easy: 15, normal: 25, hard: 35, legendary: 45 };

  return (
    <div className="space-y-6">
      {/* Board KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Board Satisfaction" value={`${store.boardSatisfaction}%`} color={store.boardSatisfaction > 50 ? '#10b981' : store.boardSatisfaction > 30 ? '#f59e0b' : '#ef4444'} />
        <StatCard label="Next Review" value={`${store.boardPatience} ticks`} color="#00e5ff" />
        <StatCard label="Difficulty" value={store.difficulty.toUpperCase()} color={difficultyColors[store.difficulty]} />
        <StatCard label="Sack Threshold" value={`≤${sackThresholds[store.difficulty]}%`} sub="Board satisfaction" color="#ef4444" />
      </div>

      {/* Sacked warning */}
      {store.sacked && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/40 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💼</div>
          <div className="text-sm font-mono font-bold text-[#ef4444] mb-1">YOU HAVE BEEN SACKED</div>
          <div className="text-[9px] font-mono text-tactical-text/50">The board has terminated your contract. Visit the Career section in Office to find a new position.</div>
        </div>
      )}

      {/* Compliance Status */}
      {(store.complianceFines > 0 || store.assetsFrozen) && (
        <div className="bg-[#ef4444]/5 border border-[#ef4444]/30 rounded-xl p-4">
          <SectionHeader>Compliance Alerts</SectionHeader>
          <div className="space-y-2">
            {store.complianceFines > 0 && (
              <div className="flex justify-between items-center text-[9px] font-mono bg-tactical-bg/40 rounded px-3 py-2">
                <span className="text-[#ef4444]">Unpaid Fines</span>
                <span className="text-[#ef4444] font-bold">{fmt(store.complianceFines)}</span>
              </div>
            )}
            {store.assetsFrozen && (
              <div className="flex items-center gap-2 text-[9px] font-mono bg-[#ef4444]/10 rounded px-3 py-2">
                <span className="text-lg">🧊</span>
                <span className="text-[#ef4444] font-bold">ASSETS FROZEN — Reduce heat below 60 to resume purchases</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Board Members */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Board Members</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {store.boardMembers.map(bm => {
            const focusColors = { growth: '#00e5ff', governance: '#10b981', profit: '#f59e0b', esg: '#7c3aed' };
            const fc = focusColors[bm.focus] || '#9c8e7e';
            return (
              <div key={bm.id} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{bm.portrait}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-bold text-tactical-text/90">{bm.name}</span>
                      <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{ color: fc, backgroundColor: `${fc}15`, border: `1px solid ${fc}30` }}>{bm.role}</span>
                    </div>
                    <div className="text-[9px] font-mono text-tactical-text/55 mb-2">Focus: <span style={{ color: fc }} className="font-bold">{bm.focus.toUpperCase()}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] font-mono text-tactical-text/40">Patience:</span>
                      <div className="flex-1 h-1.5 bg-tactical-border/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${bm.patience}%`, backgroundColor: bm.patience > 60 ? '#10b981' : bm.patience > 30 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color: bm.patience > 60 ? '#10b981' : bm.patience > 30 ? '#f59e0b' : '#ef4444' }}>{Math.round(bm.patience)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Board Goals */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Quarterly Objectives</SectionHeader>
        <div className="space-y-2">
          {store.boardGoals.map(goal => (
            <div key={goal.id} className="bg-[#0d1420] border border-tactical-border/25 rounded-lg p-3">
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-tactical-text/80">{goal.description}</span>
                <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded font-bold ${goal.met ? 'text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/30' : 'text-[#f59e0b] bg-[#f59e0b]/15 border border-[#f59e0b]/30'}`}>
                  {goal.met ? 'MET' : 'PENDING'}
                </span>
              </div>
              <div className="flex gap-4 text-[9px] font-mono text-tactical-text/55">
                <span>Reward: <span className="text-[#10b981]">{goal.reward}</span></span>
                <span>Penalty: <span className="text-[#ef4444]">{goal.penalty}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Difficulty Setting</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {['easy', 'normal', 'hard', 'legendary'].map(d => {
            const isActive = store.difficulty === d;
            const dc = difficultyColors[d];
            const labels = { easy: 'Relaxed board, patient investors', normal: 'Standard expectations', hard: 'Demanding board, tight deadlines', legendary: 'Zero tolerance — prove yourself' };
            return (
              <button
                key={d}
                onClick={() => store.setDifficulty(d)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all ${isActive ? 'font-bold' : 'border-tactical-border/20 bg-tactical-bg/40 hover:border-tactical-border/40'}`}
                style={isActive ? { color: dc, borderColor: `${dc}40`, backgroundColor: `${dc}10` } : {}}
              >
                <div className="text-[9px] font-mono font-bold uppercase">{d}</div>
                <div className="text-[7px] font-mono text-tactical-text/45 mt-0.5">{labels[d]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Satisfaction History Ring */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Board Satisfaction Overview</SectionHeader>
        <div className="flex justify-around py-2">
          <AxisRing label="Overall" value={store.boardSatisfaction} color={store.boardSatisfaction > 50 ? '#10b981' : '#ef4444'} />
          <AxisRing label="CEO Approval" value={store.ceoApproval} color={store.ceoApproval > 60 ? '#10b981' : '#f59e0b'} />
          <AxisRing label="Governance" value={store.governance} color={store.governance > 40 ? '#10b981' : '#ef4444'} />
        </div>
      </div>

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Projects & R&D Tab ──
function ProjectsRDTab({ store }) {
  const [activeSection, setActiveSection] = useState('departments');
  const [rdFilter, setRdFilter] = useState('all');

  const DEPTS = ['HR', 'Trading', 'Marketing', 'R&D', 'Finance', 'Legal'];
  const DEPT_COL = { HR: '#10b981', Trading: '#00e5ff', Marketing: '#f472b6', 'R&D': '#7c3aed', Finance: '#f59e0b', Legal: '#6366f1' };
  const DEPT_ICONS = { HR: '👤', Trading: '📊', Marketing: '📣', 'R&D': '🔬', Finance: '💰', Legal: '⚖️' };

  const CAT_META = {
    production: { icon: '⚙', color: '#f59e0b', label: 'Production' },
    transport:  { icon: '🚀', color: '#a78bfa', label: 'Transport' },
    market:     { icon: '📈', color: '#00e5ff', label: 'Market' },
    security:   { icon: '🛡', color: '#ef4444', label: 'Security' },
    green:      { icon: '🌿', color: '#10b981', label: 'Green Tech' },
  };

  const rdProjects = store.rdProjects || [];
  const activeResearch = rdProjects.filter(p => p.status === 'researching');
  const completedRD = rdProjects.filter(p => p.status === 'completed');
  const availableRD = rdProjects.filter(p => p.status === 'available');

  const totalDeptCompleted = store.projects.filter(p => p.active).length;
  const totalDeptProjects = store.projects.length;

  const filteredRD = rdFilter === 'all' ? rdProjects : rdProjects.filter(p => p.category === rdFilter);

  return (
    <div className="space-y-6">
      {/* Section toggle */}
      <div className="flex gap-2">
        {[{ key: 'departments', label: 'Department Projects' }, { key: 'rnd', label: 'Research & Development' }].map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-4 py-2 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all border ${
              activeSection === s.key
                ? 'bg-[#7c3aed]/15 text-[#7c3aed] border-[#7c3aed]/40'
                : 'border-tactical-border/30 text-tactical-text/45 hover:text-tactical-text/70 hover:border-tactical-border/50'
            }`}
          >{s.label}</button>
        ))}
      </div>

      {/* ─── Department Projects Section ─── */}
      {activeSection === 'departments' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Projects" value={totalDeptProjects} sub={`${totalDeptCompleted} completed`} color="#7c3aed" />
            <StatCard label="Success Rate" value={totalDeptCompleted > 0 ? `${Math.round(totalDeptCompleted / totalDeptProjects * 100)}%` : '0%'} sub="of all projects" color="#10b981" />
            <StatCard label="Departments" value={DEPTS.length} sub="active divisions" color="#00e5ff" />
            <StatCard label="Total Invested" value={fmt(store.projects.filter(p => p.active).reduce((s, p) => s + p.cost, 0))} sub="in completed projects" color="#f59e0b" />
          </div>

          {/* Department cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEPTS.map(dept => {
              const c = DEPT_COL[dept];
              const deptProjects = store.projects.filter(p => p.dept === dept);
              const completed = deptProjects.filter(p => p.active);
              const available = deptProjects.filter(p => !p.active);
              const level = Math.min(completed.length, 4);

              return (
                <div key={dept} className="bg-[#0d1420] border border-tactical-border/30 rounded-lg p-4 hover:border-opacity-60 transition-all" style={{ borderColor: `${c}30` }}>
                  {/* Dept header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{DEPT_ICONS[dept]}</span>
                      <div>
                        <div className="text-[12px] font-bold text-tactical-text font-mono">{dept}</div>
                        <div className="text-[7px] font-mono uppercase tracking-widest" style={{ color: c }}>Level {level} / 4</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="w-3 h-3 rounded-sm border" style={{
                          borderColor: i < level ? c : `${c}30`,
                          backgroundColor: i < level ? `${c}40` : 'transparent',
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Completed projects */}
                  {completed.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {completed.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-[8px] font-mono px-2 py-1 rounded bg-[#10b981]/5 border border-[#10b981]/15">
                          <span className="text-tactical-text/70">{p.name}</span>
                          <span className="text-[#10b981]">{p.effect}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Available projects */}
                  {available.length > 0 && (
                    <div className="space-y-1.5">
                      {available.map(p => {
                        const canAfford = store.companyBalance >= p.cost;
                        return (
                          <div key={p.id} className="border border-tactical-border/20 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-mono font-semibold text-tactical-text">{p.name}</span>
                              <span className="text-[7px] font-mono text-tactical-text/40">{p.successRate}%</span>
                            </div>
                            <div className="text-[7px] font-mono text-tactical-text/45 mb-1.5">{p.effect}</div>
                            <button
                              onClick={() => store.startProject(p.id)}
                              disabled={!canAfford}
                              className={`w-full py-1 rounded font-mono text-[7px] font-bold uppercase tracking-widest transition-all ${canAfford ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                              style={{ background: canAfford ? `${c}12` : '#333', color: c, border: `1px solid ${c}30` }}
                            >
                              {canAfford ? `Start — ${fmt(p.cost)}` : `Need ${fmt(p.cost)}`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {available.length === 0 && (
                    <div className="text-[8px] font-mono text-[#10b981] bg-[#10b981]/10 py-2 rounded text-center font-bold border border-[#10b981]/20">
                      ✓ ALL PROJECTS COMPLETE
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── R&D Section ─── */}
      {activeSection === 'rnd' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Active Research" value={activeResearch.length} sub="in progress" color="#f59e0b" />
            <StatCard label="Completed" value={completedRD.length} sub={`of ${rdProjects.length} total`} color="#10b981" />
            <StatCard label="Available" value={availableRD.length} sub="ready to start" color="#7c3aed" />
            <StatCard label="R&D Investment" value={fmt(completedRD.reduce((s, p) => s + p.cost, 0) + activeResearch.reduce((s, p) => s + p.cost, 0))} sub="total spent" color="#00e5ff" />
          </div>

          {/* Active research progress */}
          {activeResearch.length > 0 && (
            <div>
              <h3 className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#f59e0b] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full animate-pulse" /> In Progress
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeResearch.map(p => {
                  const cm = CAT_META[p.category];
                  return (
                    <div key={p.id} className="bg-[#f59e0b]/[0.04] border border-[#f59e0b]/20 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span>{cm.icon}</span>
                          <span className="text-[10px] font-mono font-bold text-white">{p.name}</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#f59e0b] font-bold">{p.progress}%</span>
                      </div>
                      <div className="h-2 bg-tactical-border/30 rounded-full overflow-hidden mb-1.5">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${cm.color}88, ${cm.color})`, boxShadow: `0 0 8px ${cm.color}40` }} />
                      </div>
                      <div className="text-[8px] font-mono text-tactical-text/50">{p.effect}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'production', 'transport', 'market', 'security', 'green'].map(cat => {
              const cm = CAT_META[cat];
              return (
                <button key={cat} onClick={() => setRdFilter(cat)}
                  className={`px-3 py-1 rounded text-[8px] font-mono uppercase tracking-wider transition-all border ${
                    rdFilter === cat
                      ? cat === 'all' ? 'bg-[#7c3aed]/15 text-[#7c3aed] border-[#7c3aed]/40' : 'border'
                      : 'border-tactical-border/20 text-tactical-text/45 hover:text-tactical-text/60'
                  }`}
                  style={rdFilter === cat && cm ? { color: cm.color, backgroundColor: `${cm.color}15`, borderColor: `${cm.color}50` } : {}}
                >{cm ? `${cm.icon} ${cm.label}` : 'All'}</button>
              );
            })}
          </div>

          {/* R&D project grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRD.map(p => {
              const cm = CAT_META[p.category] || CAT_META.production;
              const isCompleted = p.status === 'completed';
              const isResearching = p.status === 'researching';
              const canAfford = store.companyBalance >= p.cost;

              return (
                <div key={p.id} className={`bg-[#0d1420] border rounded-lg p-3.5 transition-all ${isCompleted ? 'border-[#10b981]/30 bg-[#10b981]/[0.03]' : 'border-tactical-border/30'}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{cm.icon}</span>
                      <span className="text-[10px] font-mono font-bold text-tactical-text">{p.name}</span>
                    </div>
                    <span className="text-[7px] font-mono px-1.5 py-0.5 rounded border" style={{ color: cm.color, borderColor: `${cm.color}30`, backgroundColor: `${cm.color}10` }}>{cm.label}</span>
                  </div>
                  <div className="text-[8px] text-tactical-text/55 font-mono mb-2 leading-relaxed">{p.description}</div>
                  <div className="flex items-center gap-3 text-[7px] font-mono text-tactical-text/50 mb-2">
                    <span>⏱ {fmtGameTime(p.duration)}</span>
                    <span className="text-tactical-text/20">|</span>
                    <span style={{ color: cm.color }}>{p.effect}</span>
                  </div>
                  {isCompleted ? (
                    <div className="text-[8px] font-mono text-[#10b981] bg-[#10b981]/10 py-1.5 rounded text-center font-bold border border-[#10b981]/20">✓ RESEARCH COMPLETE</div>
                  ) : isResearching ? (
                    <>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-2 bg-tactical-border/30 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: `linear-gradient(90deg, ${cm.color}88, ${cm.color})` }} />
                        </div>
                        <span className="text-[7px] font-mono text-tactical-text/40">{Math.round(p.progress)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-mono text-tactical-text/30 flex-1">
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
                              className={`px-2 py-1 rounded font-mono text-[7px] font-bold uppercase tracking-widest transition-all ${canRush ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                              style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}
                              title={canRush ? `Pay ${fmt(rushCost)} to complete instantly` : `Need ${fmt(rushCost)}`}
                            >
                              ⚡ Rush · {fmt(rushCost)}
                            </button>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <button onClick={() => store.startResearch(p.id)}
                      disabled={!canAfford}
                      className={`w-full py-1.5 rounded font-mono text-[8px] font-bold uppercase tracking-widest transition-all ${canAfford ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                      style={{ background: canAfford ? `${cm.color}15` : '#333', color: cm.color, border: `1px solid ${cm.color}30` }}
                    >
                      {canAfford ? `Start Research — ${fmt(p.cost)}` : `Need ${fmt(p.cost)}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {filteredRD.length === 0 && <div className="text-center py-8 text-tactical-text/20 font-mono text-[10px]">No projects in this category</div>}
        </>
      )}

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Capital Sourcing Tab ──
function CapitalTab({ store }) {
  const esgScore = Math.round(((store.impact * 0.6 + (100 - store.heat) * 0.4) + (store.governance * 0.5 + store.impact * 0.3 + store.ceoApproval * 0.2) + (store.governance * 0.7 + (100 - store.heat) * 0.3)) / 3);

  const meetsRequirements = (inv) => {
    if (inv.id === 'seed1' || inv.id === 'gov1') {
      if (inv.id === 'gov1') return store.impact > 30 && esgScore > 40;
      return true;
    }
    if (store.netWorth < inv.minValuation) return false;
    if (inv.id === 'angel1') return store.growth > 30;
    if (inv.id === 'angel2') return store.impact > 25;
    if (inv.id === 'vc1') return store.netWorth > 500_000 && store.growth > 40;
    if (inv.id === 'vc2') return esgScore > 50 && store.governance > 40;
    if (inv.id === 'vc3') return store.netWorth > 2_000_000 && store.monthlyIncome > 100_000;
    if (inv.id === 'pe1') return store.netWorth > 5_000_000 && store.governance > 60;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Capital KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Company Valuation" value={fmt(store.netWorth)} color="#10b981" />
        <StatCard label="Weekly Revenue" value={fmt(store.monthlyIncome)} color="#00e5ff" />
        <StatCard label="ESG Score" value={esgScore} color={esgScore > 50 ? '#10b981' : '#f59e0b'} />
        <StatCard label="Governance" value={store.governance} color={store.governance > 40 ? '#10b981' : '#ef4444'} />
      </div>

      {/* Pitch Readiness */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Pitch Readiness</SectionHeader>
        <div className="space-y-2">
          <MiniBar label="Financial Track Record" value={Math.min(store.monthlyIncome / 5000, 100)} color="#10b981" />
          <MiniBar label="Governance & Compliance" value={store.governance} color="#00e5ff" />
          <MiniBar label="Growth Trajectory" value={store.growth} color="#7c3aed" />
          <MiniBar label="ESG & Impact" value={Math.min(esgScore, 100)} color="#10b981" />
        </div>
      </div>

      {/* Investor List */}
      <div className="bg-[#0b1018] border border-tactical-border/30 rounded-xl p-4">
        <SectionHeader>Available Investors</SectionHeader>
        <div className="space-y-3">
          {INVESTOR_TYPES.map(inv => {
            const eligible = meetsRequirements(inv);
            return (
              <div key={inv.id} className={`bg-tactical-bg/50 border rounded-lg p-4 transition-all ${eligible ? 'border-tactical-border/20 hover:border-tactical-border/40' : 'border-tactical-border/10 opacity-50'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{inv.portrait}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-tactical-text/90">{inv.name}</span>
                        <span className="text-[7px] font-mono ml-2 px-1.5 py-0.5 rounded" style={{ color: inv.color, backgroundColor: `${inv.color}15`, border: `1px solid ${inv.color}30` }}>{inv.type}</span>
                      </div>
                      {!eligible && <span className="text-[7px] font-mono text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded border border-[#ef4444]/30">LOCKED</span>}
                    </div>
                    <div className="text-[9px] font-mono text-tactical-text/55 mb-2">{inv.focus}</div>
                    <div className="grid grid-cols-3 gap-2 text-[8px] font-mono">
                      <div><span className="text-tactical-text/45">Max Investment:</span> <span className="text-[#10b981] font-bold">{fmt(inv.maxInvestment)}</span></div>
                      <div><span className="text-tactical-text/45">Equity Ask:</span> <span className="text-[#f59e0b] font-bold">{inv.equityAsk}%</span></div>
                      <div><span className="text-tactical-text/45">Patience:</span> <span className="text-tactical-text/60">{inv.patience}</span></div>
                    </div>
                    <div className="text-[7px] font-mono text-tactical-text/25 mt-1.5">Requirements: {inv.requirements}</div>
                    {eligible && (
                      <button className="mt-2 text-[7px] font-mono uppercase tracking-widest px-3 py-1.5 rounded border transition-all hover:brightness-125" style={{ color: inv.color, borderColor: `${inv.color}40`, backgroundColor: `${inv.color}10` }}>
                        Pitch to {inv.name.split(' ')[0]} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Politics Overview Tab (inline, no fixed sidebar) ──

const GOV_TYPES = [
  { value: 'democracy', label: 'Democracy', desc: 'Elections every 50 ticks. Stable but slow.' },
  { value: 'autocracy', label: 'Autocracy', desc: 'Fast policy changes. Coups more likely.' },
  { value: 'council', label: 'Council', desc: 'Coalition votes on policies. Resilient.' },
  { value: 'corporation', label: 'Corporate State', desc: 'Max tax efficiency. You ARE the state.' },
];

const STATUS_COLORS = {
  sovereign: '#10b981', puppet: '#f59e0b', contested: '#ef4444', failed_state: '#6b7280',
};

const GOV_ICONS = {
  democracy: '⚖️', autocracy: '👑', council: '🤝', corporation: '🏢',
  monarchy: '👑', federation: '🌍', theocracy: '⛪', communist: '⭐', military_junta: '🎖️',
};

function PoliticsOverviewTab() {
  const countries = useWorldPoliticsStore(s => s.countries);
  const governments = useWorldPoliticsStore(s => s.governments);
  const lobbyCampaigns = useWorldPoliticsStore(s => s.lobbyCampaigns);
  const selectCountry = useWorldPoliticsStore(s => s.selectCountry);
  const selectedCountryId = useWorldPoliticsStore(s => s.selectedCountryId);
  const formGovernment = useWorldPoliticsStore(s => s.formGovernment);
  const loadActiveCampaigns = useWorldPoliticsStore(s => s.loadActiveCampaigns);
  const lobbyFor = useWorldPoliticsStore(s => s.lobbyFor);
  const loadCountries = useWorldPoliticsStore(s => s.loadCountries);
  const loadGovernments = useWorldPoliticsStore(s => s.loadGovernments);

  const [govType, setGovType] = React.useState('democracy');
  const [lobbyAmount] = React.useState(10000);

  React.useEffect(() => {
    loadCountries();
    loadGovernments();
  }, []);

  React.useEffect(() => {
    if (selectedCountryId) loadActiveCampaigns(selectedCountryId);
  }, [selectedCountryId]);

  const countryList = React.useMemo(
    () => Object.values(countries).sort((a, b) => b.gdp - a.gdp),
    [countries],
  );

  const playerGovs = React.useMemo(
    () => Object.values(governments).filter(g => g.status === 'active'),
    [governments],
  );

  const selectedCountry = selectedCountryId ? countries[selectedCountryId] : null;
  const activeGov = selectedCountryId
    ? Object.values(governments).find(g => g.country_id === selectedCountryId && g.status === 'active')
    : null;

  return (
    <div className="space-y-4">
      {/* Selected Country Detail */}
      {selectedCountry ? (
        <div className="bg-[#0d1420] border border-tactical-accent/30 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-tactical-text font-mono text-sm font-semibold">
                {GOV_ICONS[selectedCountry.government_type] || '🏛'} {selectedCountry.name}
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-tactical-muted font-mono">
                {selectedCountry.government_type} | {selectedCountry.status?.replace('_', ' ')}
              </span>
            </div>
            <button onClick={() => selectCountry(null)}
              className="text-tactical-muted hover:text-tactical-text text-xs font-mono px-2 py-1 border border-tactical-border rounded">
              Back to List
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-black/30 rounded p-2">
              <p className="text-[9px] uppercase tracking-wider text-tactical-muted font-mono">Approval</p>
              <p className="font-mono text-sm font-semibold" style={{ color: selectedCountry.approval_rating > 50 ? '#10b981' : '#ef4444' }}>
                {selectedCountry.approval_rating?.toFixed(0) || 0}%
              </p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[9px] uppercase tracking-wider text-tactical-muted font-mono">Stability</p>
              <p className="font-mono text-sm font-semibold" style={{ color: (selectedCountry.stability || 0) > 0.5 ? '#10b981' : '#f59e0b' }}>
                {((selectedCountry.stability || 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[9px] uppercase tracking-wider text-tactical-muted font-mono">Military</p>
              <p className="font-mono text-sm font-semibold text-[#94a3b8]">{selectedCountry.military_strength || 0}</p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[9px] uppercase tracking-wider text-tactical-muted font-mono">Treasury</p>
              <p className="font-mono text-sm font-semibold text-[#00e5ff]">
                {((selectedCountry.treasury || 0) / 1e6).toFixed(1)}M
              </p>
            </div>
          </div>

          {/* Regulations */}
          {(() => { const regs = selectedCountry.regulations || {}; return (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">Regulations</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                {[
                  ['Corporate Tax', `${((regs.corporate_tax_rate || 0.25) * 100).toFixed(0)}%`],
                  ['Income Tax', `${((regs.income_tax_rate || 0.30) * 100).toFixed(0)}%`],
                  ['Labor Laws', regs.labor_laws || 'moderate'],
                  ['Environment', regs.environmental_rules || 'moderate'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-tactical-text/70">
                    <span className="text-tactical-muted">{label}</span>
                    <span className="font-mono capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ); })()}

          {/* Government Actions */}
          {activeGov ? (
            <div className="bg-tactical-success/10 border border-tactical-success/30 rounded p-3">
              <h4 className="text-[10px] uppercase tracking-widest text-tactical-success mb-1 font-mono">Player Government</h4>
              <p className="text-tactical-text text-xs font-mono">Type: {activeGov.type}</p>
              <p className="text-tactical-text text-xs font-mono">Cabinet: {Array.isArray(activeGov.cabinet) ? activeGov.cabinet.length : 0}</p>
              <p className="text-tactical-text text-xs font-mono">Treasury: {(activeGov.treasury || 0).toLocaleString()}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-widest text-tactical-warning mb-1 font-mono">Form Government</h4>
              <select value={govType} onChange={e => setGovType(e.target.value)}
                className="w-full bg-black/40 border border-tactical-border rounded px-3 py-1.5 text-tactical-text text-xs font-mono">
                {GOV_TYPES.map(g => (
                  <option key={g.value} value={g.value}>{g.label} — {g.desc}</option>
                ))}
              </select>
              <button onClick={() => formGovernment(selectedCountry.id, govType)}
                className="w-full py-2 rounded font-mono text-xs uppercase tracking-wider
                  bg-tactical-success/20 text-tactical-success border border-tactical-success/40
                  hover:bg-tactical-success/30 transition">
                Form Government
              </button>
            </div>
          )}

          {/* Lobbying */}
          {lobbyCampaigns.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">Active Lobbying</h4>
              {lobbyCampaigns.map(camp => (
                <div key={camp.id} className="bg-black/30 rounded p-2.5 mb-2">
                  <p className="text-tactical-text text-[11px] font-mono mb-1">{camp.regulation_key}</p>
                  <div className="flex gap-2">
                    <button onClick={() => lobbyFor(camp.id, lobbyAmount, 'for')}
                      className="flex-1 py-1 text-[10px] font-mono rounded bg-tactical-success/20 text-tactical-success hover:bg-tactical-success/30 transition">
                      Support
                    </button>
                    <button onClick={() => lobbyFor(camp.id, lobbyAmount, 'against')}
                      className="flex-1 py-1 text-[10px] font-mono rounded bg-tactical-alert/20 text-tactical-alert hover:bg-tactical-alert/30 transition">
                      Oppose
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Country List View */
        <div className="space-y-4">
          {/* Player Governments */}
          {playerGovs.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-tactical-accent mb-2 font-mono">
                Your Governments
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {playerGovs.map(gov => {
                  const c = countries[gov.country_id];
                  if (!c) return null;
                  return (
                    <button key={gov.id} onClick={() => selectCountry(gov.country_id)}
                      className="text-left p-3 rounded-lg border border-tactical-success/30 bg-tactical-success/5 hover:bg-tactical-success/10 transition">
                      <div className="text-tactical-text text-xs font-mono font-semibold">
                        {GOV_ICONS[gov.type] || ''} {c.name}
                      </div>
                      <div className="text-[9px] text-tactical-success font-mono uppercase mt-1">{gov.type}</div>
                      <div className="text-[9px] text-tactical-muted font-mono mt-1">
                        Cabinet: {Array.isArray(gov.cabinet) ? gov.cabinet.length : 0} · Treasury: {(gov.treasury || 0).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Countries */}
          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-tactical-muted mb-2 font-mono">
              Countries {countryList.length > 0 ? `(${countryList.length})` : ''}
            </h4>
            {countryList.length === 0 ? (
              <div className="text-center py-8 text-tactical-muted text-xs font-mono">
                <p className="text-lg mb-2">🏛</p>
                <p>No countries loaded</p>
                <p className="text-[10px] mt-1">Countries appear when connected to a server</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1 max-h-[500px] overflow-y-auto">
                {countryList.map(c => (
                  <button key={c.id} onClick={() => selectCountry(c.id)}
                    className="w-full text-left p-3 rounded border border-tactical-border hover:border-tactical-accent/40 hover:bg-tactical-accent/5 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-tactical-text text-xs font-mono">{c.name}</span>
                      <span className="text-[9px] font-mono uppercase"
                        style={{ color: STATUS_COLORS[c.status] || '#9CA3AF' }}>
                        {c.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-[9px] text-tactical-muted font-mono">
                      <span>{c.government_type}</span>
                      <span>Approval: {(c.approval_rating || 0).toFixed(0)}%</span>
                      <span>GDP: {((c.gdp || 0) / 1e9).toFixed(0)}B</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AdCardInline variant="wide" />
    </div>
  );
}

// ── Main Component ──
export default function EmpireOverview({ onClose }) {
  const store = useEmpireStore();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="fixed inset-0 z-[100] bg-[#060a12]/95 backdrop-blur-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-tactical-border/30">
        <div className="flex items-center gap-3">
          <span className="text-[#00e5ff] text-lg">◉</span>
          <span className="text-tactical-text font-mono text-sm font-bold uppercase tracking-[0.15em]">Empire Overview</span>
          <span className="text-[8px] text-tactical-text/45 font-mono ml-2">{store.structure}</span>
        </div>
        <button onClick={onClose} aria-label="Close empire overview" className="text-tactical-text/40 hover:text-tactical-text text-lg font-mono transition-colors">✕</button>
      </div>

      {/* Tab Bar — Grouped */}
      <div className="flex items-center gap-0 px-4 py-1.5 border-b border-tactical-border/20 bg-[#060a12]/80 overflow-x-auto no-scrollbar">
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.group} className="flex items-center">
            {gi > 0 && <div className="w-px h-6 bg-tactical-border/15 mx-1" />}
            <div className="flex items-center gap-0.5">
              <span className="text-[6px] font-mono text-tactical-text/20 uppercase tracking-widest mr-1 hidden lg:inline">{group.group}</span>
              {group.tabs.map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-[0.08em] rounded-md transition-all flex items-center gap-1 whitespace-nowrap ${
                      isActive
                        ? 'font-bold'
                        : 'text-tactical-text/40 hover:text-tactical-text/70 hover:bg-white/[0.03]'
                    }`}
                    style={isActive ? {
                      color: tab.color,
                      backgroundColor: `${tab.color}10`,
                      border: `1px solid ${tab.color}30`,
                      boxShadow: `0 0 6px ${tab.color}15`,
                    } : { border: '1px solid transparent' }}
                    title={tab.label}
                  >
                    <span className="text-[10px]">{tab.icon}</span>
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && <OverviewTab store={store} onNavigate={(tab) => { onClose(); store.setActiveTab(tab); }} />}
          {activeTab === 'office' && <OfficeTab store={store} onNavigate={(tab) => { onClose(); store.setActiveTab(tab); }} />}
          {activeTab === 'marketing' && <MarketingTab store={store} onNavigate={(tab) => { onClose(); store.setActiveTab(tab); }} />}
          {activeTab === 'operations' && <OperationsTab store={store} onNavigate={(tab) => { onClose(); store.setActiveTab(tab); }} />}
          {activeTab === 'accounting' && <AccountingTab store={store} onNavigate={(tab) => { onClose(); store.setActiveTab(tab); }} />}
          {activeTab === 'financial' && <FinancialTab store={store} onNavigate={(tab) => { onClose(); store.setActiveTab(tab); }} />}
          {activeTab === 'board' && <BoardTab store={store} onNavigate={(tab) => { onClose(); store.setActiveTab(tab); }} />}
          {activeTab === 'capital' && <CapitalTab store={store} />}
          {activeTab === 'projects' && <ProjectsRDTab store={store} />}
          {activeTab === 'politics' && <PoliticsOverviewTab />}
          {activeTab === 'career' && (
            <div className="space-y-4">
              <PersonalPoliticsPanel />
              <AdCardInline variant="wide" />
            </div>
          )}
          {activeTab === 'legal' && (
            <div className="space-y-4">
              <BureaucracyPanel />
              <AdCardInline variant="wide" />
            </div>
          )}

          {/* ── New tabs from Left Rail ── */}
          {activeTab === 'funds' && <FundsModule />}
          {activeTab === 'defcon' && (
            <div className="space-y-3">
              <SectionHeader>Banking & Financial Defense (DEFCON)</SectionHeader>
              <p className="text-[9px] font-mono text-tactical-text/50">Access banking operations from the left rail's DEFCON panel for full deposit, withdraw, and loan management.</p>
              <AdCardInline variant="compact" />
            </div>
          )}
          {activeTab === 'departments' && <DivisionsModule />}
          {activeTab === 'routes' && (
            <div className="space-y-3">
              <SectionHeader>Trade Routes & Logistics</SectionHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(store.routes || []).map((r, i) => (
                  <div key={i} className="bg-tactical-bg/40 border border-tactical-border/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-tactical-text/70 font-bold">{r.name || `Route ${i + 1}`}</span>
                      <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded ${r.active ? 'text-emerald-400 bg-emerald-400/10' : 'text-tactical-text/30 bg-tactical-bg/60'}`}>
                        {r.active ? 'ACTIVE' : 'IDLE'}
                      </span>
                    </div>
                    <div className="text-[8px] font-mono text-tactical-text/40">{r.type || 'sea'} · Revenue: €{(r.monthlyRevenue || 0).toLocaleString()}/mo</div>
                  </div>
                ))}
                {(!store.routes || store.routes.length === 0) && (
                  <div className="text-[9px] font-mono text-tactical-text/30 text-center py-8 col-span-2">No routes established. Build routes from the map view.</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'transport' && <TransportEmpire />}
          {activeTab === 'assets' && (
            <div className="space-y-3">
              <SectionHeader>Infrastructure Assets</SectionHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.values(store.nodes).filter(n => n.owner === 'player').slice(0, 18).map(n => (
                  <div key={n.id} className="bg-tactical-bg/40 border border-tactical-border/20 rounded-lg p-2">
                    <div className="text-[8px] font-mono text-tactical-text/70 font-bold truncate">{n.name}</div>
                    <div className="text-[7px] font-mono text-tactical-text/30">{n.type} · Lv{n.level}</div>
                    <div className="text-[8px] font-mono text-emerald-400 mt-0.5">+€{n.income.toLocaleString()}/day</div>
                  </div>
                ))}
              </div>
              <div className="text-[8px] font-mono text-tactical-text/30 text-center">
                {Object.values(store.nodes).filter(n => n.owner === 'player').length} total assets · €{Object.values(store.nodes).filter(n => n.owner === 'player').reduce((s, n) => s + n.income, 0).toLocaleString()}/day income
              </div>
            </div>
          )}
          {activeTab === 'market' && <IntelHubPanel />}
          {activeTab === 'divisions' && <DivisionsModule />}
          {activeTab === 'esg' && (
            <div className="space-y-3">
              <SectionHeader>ESG & Environmental Impact</SectionHeader>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="ESG Score" value={store.esgScore || 0} color="#10b981" sub="Environmental, Social, Governance" />
                <StatCard label="Carbon Offset" value={`${store.carbonOffset || 0}t`} color="#10b981" sub="Tonnes CO₂ offset" />
                <StatCard label="Ethics Rating" value={store.ethicsRating || 'B'} color="#f59e0b" sub="Independent audit" />
              </div>
              <div className="text-[8px] font-mono text-tactical-text/40 mt-2">
                Improve ESG by investing in green infrastructure, renewable energy nodes, and ethical business practices.
                High ESG scores unlock government grants, ESG-focused investors, and reduce regulatory heat.
              </div>
            </div>
          )}
          {activeTab === 'shadow' && <ShadowOpsModule />}
          {activeTab === 'perks' && <PerksModule onClose={() => setActiveTab('overview')} />}
          {activeTab === 'shopping' && <ShoppingHub />}
          {activeTab === 'sports' && (
            <div className="space-y-3">
              <SectionHeader>Sports Franchise Empire</SectionHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(store.sportsTeams || []).map((team, i) => (
                  <div key={i} className="bg-tactical-bg/40 border border-tactical-border/20 rounded-lg p-3">
                    <div className="text-[9px] font-mono font-bold text-tactical-text/70">{team.name}</div>
                    <div className="text-[7px] font-mono text-tactical-text/30">{team.league} · {team.sport}</div>
                    <div className="text-[8px] font-mono text-emerald-400 mt-1">Value: €{(team.value || 0).toLocaleString()}</div>
                  </div>
                ))}
                {(!store.sportsTeams || store.sportsTeams.length === 0) && (
                  <div className="text-[9px] font-mono text-tactical-text/30 text-center py-8 col-span-3">No sports teams owned. Acquire teams from the Sports tab in the left rail.</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'luxury' && (
            <div className="space-y-3">
              <SectionHeader>Luxury Assets & Collectibles</SectionHeader>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(store.luxuryItems || []).map((item, i) => (
                  <div key={i} className="bg-tactical-bg/40 border border-[#ec4899]/15 rounded-lg p-3 text-center">
                    <div className="text-xl mb-1">{item.icon || '💎'}</div>
                    <div className="text-[8px] font-mono text-tactical-text/70 font-bold">{item.name}</div>
                    <div className="text-[7px] font-mono text-[#ec4899]">€{(item.value || 0).toLocaleString()}</div>
                  </div>
                ))}
                {(!store.luxuryItems || store.luxuryItems.length === 0) && (
                  <div className="text-[9px] font-mono text-tactical-text/30 text-center py-8 col-span-4">No luxury items acquired yet. Visit the Shopping Hub.</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'news' && (
            <div className="space-y-3">
              <SectionHeader>News Wire & Market Intelligence</SectionHeader>
              <div className="space-y-2">
                {(store.ticker || []).slice(0, 20).map((t, i) => (
                  <div key={t.id || i} className="flex items-start gap-2 py-1.5 border-b border-tactical-border/10 last:border-0">
                    <span className="text-[8px] font-mono text-tactical-text/20 shrink-0">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-[8px] font-mono text-tactical-text/50">{t.text}</span>
                  </div>
                ))}
                {(!store.ticker || store.ticker.length === 0) && (
                  <div className="text-[9px] font-mono text-tactical-text/30 text-center py-8">No news wire activity yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-tactical-border/20 flex justify-between items-center">
        <span className="text-[7px] text-tactical-text/20 font-mono uppercase tracking-[0.2em]">Quadratic Empire Dashboard</span>
        <button onClick={onClose} className="text-[9px] text-tactical-text/40 hover:text-tactical-text font-mono uppercase tracking-[0.1em] transition-colors">
          Press ESC or click to close
        </button>
      </div>
    </div>
  );
}
