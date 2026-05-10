import React, { useState, useMemo, useEffect } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { PriceFilter, applyPriceFilter } from './PriceFilter';
import TeamBadge from './TeamBadge';
import OverviewTab from './sports/OverviewTab';
import PerformanceTab from './sports/PerformanceTab';
import CalendarTab from './sports/CalendarTab';
import DevelopmentTab from './sports/DevelopmentTab';

const fmt = (n) => n >= 1e9 ? `€${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${Math.round(n)}`;

// ── Generated player/driver roster for owned teams ──
const POSITIONS_FOOTBALL = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'RW', 'ST'];
const POSITIONS_NBA = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'SG', 'PF'];
const POSITIONS_F1 = ['1st Driver', '2nd Driver', 'Team Principal', 'Chief Engineer', 'Race Strategist', 'Aerodynamicist', 'Chief Mechanic', 'Performance Analyst', 'Reserve Driver', 'Pit Crew Lead'];
const FIRST_NAMES = ['Marcus', 'Kai', 'Lucas', 'Ahmed', 'Leo', 'Javier', 'Yuki', 'Andre', 'Stefan', 'Daniel', 'Omar', 'Tomas', 'Victor', 'Noah', 'Ethan', 'Rafael', 'Bruno', 'Carlos', 'Max', 'Alex'];
const LAST_NAMES = ['Silva', 'Mueller', 'Tanaka', 'Rossi', 'Santos', 'Park', 'Williams', 'Fernandez', 'Bakayoko', 'Andersen', 'Johansson', 'Petrov', 'Chen', 'Dubois', 'Gomez', 'Okafor', 'Eriksen', 'Torres', 'Nakamura', 'Volkov'];

function generateRoster(teamId, league) {
  const seed = teamId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i) => ((seed * 31 + i * 17) % 1000) / 1000;
  const isNBA = league === 'NBA';
  const isF1 = league === 'F1';
  const positions = isNBA ? POSITIONS_NBA : isF1 ? POSITIONS_F1 : POSITIONS_FOOTBALL;

  return positions.map((pos, i) => {
    const r = rng(i);
    const overall = Math.round(55 + r * 40);
    const age = isF1 ? Math.round(19 + rng(i + 100) * 18) : Math.round(17 + rng(i + 50) * 18);
    const salary = Math.round((overall / 100) * (isF1 ? 15_000_000 : isNBA ? 8_000_000 : 3_000_000) * (0.5 + r));
    const marketValue = Math.round(salary * (1.5 + (95 - age) * 0.05));
    return {
      id: `${teamId}-p${i}`,
      name: `${FIRST_NAMES[(seed + i * 3) % FIRST_NAMES.length]} ${LAST_NAMES[(seed + i * 7) % LAST_NAMES.length]}`,
      position: pos,
      overall,
      age,
      salary,
      marketValue,
      morale: Math.round(50 + rng(i + 200) * 50),
      form: ['Poor', 'Average', 'Good', 'Excellent'][Math.floor(rng(i + 300) * 4)],
    };
  });
}

// ── Facility upgrades ──
const FACILITY_UPGRADES = [
  { key: 'stadium', label: 'Stadium Expansion', icon: '🏟️', levels: ['Basic (10K)', 'Medium (25K)', 'Large (50K)', 'World-Class (80K)'], costs: [0, 5_000_000, 20_000_000, 80_000_000], effect: '+Ticket Revenue per level' },
  { key: 'training', label: 'Training Facilities', icon: '🏋️', levels: ['Basic', 'Professional', 'Elite', 'State-of-the-Art'], costs: [0, 2_000_000, 8_000_000, 25_000_000], effect: '+Player Development' },
  { key: 'youth', label: 'Youth Academy', icon: '🎓', levels: ['None', 'Basic', 'Advanced', 'World-Renowned'], costs: [0, 1_000_000, 5_000_000, 15_000_000], effect: '+Youth Talent Pipeline' },
  { key: 'medical', label: 'Medical Center', icon: '🏥', levels: ['Basic', 'Modern', 'Cutting-Edge', 'Elite'], costs: [0, 1_500_000, 6_000_000, 20_000_000], effect: '-Injury Duration' },
];

