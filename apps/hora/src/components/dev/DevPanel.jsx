import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import { useResizable } from '../../hooks/useResizable';

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2 py-1 border-b border-[#ffffff08]">
    <span className="text-[9px] text-tactical-text/40 uppercase tracking-widest shrink-0">{label}</span>
    <div className="flex gap-1 flex-wrap justify-end">{children}</div>
  </div>
);

const Btn = ({ onClick, children, color = '#00e5ff', danger }) => (
  <button
    onClick={onClick}
    className="px-2 py-0.5 rounded font-mono text-[9px] tracking-widest hover:brightness-150 transition-all"
    style={{ border: `1px solid ${color}33`, backgroundColor: danger ? `${color}20` : `${color}12`, color }}
  >
    {children}
  </button>
);

const Stat = ({ label, value, color = '#9ca3af' }) => (
  <div className="text-center">
    <div className="text-[8px] text-tactical-text/40 uppercase tracking-widest">{label}</div>
    <div className="text-[11px] font-bold" style={{ color }}>{value}</div>
  </div>
);

const InputRow = ({ label, value, onChange, onSubmit, placeholder, color = '#00e5ff', btnLabel = 'SET' }) => (
  <Row label={label}>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSubmit()}
      placeholder={placeholder}
      className="bg-[#ffffff08] border rounded px-2 py-0.5 text-[9px] text-tactical-text w-20 outline-none font-mono"
      style={{ borderColor: `${color}33` }}
    />
    <Btn onClick={onSubmit} color={color}>{btnLabel}</Btn>
  </Row>
);

