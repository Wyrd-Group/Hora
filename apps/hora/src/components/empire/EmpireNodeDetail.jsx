import React, { useMemo, useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';

const SECTOR_COL = {
  finance: "#00e5ff", tech: "#7c3aed", oil_gas: "#f59e0b",
  manufacturing: "#6366f1", energy: "#10b981", pharma: "#ec4899", venue: "#a78bfa"
};

const fmt = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${n}`;

const EmpireNodeDetail = () => {
  const selectedNodeId = useEmpireStore(s => s.selectedNodeId);
  const nodeMap = useEmpireStore(s => s.nodes);
  const node = selectedNodeId ? nodeMap[selectedNodeId] : null;
  const selectNode = useEmpireStore(s => s.selectNode);
  const cardMap = useEmpireStore(s => s.cards);
  const cards = useMemo(() => Object.values(cardMap || {}), [cardMap]);
  const power = useEmpireStore(s => s.power);
  const companyBalance  = useEmpireStore(s => s.companyBalance);
  const upgradeNode     = useEmpireStore(s => s.upgradeNode);
  const purchaseNode    = useEmpireStore(s => s.purchaseNode);
  const purchaseNamingRights = useEmpireStore(s => s.purchaseNamingRights);
  const decryptIntel    = useEmpireStore(s => s.decryptIntel);
  const executeCyberStrike = useEmpireStore(s => s.executeCyberStrike);
  const personalBalance = useEmpireStore(s => s.personalBalance);
  const gameTick = useEmpireStore(s => s.gameTick);
  const accelerateConstruction = useEmpireStore(s => s.accelerateConstruction);
  
  const [newName, setNewName] = useState('');

  if (!node) return null;

  const c = SECTOR_COL[node?.type] || '#64748b';

  return (
    <div className="fixed right-0 top-[40px] bottom-8 w-80 bg-tactical-bg/95 border-l border-tactical-border z-[25] overflow-y-auto backdrop-blur transition-transform duration-300">
      {/* Glassmorphism image block */}
      {node?.imageUrl && (
        <div className="relative w-full h-32 shrink-0 overflow-hidden">
          <img
            src={node.imageUrl}
            alt={node?.name ?? ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* glass gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(6,10,18,0.25) 0%, rgba(6,10,18,0.85) 100%)',
              backdropFilter: 'blur(0px)',
            }}
          />
          {/* sector badge pinned over image */}
          <span
            className="absolute bottom-2 left-3 text-[8px] uppercase tracking-[0.15em] px-2 py-1 rounded"
            style={{
              color: c,
              backgroundColor: `${c}25`,
              border: `1px solid ${c}40`,
              backdropFilter: 'blur(8px)',
            }}
          >
            {node?.type?.replace('_', ' & ')}
          </span>
          <button
            onClick={() => selectNode(null)}
            className="absolute top-2 right-2 text-white/60 hover:text-white text-xs w-6 h-6 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(6,10,18,0.55)', backdropFilter: 'blur(4px)' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4">
      {/* Header row — only shown when no image (fallback) */}
      {!node?.imageUrl && (
        <div className="flex justify-between items-center mb-4">
          <span
            className="text-[8px] uppercase tracking-[0.15em] px-2 py-1 rounded"
            style={{ color: c, backgroundColor: `${c}15` }}
          >
            {node?.type?.replace('_', ' & ')}
          </span>
          <button
            onClick={() => selectNode(null)}
            className="text-tactical-text/50 hover:text-tactical-text"
          >
            ✕
          </button>
        </div>
      )}

      <div className="text-base font-bold mb-1 text-tactical-text">{node?.name}</div>
      <div className="text-[9px] text-tactical-text/50 mb-4">
        {node?.lat != null ? node.lat.toFixed(2) : '—'}°N,{' '}
        {node?.lon != null ? node.lon.toFixed(2) : '—'}°E
      </div>

      {node?.owner === 'player' && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-tactical-border/30 rounded p-2 text-center">
              <div className="text-[8px] text-tactical-text/50 mb-1">LEVEL</div>
              <div className="text-lg font-bold" style={{ color: c }}>{node?.level ?? 1}/5</div>
            </div>
            <div className="bg-tactical-border/30 rounded p-2 text-center">
              <div className="text-[8px] text-tactical-text/50 mb-1">INCOME/MO</div>
              <div className="text-sm font-bold text-empire-player">{fmt(node?.income ?? 0)}</div>
            </div>
          </div>

          {node?.status === 'building' && (() => {
            const start = node.buildStartTick ?? 0;
            const dur = node.buildDuration ?? 788_400;
            const elapsed = gameTick - start;
            const pct = Math.min(100, Math.round((elapsed / dur) * 100));
            const remaining = Math.max(1, dur - elapsed);
            const rushCost = Math.round((node.capex ?? 50000) * 0.5 * (remaining / dur));
            const canRush = companyBalance >= rushCost;
            return (
              <div className="bg-empire-rival/10 border border-empire-rival/20 rounded p-2 mb-3">
                <div className="text-[8px] text-empire-rival mb-1">UNDER CONSTRUCTION · {pct}%</div>
                <div className="h-1.5 bg-tactical-border rounded overflow-hidden">
                  <div className="h-full bg-[#f59e0b] rounded transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="text-[8px] text-empire-rival">
                    {remaining >= 525_600 ? `${Math.floor(remaining / 525_600)}y ${Math.floor((remaining % 525_600) / 43_200)}mo` :
                     remaining >= 43_200 ? `${Math.floor(remaining / 43_200)}mo` :
                     remaining >= 1_440 ? `${Math.floor(remaining / 1_440)}d` : `${Math.floor(remaining / 60)}h`} remaining
                  </div>
                  <button
                    onClick={() => accelerateConstruction(node.id)}
                    disabled={!canRush}
                    className={`px-2 py-0.5 rounded font-mono text-[7px] font-bold uppercase tracking-widest transition-all ${canRush ? 'hover:brightness-125' : 'opacity-40 cursor-not-allowed'}`}
                    style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}
                  >
                    ⚡ Rush · {rushCost >= 1e6 ? `€${(rushCost/1e6).toFixed(1)}M` : rushCost >= 1e3 ? `€${(rushCost/1e3).toFixed(0)}K` : `€${rushCost}`}
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="text-[9px] text-tactical-text/50 mb-2 uppercase tracking-widest">Card Roster</div>
          {cards.map(card => (
            <div key={card?.id} className="bg-tactical-border/30 rounded p-2 mb-1.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold shrink-0 bg-tactical-border/50 text-tactical-text">
                {card?.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate text-tactical-text">{card?.name}</div>
                <div className="text-[8px] text-tactical-text/50 truncate">{card?.tier} {card?.role}</div>
                <div className="text-[8px] text-empire-player">{card?.stat}</div>
              </div>
            </div>
          ))}

          {(node?.level ?? 1) < 5 && (() => {
            const upgradeCost = (node?.income ?? 0) * 12;
            const canUpgrade = companyBalance >= upgradeCost && node?.status === 'operational';
            return (
              <button
                onClick={() => upgradeNode(node.id)}
                disabled={!canUpgrade}
                className="w-full py-2.5 rounded font-mono text-[10px] tracking-widest uppercase mt-2 transition-all"
                style={{
                  backgroundColor: canUpgrade ? `${c}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${canUpgrade ? `${c}55` : 'rgba(255,255,255,0.08)'}`,
                  color: canUpgrade ? c : '#374151',
                  cursor: canUpgrade ? 'pointer' : 'not-allowed',
                }}
              >
                {canUpgrade
                  ? `Upgrade → Lv.${(node?.level ?? 1) + 1} — ${fmt(upgradeCost)}`
                  : companyBalance < upgradeCost
                  ? `Need ${fmt(upgradeCost - companyBalance)} more`
                  : 'Under construction'}
              </button>
            );
          })()}
        </>
      )}

      {node?.owner === 'market' && !node?.canBeRenamed && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-tactical-border/30 rounded p-2 text-center">
              <div className="text-[8px] text-tactical-text/50 mb-1">CAPEX</div>
              <div className="text-sm font-bold text-empire-market">{fmt(node?.capex ?? 0)}</div>
            </div>
            <div className="bg-tactical-border/30 rounded p-2 text-center">
              <div className="text-[8px] text-tactical-text/50 mb-1">OPEX/MO</div>
              <div className="text-sm font-bold text-empire-rival">{fmt(node?.opex ?? 0)}</div>
            </div>
          </div>

          <div className="text-[9px] text-tactical-text/50 mb-3 uppercase tracking-widest">Acquisition Method</div>

          <button
            onClick={() => purchaseNode(node?.id, 'build')}
            className="w-full py-2.5 rounded font-mono text-[10px] tracking-widest uppercase mb-2 bg-empire-player/20 border border-empire-player/30 text-empire-player hover:brightness-125 transition-all"
          >
            BUILD IT — {fmt((node?.capex ?? 0) * 0.6)} + 14 days
          </button>

          <button
            onClick={() => purchaseNode(node?.id, 'buy')}
            className="w-full py-2.5 rounded font-mono text-[10px] tracking-widest uppercase bg-empire-market/20 border border-empire-market/30 text-empire-market hover:brightness-125 transition-all"
          >
            BUY IT — {fmt(node?.capex ?? 0)} instant
          </button>
        </>
      )}

      {node?.canBeRenamed && (
        <>
          <div className="bg-emerald-900/10 border border-emerald-500/20 rounded p-3 text-center mt-2 mb-3">
             <div className="text-[9px] text-emerald-400 uppercase tracking-widest mb-2 font-bold select-none">Philanthropy & Prestige</div>
             <input 
               type="text" 
               className="w-full bg-black/40 border border-tactical-border rounded p-2 text-xs text-white mb-2 outline-none focus:border-emerald-500/50 placeholder:text-white/20" 
               placeholder={`Rename ${node.name}...`} 
               value={newName} 
               onChange={e => setNewName(e.target.value)} 
             />
             <div className="text-[9px] text-emerald-400/70">{node?.renameEffect}</div>
          </div>
          <button
            onClick={() => {
              purchaseNamingRights(node.id, newName || node.name);
              setNewName('');
            }}
            disabled={personalBalance < node.namingRightsCost}
            className="w-full py-2.5 rounded font-mono text-[10px] tracking-widest uppercase mb-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {personalBalance >= node.namingRightsCost ? `BUY NAMING RIGHTS — ${fmt(node.namingRightsCost)} (Personal)` : `INSUFFICIENT PERSONAL FUNDS — ${fmt(node.namingRightsCost)}`}
          </button>
        </>
      )}

      {node?.owner === 'rival' && !node?.intelDecrypted && (
        <>
          <div className="bg-empire-rival/10 border border-empire-rival/20 rounded p-3 text-center mt-2">
            <div className="text-[9px] text-empire-rival uppercase tracking-widest mb-1">Rival Intelligence</div>
            <div className="text-[10px] text-tactical-text/50">Data encrypted. Unlock to reveal sector, income, and strike probability.</div>
            <div className="text-xl text-empire-rival/30 tracking-[0.3em] font-bold mt-2">REDACTED</div>
          </div>

          <button
            onClick={() => decryptIntel(node?.id)}
            className="w-full py-2.5 rounded font-mono text-[10px] tracking-widest uppercase mt-3 bg-empire-rival/10 border border-empire-rival/30 text-empire-rival hover:brightness-125 transition-all"
          >
            UNLOCK INTEL — €15K
          </button>
        </>
      )}

      {node?.owner === 'rival' && node?.intelDecrypted && (() => {
        const strikeCost = (node?.income ?? 0) * 24;
        const successPct = Math.round(20 + (power * 0.5));
        return (
          <>
            <div className="grid grid-cols-3 gap-1.5 mb-3 mt-2">
              <div className="bg-tactical-border/30 rounded p-2 text-center">
                <div className="text-[8px] text-tactical-text/50 mb-1">SECTOR</div>
                <div className="text-[9px] font-bold text-empire-rival">{node?.type?.replace('_', '/')?.toUpperCase()}</div>
              </div>
              <div className="bg-tactical-border/30 rounded p-2 text-center">
                <div className="text-[8px] text-tactical-text/50 mb-1">LEVEL</div>
                <div className="text-[9px] font-bold text-empire-rival">{node?.level ?? '—'}/5</div>
              </div>
              <div className="bg-tactical-border/30 rounded p-2 text-center">
                <div className="text-[8px] text-tactical-text/50 mb-1">INCOME</div>
                <div className="text-[9px] font-bold text-empire-rival">{fmt(node?.income ?? 0)}</div>
              </div>
            </div>

            <div className="bg-empire-rival/10 border border-empire-rival/20 rounded p-2.5 mb-3">
              <div className="text-[8px] text-tactical-text/50 uppercase tracking-widest mb-1">Strike Probability</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-tactical-border rounded overflow-hidden">
                  <div
                    className="h-full bg-empire-rival rounded transition-all"
                    style={{ width: `${successPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-empire-rival shrink-0">{successPct}%</span>
              </div>
              <div className="text-[8px] text-tactical-text/40 mt-1">Base 20% + Power axis ({power} pts × 0.5)</div>
            </div>

            <button
              onClick={() => executeCyberStrike(node?.id)}
              className="w-full py-2.5 rounded font-mono text-[10px] tracking-widest uppercase bg-empire-rival/20 border border-empire-rival/40 text-empire-rival hover:brightness-125 transition-all"
            >
              INITIATE CYBER-STRIKE — {fmt(strikeCost)}
            </button>
          </>
        );
      })()}
      </div>{/* /p-4 */}
    </div>
  );
};

export default EmpireNodeDetail;