const FACILITY_UPGRADES_F1 = [
  { key: 'windtunnel', label: 'Wind Tunnel', icon: '🌪️', levels: ['Basic', 'Advanced', 'CFD-Hybrid', 'World-Class'], costs: [0, 10_000_000, 40_000_000, 120_000_000], effect: '+Aerodynamic Development' },
  { key: 'factory', label: 'Factory & HQ', icon: '🏭', levels: ['Standard', 'Modern', 'High-Tech', 'State-of-the-Art'], costs: [0, 15_000_000, 50_000_000, 150_000_000], effect: '+Car Development Speed' },
  { key: 'simulator', label: 'Race Simulator', icon: '🎮', levels: ['Basic', 'Professional', 'Full-Motion', 'Driver-in-Loop'], costs: [0, 5_000_000, 20_000_000, 60_000_000], effect: '+Driver Preparation' },
  { key: 'engine', label: 'Power Unit R&D', icon: '⚡', levels: ['Customer', 'Partner', 'Works', 'Manufacturer'], costs: [0, 20_000_000, 80_000_000, 200_000_000], effect: '+Engine Performance' },
];

const TICKET_PRESETS = [
  { key: 'budget', label: 'Budget', price: 25, fill: 95, color: '#10b981' },
  { key: 'standard', label: 'Standard', price: 50, fill: 80, color: '#00e5ff' },
  { key: 'premium', label: 'Premium', price: 85, fill: 60, color: '#f59e0b' },
  { key: 'luxury', label: 'Luxury', price: 150, fill: 35, color: '#7c3aed' },
];

const TICKET_PRESETS_F1 = [
  { key: 'general', label: 'General Admission', price: 150, fill: 95, color: '#10b981' },
  { key: 'grandstand', label: 'Grandstand', price: 350, fill: 80, color: '#00e5ff' },
  { key: 'hospitality', label: 'Hospitality Suite', price: 1500, fill: 50, color: '#f59e0b' },
  { key: 'paddock', label: 'Paddock Club', price: 5000, fill: 25, color: '#7c3aed' },
];