const fmt = (n) => {
  if (n == null || !isFinite(n)) return '€0';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}€${(a/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}€${(a/1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}€${(a/1e3).toFixed(0)}K`;
  return `${sign}€${Math.round(a)}`;
};

const SECTIONS = ['stats', 'money', 'economy', 'nodes', 'time', 'player', 'danger'];

export default function DevPanel({ onClose }) {
  const [log, setLog] = useState([]);
  const [moneyInput, setMoneyInput] = useState('');
  const [personalInput, setPersonalInput] = useState('');
  const [apInput, setApInput] = useState('');
  const [heatInput, setHeatInput] = useState('');
  const [finesInput, setFinesInput] = useState('');
  const [followersInput, setFollowersInput] = useState('');
  const [taxInput, setTaxInput] = useState('');
  const [tickInput, setTickInput] = useState('');
  const [approvalInput, setApprovalInput] = useState('');
  const [xpInput, setXpInput] = useState('');
  const [expanded, setExpanded] = useState({ stats: true, money: true, economy: false, nodes: false, time: false, player: false, danger: false });
  const { size: panelWidth, onMouseDown: onResizeRight } = useResizable({
    direction: 'horizontal',
    initialSize: 320,
    minSize: 260,
    maxSize: 600,
    storageKey: 'dev-panel-width',
  });

  const push = (msg) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));

  const toggle = (s) => setExpanded(p => ({ ...p, [s]: !p[s] }));

  // Read state
  const store = useEmpireStore();
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);

  const nodes = Object.values(store.nodes);
  const owned  = nodes.filter(n => n.owner === 'player').length;
  const rival  = nodes.filter(n => n.owner === 'rival').length;
  const market = nodes.filter(n => n.owner === 'market').length;
  const operational = nodes.filter(n => n.owner === 'player' && n.status === 'operational').length;
  const building = nodes.filter(n => n.owner === 'player' && n.status === 'building').length;
  const activeLoans = (store.loans || []).filter(l => l.status === 'active');
  const stakedFunds = store.funds.filter(f => (f.stakedAmount || 0) > 0);

  // ── Helpers ────────────────────────────────────────────────────
  const parseNum = (s) => {
    const clean = s.replace(/[^0-9.-]/g, '');
    const n = parseFloat(clean);
    return isFinite(n) ? n : null;
  };

  // ── MONEY ACTIONS ──
  const addMoney = (amount) => {
    useEmpireStore.setState(s => ({ companyBalance: s.companyBalance + amount }));
    push(`+${fmt(amount)} company`);
  };

  const addPersonal = (amount) => {
    useEmpireStore.setState(s => ({ personalBalance: s.personalBalance + amount }));
    push(`+${fmt(amount)} personal`);
  };

  const setCompanyBalance = () => {
    const val = parseNum(moneyInput);
    if (val == null) return;
    useEmpireStore.setState({ companyBalance: val });
    push(`Company → ${fmt(val)}`);
    setMoneyInput('');
  };

  const setPersonalBalance = () => {
    const val = parseNum(personalInput);
    if (val == null) return;
    useEmpireStore.setState({ personalBalance: val });
    push(`Personal → ${fmt(val)}`);
    setPersonalInput('');
  };

  const setAP = () => {
    const val = parseNum(apInput);
    if (val == null || val < 0) return;
    useCardEconomyStore.setState({ aegisPoints: Math.round(val) });
    push(`AP → ${Math.round(val).toLocaleString()}`);
    setApInput('');
  };

  // ── ECONOMY ACTIONS ──
  const setHeat = (val) => {
    useEmpireStore.setState({ heat: Math.max(0, Math.min(100, val)) });
    push(`Heat → ${val}`);
  };

  const setHeatManual = () => {
    const val = parseNum(heatInput);
    if (val == null) return;
    setHeat(val);
    setHeatInput('');
  };

  const setFines = () => {
    const val = parseNum(finesInput);
    if (val == null) return;
    useEmpireStore.setState({ complianceFines: Math.max(0, val) });
    push(`Fines → ${fmt(val)}`);
    setFinesInput('');
  };

  const clearFines = () => {
    useEmpireStore.setState({ complianceFines: 0 });
    push('Fines cleared');
  };

  const setTax = () => {
    const val = parseNum(taxInput);
    if (val == null) return;
    useEmpireStore.setState({ taxRate: Math.max(0, Math.min(1, val / 100)) });
    push(`Tax → ${val}%`);
    setTaxInput('');
  };

  const setFollowers = () => {
    const val = parseNum(followersInput);
    if (val == null) return;
    useEmpireStore.setState({ followers: Math.max(0, Math.round(val)) });
    push(`Followers → ${Math.round(val).toLocaleString()}`);
    setFollowersInput('');
  };

  const maxAxes = () => {
    useEmpireStore.setState({ power: 100, growth: 100, governance: 100, impact: 100 });
    push('All axes → 100');
  };

  const clearLoans = () => {
    useEmpireStore.setState(s => ({
      loans: s.loans.map(l => ({ ...l, status: 'paid_off', remainingBalance: 0, monthsRemaining: 0 })),
    }));
    push(`${activeLoans.length} loan(s) paid off`);
  };

  const withdrawAllFunds = () => {
    useEmpireStore.setState(s => ({
      funds: s.funds.map(f => ({ ...f, stakedAmount: 0 })),
      companyBalance: s.companyBalance + stakedFunds.reduce((sum, f) => sum + (f.stakedAmount || 0), 0),
    }));
    push('All funds withdrawn');
  };

  // ── NODE ACTIONS ──
  const unlockAllIntel = () => {
    const patch = {};
    for (const n of nodes) {
      if (n.owner === 'rival') patch[n.id] = { ...n, intelDecrypted: true };
    }
    useEmpireStore.setState(s => ({ nodes: { ...s.nodes, ...patch } }));
    push(`Intel decrypted on ${Object.keys(patch).length} node(s)`);
  };

  const makeAllMarket = () => {
    const patch = {};
    for (const n of nodes) {
      if (n.owner === 'rival') {
        patch[n.id] = { ...n, owner: 'market', capex: n.income * 12, opex: Math.round(n.income * 0.3), intelDecrypted: false };
      }
    }
    useEmpireStore.setState(s => ({ nodes: { ...s.nodes, ...patch } }));
    push(`${Object.keys(patch).length} rival → market`);
  };

  const ownAll = () => {
    const patch = {};
    for (const n of nodes) {
      if (n.owner !== 'player') patch[n.id] = { ...n, owner: 'player', status: 'operational' };
    }
    useEmpireStore.setState(s => ({ nodes: { ...s.nodes, ...patch } }));
    push(`Seized ${Object.keys(patch).length} nodes`);
  };

  const finishBuilding = () => {
    const patch = {};
    for (const n of nodes) {
      if (n.owner === 'player' && n.status === 'building') {
        patch[n.id] = { ...n, status: 'operational', income: Math.round((n.opex ?? 10_000) * 2.5), buildStartTick: undefined, buildDuration: undefined };
      }
    }
    useEmpireStore.setState(s => ({ nodes: { ...s.nodes, ...patch } }));
    push(`${Object.keys(patch).length} construction(s) finished`);
  };

  const upgradeAllNodes = () => {
    const patch = {};
    for (const n of nodes) {
      if (n.owner === 'player' && n.status === 'operational') {
        const newLevel = Math.min((n.level || 1) + 1, 5);
        patch[n.id] = { ...n, level: newLevel, income: Math.round(n.income * 1.3) };
      }
    }
    useEmpireStore.setState(s => ({ nodes: { ...s.nodes, ...patch } }));
    push(`Upgraded ${Object.keys(patch).length} nodes (+1 level)`);
  };

  const resetNodes = () => {
    import('../../data/seed').then(({ INITIAL_NODES }) => {
      const map = Object.fromEntries(INITIAL_NODES.map(n => [n.id, n]));
      useEmpireStore.setState({ nodes: map });
      push(`Nodes reset to seed (${INITIAL_NODES.length})`);
    });
  };

  // ── TIME ACTIONS ──
  const forceTick = () => {
    store.processTick();
    push('Tick fired');
  };

  const multiTick = (n) => {
    for (let i = 0; i < n; i++) store.processTick();
    push(`${n} ticks fired`);
  };

  const setGameTick = () => {
    const val = parseNum(tickInput);
    if (val == null || val < 0) return;
    const tick = Math.round(val);
    const TICKS_PER_DAY = 1440;
    const totalDays = Math.floor(tick / TICKS_PER_DAY);
    const day = (totalDays % 30) + 1;
    const totalMonths = Math.floor(totalDays / 30);
    const month = (totalMonths % 12) + 1;
    const year = 2026 + Math.floor(totalMonths / 12);
    useEmpireStore.setState({ gameTick: tick, gameDate: { day, month, year } });
    push(`Tick → ${tick} (${day}/${month}/${year})`);
    setTickInput('');
  };

  const setSpeed = (speed) => {
    useEmpireStore.setState({ gameSpeed: speed });
    push(`Speed → ${speed === 0 ? 'PAUSED' : speed + 'x'}`);
  };

  // ── PLAYER ACTIONS ──
  const setApproval = () => {
    const val = parseNum(approvalInput);
    if (val == null) return;
    useEmpireStore.setState({ ceoApproval: Math.max(0, Math.min(100, Math.round(val))) });
    push(`CEO Approval → ${Math.round(val)}%`);
    setApprovalInput('');
  };

  const setXP = () => {
    const val = parseNum(xpInput);
    if (val == null) return;
    useEmpireStore.setState({ ceoExperience: Math.max(0, Math.round(val)) });
    push(`CEO XP → ${Math.round(val)}`);
    setXpInput('');
  };

  const unsack = () => {
    useEmpireStore.setState({ sacked: false, sackedAt: 0, ceoApproval: 50, boardSatisfaction: 60, boardPatience: 90 });
    push('CEO reinstated');
  };

  const maxBoard = () => {
    useEmpireStore.setState({ boardSatisfaction: 100, boardPatience: 999, ceoApproval: 100 });
    push('Board maxed (100 satisfaction, 999 patience)');
  };

  const setStructure = (s) => {
    useEmpireStore.setState({ structure: s });
    push(`Structure → ${s}`);
  };

  // ── DANGER ZONE ──
  const resetEverything = () => {
    if (!window.confirm('RESET ALL PROGRESS? This clears your saved game.')) return;
    localStorage.removeItem('quantico-empire-storage-v8');
    push('Storage cleared — reload to apply');
    window.location.reload();
  };

  const bankruptCompany = () => {
    useEmpireStore.setState({ companyBalance: 0, personalBalance: 0, netWorth: 0 });
    push('Bankrupted — all balances → 0');
  };

  const SectionHeader = ({ id, label, icon }) => (
    <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-1 py-1 hover:bg-[#ffffff06] rounded transition-colors">
      <span className="text-[8px] text-[#00e5ff]/70 uppercase tracking-[0.2em] font-bold">{icon} {label}</span>
      <span className="text-[9px] text-tactical-text/30">{expanded[id] ? '▼' : '▶'}</span>
    </button>
  );

  return (
    <div
      className="fixed bottom-14 left-4 z-[999] rounded-lg overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-[#00e5ff20] scrollbar-track-transparent"
      style={{
        width: `${panelWidth}px`,
        background: 'rgba(6,10,18,0.97)',
        border: '1px solid rgba(0,229,255,0.2)',
        boxShadow: '0 0 24px rgba(0,229,255,0.08)',
        maxHeight: 'calc(100vh - 100px)',
      }}
    >
      {/* Resize handle — right edge */}
      <div
        onMouseDown={onResizeRight}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-30 group hover:bg-[#00e5ff]/20 transition-colors"
        title="Drag to resize"
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-[#00e5ff]/20 group-hover:bg-[#00e5ff]/60 rounded-full transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#ffffff12] sticky top-0 z-10"
           style={{ background: 'rgba(6,10,18,0.98)' }}>
        <span className="text-[10px] text-[#00e5ff] tracking-[0.2em] font-bold">DEV PANEL</span>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-tactical-text/30">F2</span>
          <button onClick={onClose} aria-label="Close dev panel" className="text-tactical-text/40 hover:text-tactical-text text-xs">✕</button>
        </div>
      </div>

      <div className="p-3 space-y-1">
        {/* ═══════ STATS ═══════ */}
        <SectionHeader id="stats" label="Live Stats" icon="◈" />
        {expanded.stats && (
          <div className="space-y-1 pb-1">
            <div className="grid grid-cols-4 gap-1 bg-[#ffffff05] rounded p-2">
              <Stat label="Company" value={fmt(store.companyBalance)} color={store.companyBalance >= 0 ? '#10b981' : '#ef4444'} />
              <Stat label="Personal" value={fmt(store.personalBalance)} color="#7c3aed" />
              <Stat label="Net Worth" value={fmt(store.netWorth)} color="#00e5ff" />
              <Stat label="AP" value={aegisPoints.toLocaleString()} color="#ffd700" />
            </div>
            <div className="grid grid-cols-5 gap-1 bg-[#ffffff05] rounded p-1.5">
              <Stat label="Heat" value={store.heat.toFixed(0)} color={store.heat > 60 ? '#ef4444' : '#f59e0b'} />
              <Stat label="Tax" value={`${(store.taxRate * 100).toFixed(0)}%`} color="#f59e0b" />
              <Stat label="Fines" value={fmt(store.complianceFines)} color={store.complianceFines > 0 ? '#ef4444' : '#9ca3af'} />
              <Stat label="Approval" value={`${store.ceoApproval}%`} color={store.ceoApproval > 50 ? '#10b981' : '#ef4444'} />
              <Stat label="Board" value={`${store.boardSatisfaction}`} color={store.boardSatisfaction > 50 ? '#10b981' : '#ef4444'} />
            </div>
            <div className="grid grid-cols-5 gap-1 bg-[#ffffff05] rounded p-1.5">
              <Stat label="Owned" value={owned} color="#00e5ff" />
              <Stat label="Building" value={building} color="#f59e0b" />
              <Stat label="Rival" value={rival} color="#ef4444" />
              <Stat label="Tick" value={store.gameTick} color="#9ca3af" />
              <Stat label="Speed" value={`${store.gameSpeed}x`} color="#a78bfa" />
            </div>
          </div>
        )}

        {/* ═══════ MONEY ═══════ */}
        <SectionHeader id="money" label="Money & Currency" icon="◆" />
        {expanded.money && (
          <div className="space-y-0.5 pb-1">
            <Row label="Company">
              <Btn onClick={() => addMoney(100_000)} color="#10b981">+100K</Btn>
              <Btn onClick={() => addMoney(1_000_000)} color="#10b981">+1M</Btn>
              <Btn onClick={() => addMoney(10_000_000)} color="#10b981">+10M</Btn>
              <Btn onClick={() => addMoney(100_000_000)} color="#10b981">+100M</Btn>
            </Row>
            <InputRow label="Set Company" value={moneyInput} onChange={setMoneyInput} onSubmit={setCompanyBalance} placeholder="e.g. 5000000" color="#10b981" />
            <Row label="Personal">
              <Btn onClick={() => addPersonal(100_000)} color="#7c3aed">+100K</Btn>
              <Btn onClick={() => addPersonal(1_000_000)} color="#7c3aed">+1M</Btn>
              <Btn onClick={() => addPersonal(10_000_000)} color="#7c3aed">+10M</Btn>
            </Row>
            <InputRow label="Set Personal" value={personalInput} onChange={setPersonalInput} onSubmit={setPersonalBalance} placeholder="e.g. 1000000" color="#7c3aed" />
            <InputRow label="Set AP" value={apInput} onChange={setApInput} onSubmit={setAP} placeholder="e.g. 5000" color="#ffd700" />
          </div>
        )}

        {/* ═══════ ECONOMY ═══════ */}
        <SectionHeader id="economy" label="Economy & Risk" icon="⚙" />
        {expanded.economy && (
          <div className="space-y-0.5 pb-1">
            <Row label="Heat">
              <Btn onClick={() => setHeat(0)} color="#10b981">0</Btn>
              <Btn onClick={() => setHeat(50)} color="#f59e0b">50</Btn>
              <Btn onClick={() => setHeat(80)} color="#ef4444">80</Btn>
              <Btn onClick={() => setHeat(100)} color="#ef4444">100</Btn>
            </Row>
            <InputRow label="Set Heat" value={heatInput} onChange={setHeatInput} onSubmit={setHeatManual} placeholder="0-100" color="#f59e0b" />
            <InputRow label="Tax Rate %" value={taxInput} onChange={setTaxInput} onSubmit={setTax} placeholder="e.g. 17" color="#f59e0b" />
            <Row label="Fines">
              <Btn onClick={clearFines} color="#10b981">CLEAR</Btn>
            </Row>
            <InputRow label="Set Fines" value={finesInput} onChange={setFinesInput} onSubmit={setFines} placeholder="e.g. 500000" color="#ef4444" />
            <InputRow label="Followers" value={followersInput} onChange={setFollowersInput} onSubmit={setFollowers} placeholder="e.g. 10000" color="#00e5ff" />
            <Row label="Axes">
              <Btn onClick={maxAxes} color="#7c3aed">MAX ALL</Btn>
            </Row>
            <Row label="Loans">
              <Btn onClick={clearLoans} color="#10b981">PAY OFF ALL ({activeLoans.length})</Btn>
            </Row>
            <Row label="Funds">
              <Btn onClick={withdrawAllFunds} color="#f59e0b">WITHDRAW ALL ({stakedFunds.length})</Btn>
            </Row>
          </div>
        )}

        {/* ═══════ NODES ═══════ */}
        <SectionHeader id="nodes" label="Nodes & Assets" icon="⊞" />
        {expanded.nodes && (
          <div className="space-y-0.5 pb-1">
            <Row label="Intel">
              <Btn onClick={unlockAllIntel} color="#00e5ff">DECRYPT ALL</Btn>
            </Row>
            <Row label="Ownership">
              <Btn onClick={makeAllMarket} color="#f59e0b">RIVAL→MARKET</Btn>
              <Btn onClick={ownAll} color="#10b981">SEIZE ALL</Btn>
            </Row>
            <Row label="Building">
              <Btn onClick={finishBuilding} color="#a78bfa">FINISH ALL ({building})</Btn>
              <Btn onClick={upgradeAllNodes} color="#00e5ff">UPGRADE ALL</Btn>
            </Row>
            <Row label="Reset">
              <Btn onClick={resetNodes} color="#ef4444" danger>RESET SEED</Btn>
            </Row>
          </div>
        )}

        {/* ═══════ TIME ═══════ */}
        <SectionHeader id="time" label="Time & Engine" icon="⏱" />
        {expanded.time && (
          <div className="space-y-0.5 pb-1">
            <Row label="Tick">
              <Btn onClick={forceTick} color="#a78bfa">+1</Btn>
              <Btn onClick={() => multiTick(10)} color="#a78bfa">+10</Btn>
              <Btn onClick={() => multiTick(30)} color="#a78bfa">+30</Btn>
              <Btn onClick={() => multiTick(120)} color="#a78bfa">+120 (1 day)</Btn>
            </Row>
            <InputRow label="Set Tick" value={tickInput} onChange={setTickInput} onSubmit={setGameTick} placeholder="e.g. 3600" color="#a78bfa" />
            <Row label="Speed">
              <Btn onClick={() => setSpeed(0)} color="#ef4444">⏸ PAUSE</Btn>
              <Btn onClick={() => setSpeed(1)} color="#9ca3af">1x</Btn>
              <Btn onClick={() => setSpeed(2)} color="#f59e0b">2x</Btn>
              <Btn onClick={() => setSpeed(5)} color="#10b981">5x</Btn>
            </Row>
            <div className="text-[8px] text-tactical-text/30 px-1 py-0.5">
              Day {store.gameDate.day} · Month {store.gameDate.month} · Year {store.gameDate.year} · Tick {store.gameTick}
            </div>
          </div>
        )}

        {/* ═══════ PLAYER ═══════ */}
        <SectionHeader id="player" label="Player & Board" icon="♛" />
        {expanded.player && (
          <div className="space-y-0.5 pb-1">
            <InputRow label="CEO Approval" value={approvalInput} onChange={setApprovalInput} onSubmit={setApproval} placeholder="0-100" color="#10b981" />
            <InputRow label="CEO XP" value={xpInput} onChange={setXpInput} onSubmit={setXP} placeholder="e.g. 500" color="#7c3aed" />
            <Row label="Board">
              <Btn onClick={maxBoard} color="#10b981">MAX BOARD</Btn>
              {store.sacked && <Btn onClick={unsack} color="#f59e0b">UNSACK CEO</Btn>}
            </Row>
            <Row label="Structure">
              <Btn onClick={() => setStructure('sole_trader')} color="#9ca3af">SOLE</Btn>
              <Btn onClick={() => setStructure('LLC')} color="#00e5ff">LLC</Btn>
              <Btn onClick={() => setStructure('corporation')} color="#7c3aed">CORP</Btn>
              <Btn onClick={() => setStructure('holding')} color="#ffd700">HOLD</Btn>
            </Row>
          </div>
        )}

        {/* ═══════ DANGER ═══════ */}
        <SectionHeader id="danger" label="Danger Zone" icon="⚠" />
        {expanded.danger && (
          <div className="space-y-0.5 pb-1">
            <Row label="Bankrupt">
              <Btn onClick={bankruptCompany} color="#ef4444" danger>ZERO ALL BALANCES</Btn>
            </Row>
            <Row label="Reset">
              <Btn onClick={resetEverything} color="#ef4444" danger>WIPE SAVE & RELOAD</Btn>
            </Row>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="mt-1 rounded bg-[#ffffff05] p-2 max-h-28 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i} className="text-[8px] text-tactical-text/40 leading-5">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