export default function SportsAcquisitionModal({ onClose }) {
  const sportsFranchises = useEmpireStore(state => state.sportsFranchises);
  const buyAsset = useEmpireStore(state => state.buyAsset);
  const companyBalance = useEmpireStore(state => state.companyBalance);
  const upgradeFranchiseFacility = useEmpireStore(state => state.upgradeFranchiseFacility);
  const setFranchiseStaff = useEmpireStore(state => state.setFranchiseStaff);
  const setFranchiseTicketPreset = useEmpireStore(state => state.setFranchiseTicketPreset);
  const hireStaff = useEmpireStore(state => state.hireStaff);
  const fireStaff = useEmpireStore(state => state.fireStaff);

  const [view, setView] = useState('browse'); // 'browse' | 'manage'
  const [activeLeague, setActiveLeague] = useState('Premier League');
  const [managingTeam, setManagingTeam] = useState(null);
  const [manageTab, setManageTab] = useState('overview');
  const [transferSearch, setTransferSearch] = useState('');
  const [sportsSort, setSportsSort] = useState('default');
  const [sportsPriceMin, setSportsPriceMin] = useState('');
  const [sportsPriceMax, setSportsPriceMax] = useState('');

  const ownedTeams = useMemo(() => sportsFranchises.filter(t => t.owned), [sportsFranchises]);
  const leagues = useMemo(() => [...new Set(sportsFranchises.map(team => team.league))], [sportsFranchises]);
  const filteredTeams = applyPriceFilter(sportsFranchises.filter(team => team.league === activeLeague), 'value', sportsSort, sportsPriceMin, sportsPriceMax);

  // Keep managingTeam in sync with store (after upgrades, staff changes)
  const liveTeam = useMemo(() => {
    if (!managingTeam) return null;
    return sportsFranchises.find(t => t.id === managingTeam.id) || managingTeam;
  }, [managingTeam?.id, sportsFranchises]);

  // Generate initial roster on first manage, then persist to store
  const roster = useMemo(() => {
    if (!liveTeam) return [];
    // If staff already persisted in store, use that
    if (liveTeam.staff && liveTeam.staff.length > 0) return liveTeam.staff;
    // Otherwise generate and persist
    const generated = generateRoster(liveTeam.id, liveTeam.league);
    return generated;
  }, [liveTeam]);

  // Persist generated roster to store on first access
  useEffect(() => {
    if (liveTeam && liveTeam.owned && (!liveTeam.staff || liveTeam.staff.length === 0)) {
      const generated = generateRoster(liveTeam.id, liveTeam.league);
      setFranchiseStaff(liveTeam.id, generated);
    }
  }, [liveTeam?.id, liveTeam?.owned]);

  // Transfer market: players from other teams in same league
  const transferMarket = useMemo(() => {
    if (!liveTeam) return [];
    const otherTeams = sportsFranchises.filter(t => t.league === liveTeam.league && t.id !== liveTeam.id);
    return otherTeams.flatMap(t => {
      const players = generateRoster(t.id, t.league);
      return players.slice(0, 3).map(p => ({ ...p, fromTeam: t.name, fromTeamId: t.id }));
    }).filter(p => !transferSearch || p.name.toLowerCase().includes(transferSearch.toLowerCase()) || p.position.toLowerCase().includes(transferSearch.toLowerCase()));
  }, [liveTeam, sportsFranchises, transferSearch]);

  const isF1 = liveTeam?.league === 'F1';
  const activeFacilities = isF1 ? FACILITY_UPGRADES_F1 : FACILITY_UPGRADES;
  const activeTickets = isF1 ? TICKET_PRESETS_F1 : TICKET_PRESETS;

  // Facility levels from store (persisted)
  const facilities = liveTeam?.facilities ?? (isF1
    ? { windtunnel: 0, factory: 0, simulator: 0, engine: 0 }
    : { stadium: 0, training: 0, youth: 0, medical: 0 });

  // Ticket preset from store (persisted)
  const ticketPreset = liveTeam?.ticketPreset ?? (isF1 ? 'general' : 'standard');

  const upgradeFacility = (key) => {
    if (!liveTeam) return;
    const current = facilities[key] ?? 0;
    const facilityDef = activeFacilities.find(f => f.key === key);
    if (!facilityDef || current >= facilityDef.levels.length - 1) return;
    const cost = facilityDef.costs[current + 1];
    if (cost && companyBalance >= cost) {
      upgradeFranchiseFacility(liveTeam.id, key, cost);
    }
  };

  const handleSetTicketPreset = (preset) => {
    if (liveTeam) setFranchiseTicketPreset(liveTeam.id, preset);
  };

  const handleHirePlayer = (player) => {
    if (liveTeam) hireStaff(liveTeam.id, { ...player, id: `${liveTeam.id}-t${Date.now()}` });
  };

  const handleFireStaff = (staffId) => {
    if (liveTeam) fireStaff(liveTeam.id, staffId);
  };

  // ── MANAGE VIEW ──
  if (view === 'manage' && liveTeam) {
    const ticket = activeTickets.find(t => t.key === ticketPreset);
    const totalWages = roster.reduce((sum, p) => sum + p.salary, 0);
    const avgOverall = Math.round(roster.reduce((sum, p) => sum + p.overall, 0) / roster.length);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/90 backdrop-blur-xl font-mono">
        <div className="absolute inset-0 z-0" onClick={onClose} />

        <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-[#0A101D] border border-[#00e5ff]/30 rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-[#00e5ff]/20 bg-[#060A13] p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => { setView('browse'); setManagingTeam(null); }} className="text-tactical-text/40 hover:text-white text-sm transition-colors">← Back</button>
              <TeamBadge name={liveTeam.name} size="lg" />
              <div>
                <h2 className="text-lg font-bold tracking-widest uppercase text-[#00e5ff]">{liveTeam.name}</h2>
                <span className="text-[10px] text-tactical-text/50 uppercase tracking-widest">{liveTeam.league} · {liveTeam.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="block text-[9px] text-tactical-text/40 uppercase">Squad Value</span>
                <span className="text-sm font-bold text-[#f59e0b]">{fmt(roster.reduce((s, p) => s + p.marketValue, 0))}</span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] text-tactical-text/40 uppercase">Corp Balance</span>
                <span className="text-sm font-bold text-emerald-400">{fmt(companyBalance)}</span>
              </div>
              <button onClick={onClose} aria-label="Close acquisition details" className="text-tactical-text/50 hover:text-white">✕</button>
            </div>
          </div>

          {/* Management Tabs */}
          <div className="flex border-b border-[#00e5ff]/10 bg-[#080d18]">
            {[
              { key: 'overview', label: 'Overview', icon: '🏠' },
              { key: 'performance', label: 'Performance', icon: '📊' },
              { key: 'calendar', label: 'Calendar', icon: '📅' },
              { key: 'squad', label: isF1 ? 'Team' : 'Squad', icon: '👥' },
              { key: 'transfers', label: isF1 ? 'Driver Market' : 'Transfers', icon: '🔄' },
              { key: 'development', label: 'Development', icon: '📈' },
              { key: 'facilities', label: 'Facilities', icon: '🏗️' },
              { key: 'tickets', label: isF1 ? 'Race Weekend' : 'Tickets', icon: '🎫' },
              { key: 'finances', label: 'Finances', icon: '💰' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setManageTab(tab.key)}
                className={`px-4 py-3 text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border-b-2 ${
                  manageTab === tab.key ? 'text-[#00e5ff] border-[#00e5ff] bg-[#00e5ff]/5 font-bold' : 'text-tactical-text/40 border-transparent hover:text-tactical-text/70'
                }`}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {/* ── OVERVIEW TAB ── */}
            {manageTab === 'overview' && (
              <OverviewTab liveTeam={liveTeam} roster={roster} sportsFranchises={sportsFranchises} />
            )}

            {/* ── PERFORMANCE TAB ── */}
            {manageTab === 'performance' && (
              <PerformanceTab liveTeam={liveTeam} roster={roster} />
            )}

            {/* ── CALENDAR TAB ── */}
            {manageTab === 'calendar' && (
              <CalendarTab liveTeam={liveTeam} sportsFranchises={sportsFranchises} />
            )}

            {/* ── DEVELOPMENT TAB ── */}
            {manageTab === 'development' && (
              <DevelopmentTab liveTeam={liveTeam} roster={roster} />
            )}

            {/* ── SQUAD TAB ── */}
            {manageTab === 'squad' && (
              <div className="space-y-4">
                {/* Squad KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Squad Size</div>
                    <div className="text-lg font-bold text-[#00e5ff]">{roster.length}</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Avg Overall</div>
                    <div className="text-lg font-bold" style={{ color: avgOverall > 75 ? '#10b981' : avgOverall > 60 ? '#f59e0b' : '#ef4444' }}>{avgOverall}</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Weekly Wages</div>
                    <div className="text-lg font-bold text-[#f59e0b]">{fmt(totalWages)}</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Trophies</div>
                    <div className="text-lg font-bold text-[#f59e0b]">{liveTeam.championships}</div>
                  </div>
                </div>

                {/* Player List */}
                <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[40px_1fr_100px_50px_50px_80px_80px_70px] gap-2 px-4 py-2 bg-[#060A13] text-[8px] text-tactical-text/40 uppercase tracking-widest border-b border-[#00e5ff]/10">
                    <span>#</span><span>Name</span><span>{isF1 ? 'Role' : 'Pos'}</span><span>Age</span><span>OVR</span><span>Salary</span><span>Value</span><span>Form</span>
                  </div>
                  <div className="max-h-[45vh] overflow-y-auto custom-scrollbar">
                    {roster.map((player, i) => {
                      const ovrColor = player.overall > 80 ? '#10b981' : player.overall > 65 ? '#f59e0b' : '#ef4444';
                      const formColor = { Excellent: '#10b981', Good: '#00e5ff', Average: '#f59e0b', Poor: '#ef4444' }[player.form];
                      return (
                        <div key={player.id} className="grid grid-cols-[40px_1fr_100px_50px_50px_80px_80px_70px] gap-2 px-4 py-2.5 border-b border-white/[0.03] hover:bg-[#00e5ff]/[0.03] transition-colors text-[10px]">
                          <span className="text-tactical-text/30">{i + 1}</span>
                          <span className="text-white font-bold truncate">{player.name}</span>
                          <span className="text-[#00e5ff] truncate">{player.position}</span>
                          <span className="text-tactical-text/60">{player.age}</span>
                          <span className="font-bold" style={{ color: ovrColor }}>{player.overall}</span>
                          <span className="text-tactical-text/50">{fmt(player.salary)}/yr</span>
                          <span className="text-[#10b981]">{fmt(player.marketValue)}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: formColor, backgroundColor: `${formColor}15` }}>{player.form}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── TRANSFERS TAB ── */}
            {manageTab === 'transfers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#00e5ff] uppercase tracking-widest">{isF1 ? 'Driver Market' : 'Transfer Market'} — {liveTeam.league}</h3>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tactical-text/30 text-[10px]">⌕</span>
                    <input type="text" value={transferSearch} onChange={e => setTransferSearch(e.target.value)} placeholder={isF1 ? "Search staff..." : "Search players..."}
                      className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg pl-7 pr-3 py-2 text-[10px] text-tactical-text/80 placeholder-tactical-text/25 focus:outline-none focus:border-[#00e5ff]/40 w-64" />
                  </div>
                </div>

                <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_100px_80px_50px_50px_80px_100px] gap-2 px-4 py-2 bg-[#060A13] text-[8px] text-tactical-text/40 uppercase tracking-widest border-b border-[#00e5ff]/10">
                    <span>Name</span><span>{isF1 ? 'Team' : 'Club'}</span><span>{isF1 ? 'Role' : 'Pos'}</span><span>Age</span><span>OVR</span><span>Value</span><span>Action</span>
                  </div>
                  <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {transferMarket.slice(0, 40).map(player => {
                      const ovrColor = player.overall > 80 ? '#10b981' : player.overall > 65 ? '#f59e0b' : '#ef4444';
                      const canAfford = companyBalance >= player.marketValue;
                      return (
                        <div key={player.id} className="grid grid-cols-[1fr_100px_80px_50px_50px_80px_100px] gap-2 px-4 py-2.5 border-b border-white/[0.03] hover:bg-[#00e5ff]/[0.03] transition-colors text-[10px]">
                          <span className="text-white font-bold truncate">{player.name}</span>
                          <span className="text-tactical-text/40 truncate flex items-center gap-1"><TeamBadge name={player.fromTeam} size="xs" />{player.fromTeam}</span>
                          <span className="text-[#00e5ff] truncate">{player.position}</span>
                          <span className="text-tactical-text/60">{player.age}</span>
                          <span className="font-bold" style={{ color: ovrColor }}>{player.overall}</span>
                          <span className="text-[#10b981]">{fmt(player.marketValue)}</span>
                          <button disabled={!canAfford} onClick={() => canAfford && handleHirePlayer(player)}
                            className={`text-[8px] uppercase tracking-widest px-2 py-1 rounded border transition-all ${canAfford ? 'text-[#00e5ff] border-[#00e5ff]/30 bg-[#00e5ff]/10 hover:brightness-125' : 'text-tactical-text/20 border-tactical-text/10 cursor-not-allowed'}`}>
                            {canAfford ? `Buy ${fmt(player.marketValue)}` : 'No Funds'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sell Players from own squad */}
                <h3 className="text-sm font-bold text-[#f59e0b] uppercase tracking-widest mt-6">{isF1 ? 'Release Staff' : 'Sell Players'}</h3>
                <div className="bg-[#0f172a] border border-[#f59e0b]/20 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_60px_50px_50px_80px_100px] gap-2 px-4 py-2 bg-[#060A13] text-[8px] text-tactical-text/40 uppercase tracking-widest border-b border-[#f59e0b]/10">
                    <span>Name</span><span>Pos</span><span>Age</span><span>OVR</span><span>Value</span><span>Action</span>
                  </div>
                  <div className="max-h-[30vh] overflow-y-auto custom-scrollbar">
                    {roster.map(player => (
                      <div key={player.id} className="grid grid-cols-[1fr_60px_50px_50px_80px_100px] gap-2 px-4 py-2.5 border-b border-white/[0.03] hover:bg-[#f59e0b]/[0.03] transition-colors text-[10px]">
                        <span className="text-white font-bold truncate">{player.name}</span>
                        <span className="text-[#00e5ff]">{player.position}</span>
                        <span className="text-tactical-text/60">{player.age}</span>
                        <span className="font-bold" style={{ color: player.overall > 80 ? '#10b981' : player.overall > 65 ? '#f59e0b' : '#ef4444' }}>{player.overall}</span>
                        <span className="text-[#10b981]">{fmt(player.marketValue)}</span>
                        <button onClick={() => handleFireStaff(player.id)} className="text-[8px] uppercase tracking-widest px-2 py-1 rounded border text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10 hover:brightness-125 transition-all">
                          Sell {fmt(player.marketValue)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FACILITIES TAB ── */}
            {manageTab === 'facilities' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#00e5ff] uppercase tracking-widest">Facility Upgrades</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activeFacilities.map(fac => {
                    const currentLevel = facilities[fac.key];
                    const maxLevel = fac.levels.length - 1;
                    const nextCost = currentLevel < maxLevel ? fac.costs[currentLevel + 1] : null;
                    const canUpgrade = nextCost && companyBalance >= nextCost;

                    return (
                      <div key={fac.key} className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{fac.icon}</span>
                            <div>
                              <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{fac.label}</h4>
                              <span className="text-[8px] text-tactical-text/40">{fac.effect}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-1 rounded bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">
                            Lv {currentLevel}/{maxLevel}
                          </span>
                        </div>

                        {/* Level Progress */}
                        <div className="flex gap-1 mb-3">
                          {fac.levels.map((lvl, i) => (
                            <div key={i} className="flex-1">
                              <div className={`h-2 rounded-full transition-all ${i <= currentLevel ? 'bg-[#00e5ff]' : 'bg-white/[0.06]'}`} />
                              <div className="text-[7px] text-tactical-text/30 mt-1 text-center truncate">{lvl}</div>
                            </div>
                          ))}
                        </div>

                        {currentLevel < maxLevel ? (
                          <button onClick={() => upgradeFacility(fac.key)} disabled={!canUpgrade}
                            className={`w-full py-2 text-[9px] uppercase font-bold tracking-widest rounded transition-all ${
                              canUpgrade ? 'bg-[#00e5ff] text-[#0A101D] hover:brightness-110' : 'bg-white/[0.03] text-tactical-text/20 cursor-not-allowed'
                            }`}>
                            Upgrade to {fac.levels[currentLevel + 1]} — {fmt(nextCost)}
                          </button>
                        ) : (
                          <div className="w-full py-2 text-[9px] uppercase font-bold tracking-widest rounded text-center text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30">
                            Max Level Reached
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TICKETS TAB ── */}
            {manageTab === 'tickets' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#00e5ff] uppercase tracking-widest">{isF1 ? 'Race Weekend Revenue' : 'Ticket Pricing Strategy'}</h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeTickets.map(preset => {
                    const isActive = ticketPreset === preset.key;
                    const stadiumCap = isF1 ? 100_000 : [10_000, 25_000, 50_000, 80_000][facilities.stadium];
                    const matchRevenue = Math.round(stadiumCap * (preset.fill / 100) * preset.price);
                    return (
                      <button key={preset.key} onClick={() => handleSetTicketPreset(preset.key)}
                        className={`p-4 rounded-lg border text-left transition-all ${isActive ? '' : 'border-[#00e5ff]/10 bg-[#0f172a] hover:border-[#00e5ff]/30'}`}
                        style={isActive ? { borderColor: `${preset.color}60`, backgroundColor: `${preset.color}10`, boxShadow: `0 0 20px ${preset.color}15` } : {}}>
                        <div className="text-lg font-bold" style={{ color: preset.color }}>€{preset.price}</div>
                        <div className="text-[10px] font-bold text-white uppercase mt-1">{preset.label}</div>
                        <div className="text-[8px] text-tactical-text/40 mt-2">Est. Fill Rate: <span style={{ color: preset.color }}>{preset.fill}%</span></div>
                        <div className="text-[8px] text-tactical-text/40">Match Revenue: <span className="text-[#10b981]">{fmt(matchRevenue)}</span></div>
                        <div className="text-[8px] text-tactical-text/40">Attendance: <span className="text-white">{Math.round(stadiumCap * preset.fill / 100).toLocaleString()}</span></div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-4 mt-4">
                  <div className="text-[10px] text-tactical-text/40 uppercase tracking-widest mb-3">{isF1 ? 'Revenue Projection (per race weekend)' : 'Revenue Projection (per match)'}</div>
                  {(() => {
                    const venueCap = isF1 ? 100_000 : [10_000, 25_000, 50_000, 80_000][facilities.stadium];
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-[8px] text-tactical-text/30 uppercase">{isF1 ? 'Circuit Capacity' : 'Stadium Capacity'}</div>
                          <div className="text-lg font-bold text-white">{venueCap.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[8px] text-tactical-text/30 uppercase">Avg Attendance</div>
                          <div className="text-lg font-bold text-[#00e5ff]">{Math.round(venueCap * (ticket?.fill || 80) / 100).toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[8px] text-tactical-text/30 uppercase">{isF1 ? 'Race Weekend Revenue' : 'Match Revenue'}</div>
                          <div className="text-lg font-bold text-[#10b981]">{fmt(Math.round(venueCap * (ticket?.fill || 80) / 100 * (ticket?.price || 50)))}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ── FINANCES TAB ── */}
            {manageTab === 'finances' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#00e5ff] uppercase tracking-widest">Club Finances</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Club Valuation</div>
                    <div className="text-lg font-bold text-white">{fmt(liveTeam.value)}</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#10b981]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Monthly Revenue</div>
                    <div className="text-lg font-bold text-[#10b981]">+{fmt(liveTeam.monthlyRevenue)}</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#f59e0b]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Wage Bill / Year</div>
                    <div className="text-lg font-bold text-[#f59e0b]">{fmt(totalWages)}</div>
                  </div>
                  <div className="bg-[#0f172a] border border-[#7c3aed]/20 rounded-lg p-3 text-center">
                    <div className="text-[8px] text-tactical-text/40 uppercase">Net P&L / Month</div>
                    <div className="text-lg font-bold" style={{ color: liveTeam.monthlyRevenue - totalWages / 12 > 0 ? '#10b981' : '#ef4444' }}>
                      {fmt(liveTeam.monthlyRevenue - totalWages / 12)}
                    </div>
                  </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-lg p-4">
                  <div className="text-[10px] text-tactical-text/40 uppercase tracking-widest mb-3">Revenue Breakdown</div>
                  {[
                    { label: 'Matchday Revenue', value: liveTeam.monthlyRevenue * 0.35, color: '#00e5ff' },
                    { label: 'Broadcasting Rights', value: liveTeam.monthlyRevenue * 0.40, color: '#7c3aed' },
                    { label: 'Sponsorships', value: liveTeam.monthlyRevenue * 0.15, color: '#f59e0b' },
                    { label: 'Merchandise', value: liveTeam.monthlyRevenue * 0.10, color: '#ec4899' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-tactical-text/60">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: item.color }}>{fmt(item.value)}/mo</span>
                    </div>
                  ))}
                </div>

                {/* Expense Breakdown */}
                <div className="bg-[#0f172a] border border-[#ef4444]/20 rounded-lg p-4">
                  <div className="text-[10px] text-tactical-text/40 uppercase tracking-widest mb-3">Expense Breakdown</div>
                  {[
                    { label: 'Player Wages', value: totalWages / 12, color: '#ef4444' },
                    { label: 'Staff & Operations', value: liveTeam.monthlyRevenue * 0.08, color: '#f59e0b' },
                    { label: 'Facility Maintenance', value: liveTeam.monthlyRevenue * 0.05, color: '#00e5ff' },
                    { label: 'Youth Development', value: liveTeam.monthlyRevenue * 0.03, color: '#10b981' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-tactical-text/60">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: item.color }}>-{fmt(item.value)}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── BROWSE VIEW (Acquisition + Owned Teams) ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/90 backdrop-blur-xl font-mono">
      <div className="absolute inset-0 z-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-[#0A101D] border border-[#00e5ff]/30 rounded-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="border-b border-[#00e5ff]/20 bg-[#060A13] p-4 flex justify-between items-center relative">
          <div className="flex items-center space-x-3 text-[#00e5ff]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <h2 className="text-xl font-bold tracking-widest uppercase">Global Franchise Desk</h2>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <span className="block text-[10px] text-tactical-text/50 uppercase tracking-widest">Liquid Corp Balance</span>
              <span className="block text-lg font-bold text-emerald-400">€{companyBalance.toLocaleString()}</span>
            </div>
            <button onClick={onClose} aria-label="Close acquisition modal" className="text-tactical-text/50 hover:text-white pb-1">✕</button>
          </div>
        </div>

        {/* Owned Teams Banner */}
        {ownedTeams.length > 0 && (
          <div className="bg-[#00e5ff]/5 border-b border-[#00e5ff]/20 px-4 py-3">
            <div className="text-[9px] text-tactical-text/40 uppercase tracking-widest mb-2">Your Franchises — Click to Manage</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {ownedTeams.map(team => (
                <button key={team.id} onClick={() => { setManagingTeam(team); setView('manage'); setManageTab('overview'); }}
                  className="flex-shrink-0 bg-[#0f172a] border border-[#00e5ff]/30 rounded-lg px-3 py-2 hover:border-[#00e5ff]/60 transition-all flex items-center gap-3 group">
                  <TeamBadge name={team.name} size="sm" />
                  <div>
                    <div className="text-[10px] text-white font-bold uppercase group-hover:text-[#00e5ff] transition-colors">{team.name}</div>
                    <div className="text-[8px] text-tactical-text/40">{team.league}</div>
                  </div>
                  <div className="text-[8px] text-[#10b981] font-bold">+{fmt(team.monthlyRevenue)}/mo</div>
                  <span className="text-[9px] text-[#00e5ff]/50 group-hover:text-[#00e5ff] transition-colors">Manage →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Leagues Navigation */}
          <div className="w-64 border-r border-[#00e5ff]/10 bg-[#080d18] p-4 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] text-tactical-text/40 uppercase tracking-widest mb-4">Select League</div>
            <div className="space-y-1">
              {leagues.map(league => {
                const teamCount = sportsFranchises.filter(t => t.league === league).length;
                const ownedCount = sportsFranchises.filter(t => t.league === league && t.owned).length;
                return (
                  <button key={league} onClick={() => setActiveLeague(league)}
                    className={`w-full text-left px-3 py-2 rounded text-[11px] uppercase tracking-wider transition-all flex justify-between items-center ${
                      activeLeague === league
                        ? 'bg-[#00e5ff]/20 text-[#00e5ff] font-bold border-l-2 border-[#00e5ff]'
                        : 'text-tactical-text/60 hover:bg-[#00e5ff]/5 border-l-2 border-transparent'
                    }`}>
                    <span>{league}</span>
                    <span className="text-[10px] opacity-50">{ownedCount > 0 ? `${ownedCount}/` : ''}[{teamCount}]</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teams Grid */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#0A101D] custom-scrollbar">
            <div className="mb-3">
              <PriceFilter sortBy={sportsSort} setSortBy={setSportsSort} priceMin={sportsPriceMin} setPriceMin={setSportsPriceMin} priceMax={sportsPriceMax} setPriceMax={setSportsPriceMax} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTeams.map(team => {
                const canAfford = companyBalance >= team.value;
                return (
                  <div key={team.id} className="bg-[#0f172a] border border-[#00e5ff]/20 rounded-md p-4 relative group hover:border-[#00e5ff]/60 transition-colors">
                    {team.owned && (
                      <div className="absolute top-0 right-0 bg-[#00e5ff] text-black text-[9px] font-bold px-2 py-1 uppercase rounded-bl-md">
                        Owned
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <TeamBadge name={team.name} size="md" />
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{team.name}</h3>
                          <p className="text-[10px] text-tactical-text/60 uppercase">{team.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-tactical-text/50 uppercase">Valuation</span>
                        <span className="text-sm font-bold text-white">€{(team.value / 1000000).toFixed(1)}M</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-4 mt-4 bg-black/30 p-2 rounded border border-white/5">
                      <div className="flex-1">
                        <span className="block text-[9px] text-tactical-text/50 uppercase">Trophies</span>
                        <span className="text-xs text-[#f59e0b] font-bold">{team.championships}</span>
                      </div>
                      <div className="flex-1 border-l border-white/10 pl-4">
                        <span className="block text-[9px] text-tactical-text/50 uppercase">Est. Monthly Rev</span>
                        <span className="text-xs text-emerald-400 font-bold">+€{(team.monthlyRevenue / 1000).toFixed(0)}K</span>
                      </div>
                    </div>

                    {team.owned ? (
                      <button onClick={() => { setManagingTeam(team); setView('manage'); setManageTab('overview'); }}
                        className="w-full py-2 text-[10px] uppercase font-bold tracking-widest rounded transition-all bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 hover:bg-[#00e5ff]/20">
                        Manage Franchise →
                      </button>
                    ) : (
                      <button
                        onClick={() => { if (canAfford) buyAsset('sportsFranchises', team.id, team.value); }}
                        disabled={!canAfford}
                        className={`w-full py-2 text-[10px] uppercase font-bold tracking-widest rounded transition-all ${
                          canAfford
                          ? 'bg-[#00e5ff] text-[#0A101D] hover:bg-[#00e5ff]/80 hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                          : 'bg-red-500/10 text-red-500/50 border border-red-500/20 cursor-not-allowed'
                        }`}>
                        {canAfford ? 'Acquire Ownership' : 'Insufficient Corp Funds'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
