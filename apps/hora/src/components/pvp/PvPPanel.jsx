import { useState, useEffect } from 'react';
import { usePvPStore, NPC_TARGETS, getEloRank } from '../../store/pvpStore';
import { useEmpireStore } from '../../store/empireStore';

/**
 * PvPPanel -- Hostile takeover system panel for the left rail.
 * Displays ELO rating, NPC targets, active takeover, battle history, and defense controls.
 */
export default function PvPPanel() {
  const {
    eloRating, activeBid, defenseRating, battleHistory,
    wins, losses, poisonPillActive,
    launchTakeover, resolveTakeover, updateDefense, activatePoisonPill, getWinRate,
  } = usePvPStore();

  const personalBalance = useEmpireStore(s => s.personalBalance);
  const companyBalance = useEmpireStore(s => s.companyBalance);

  const [selectedTarget, setSelectedTarget] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [defenseInvestment, setDefenseInvestment] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Helper to deduct from company balance
  const deductBalance = (amount) => {
    const store = useEmpireStore.getState();
    if (store.companyBalance < amount) return false;
    useEmpireStore.setState({ companyBalance: store.companyBalance - amount });
    return true;
  };

  const addBalance = (amount) => {
    useEmpireStore.setState(s => ({ companyBalance: s.companyBalance + amount }));
  };

  // Countdown timer for active bids
  useEffect(() => {
    if (!activeBid || activeBid.resolved) { setCountdown(0); return; }
    const iv = setInterval(() => {
      const remaining = Math.max(0, activeBid.resolvesAt - Date.now());
      setCountdown(remaining);
      if (remaining <= 0) {
        resolveTakeover(addBalance);
        clearInterval(iv);
      }
    }, 200);
    return () => clearInterval(iv);
  }, [activeBid, resolveTakeover]);

  const handleLaunch = () => {
    if (!selectedTarget || !bidAmount) return;
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    const ok = launchTakeover(selectedTarget, amount, deductBalance);
    if (ok) {
      setBidAmount('');
      setSelectedTarget(null);
    }
  };

  const handleDefenseInvest = () => {
    const amount = parseInt(defenseInvestment, 10);
    if (isNaN(amount) || amount <= 0) return;
    updateDefense(amount, deductBalance);
    setDefenseInvestment('');
  };

  const handlePoisonPill = () => {
    activatePoisonPill(deductBalance);
  };

  const rank = getEloRank(eloRating);
  const winRate = getWinRate();
  const defenseColor =
    defenseRating >= 70 ? 'text-emerald-400' :
    defenseRating >= 50 ? 'text-amber-400' : 'text-rose-400';
  const defenseBarColor =
    defenseRating >= 70 ? 'bg-emerald-500' :
    defenseRating >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  const fmt = (n) => n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${n.toLocaleString()}`;

  return (
    <div className="space-y-3 text-tactical-text">
      {/* ELO & Record */}
      <div className="bg-[#0a1020] border border-tactical-border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-tactical-text/50 font-mono">ELO RATING</div>
            <div className="text-2xl font-mono text-[#00e5ff]">{eloRating}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-widest uppercase text-tactical-text/50 font-mono">RANK</div>
            <div className="text-sm font-mono text-amber-400">{rank}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-emerald-400">W {wins}</span>
          <span className="text-rose-400">L {losses}</span>
          <span className="text-tactical-text/60">WR {winRate}%</span>
        </div>
      </div>

      {/* Defense Status */}
      <div className="bg-[#0a1020] border border-tactical-border rounded p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-widest uppercase text-tactical-text/50 font-mono">DEFENSE RATING</span>
          <span className={`text-xs font-mono ${defenseColor}`}>{defenseRating}/100</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 mb-2">
          <div className={`h-full rounded-full ${defenseBarColor} transition-all`} style={{ width: `${defenseRating}%` }} />
        </div>
        {!poisonPillActive ? (
          <button
            onClick={handlePoisonPill}
            className="w-full py-1 rounded text-[10px] font-mono tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
          >
            ACTIVATE POISON PILL ($50,000)
          </button>
        ) : (
          <div className="text-center text-[10px] font-mono text-purple-400">POISON PILL ACTIVE</div>
        )}
        <div className="flex gap-2 mt-2">
          <input
            type="number"
            value={defenseInvestment}
            onChange={e => setDefenseInvestment(e.target.value)}
            placeholder="Amount"
            className="flex-1 bg-black/30 border border-tactical-border rounded px-2 py-1 text-[10px] font-mono text-tactical-text placeholder:text-tactical-text/30 outline-none focus:border-[#00e5ff]/40"
          />
          <button
            onClick={handleDefenseInvest}
            className="px-3 py-1 rounded text-[10px] font-mono tracking-wider bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 hover:bg-[#00e5ff]/20 transition-colors"
          >
            INVEST
          </button>
        </div>
      </div>

      {/* Active Takeover */}
      {activeBid && !activeBid.resolved && (
        <div className="bg-[#0a1020] border border-amber-500/30 rounded p-3 animate-pulse">
          <div className="text-[10px] tracking-widest uppercase text-amber-400 font-mono mb-1">ACTIVE TAKEOVER</div>
          <div className="text-xs font-mono text-tactical-text">{activeBid.targetName}</div>
          <div className="text-[10px] font-mono text-tactical-text/50">
            Bid: {fmt(activeBid.bidAmount)} | ATK: {activeBid.attackPower} vs DEF: {activeBid.defensePower}
          </div>
          <div className="text-[10px] font-mono text-amber-400 mt-1">
            Resolving in {Math.ceil(countdown / 1000)}s...
          </div>
        </div>
      )}

      {/* Last Result */}
      {activeBid && activeBid.resolved && (
        <div className={`bg-[#0a1020] border ${activeBid.won ? 'border-emerald-500/30' : 'border-rose-500/30'} rounded p-3`}>
          <div className={`text-[10px] tracking-widest uppercase font-mono mb-1 ${activeBid.won ? 'text-emerald-400' : 'text-rose-400'}`}>
            {activeBid.won ? 'TAKEOVER SUCCEEDED' : 'TAKEOVER FAILED'}
          </div>
          <div className="text-xs font-mono text-tactical-text">{activeBid.targetName}</div>
          <div className="text-[10px] font-mono text-tactical-text/50">
            ATK {activeBid.attackPower} vs DEF {activeBid.defensePower}
            {activeBid.won ? ` | +${fmt(Math.round(activeBid.bidAmount * 0.2))} premium` : ` | -${fmt(activeBid.bidAmount)} lost`}
          </div>
        </div>
      )}

      {/* Target Browser */}
      <div>
        <div className="text-[10px] tracking-widest uppercase text-tactical-text/50 font-mono mb-2">TARGET COMPANIES</div>
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
          {NPC_TARGETS.map(t => {
            const isSelected = selectedTarget?.id === t.id;
            const suggestedBid = Math.round(t.netWorth * 0.15);
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTarget(t);
                  setBidAmount(String(suggestedBid));
                }}
                className={`w-full text-left p-2 rounded border transition-colors ${
                  isSelected
                    ? 'bg-[#00e5ff]/5 border-[#00e5ff]/30'
                    : 'bg-black/20 border-tactical-border hover:border-tactical-border/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-tactical-text">{t.name}</div>
                    <div className="text-[10px] font-mono text-tactical-text/40">
                      {t.campus} / Lv.{t.level} / DEF {t.defensePower}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-tactical-text/70">{fmt(t.netWorth)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Launch Bid */}
      {selectedTarget && (
        <div className="bg-[#0a1020] border border-tactical-border rounded p-3">
          <div className="text-[10px] tracking-widest uppercase text-tactical-text/50 font-mono mb-1">LAUNCH TAKEOVER</div>
          <div className="text-xs font-mono text-tactical-text mb-2">Target: {selectedTarget.name}</div>
          <div className="flex gap-2">
            <input
              type="number"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder="Bid amount"
              className="flex-1 bg-black/30 border border-tactical-border rounded px-2 py-1 text-[10px] font-mono text-tactical-text placeholder:text-tactical-text/30 outline-none focus:border-[#00e5ff]/40"
            />
            <button
              onClick={handleLaunch}
              disabled={!!(activeBid && !activeBid.resolved)}
              className="px-3 py-1 rounded text-[10px] font-mono tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-30 transition-colors"
            >
              ATTACK
            </button>
          </div>
          <div className="text-[10px] font-mono text-tactical-text/30 mt-1">
            Balance: {fmt(companyBalance)}
          </div>
        </div>
      )}

      {/* Battle History */}
      {battleHistory.length > 0 && (
        <div>
          <div className="text-[10px] tracking-widest uppercase text-tactical-text/50 font-mono mb-2">BATTLE LOG</div>
          <div className="space-y-1 max-h-[150px] overflow-y-auto scrollbar-thin">
            {battleHistory.slice(0, 10).map((b, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1 bg-black/20 rounded text-[10px] font-mono">
                <span className="text-tactical-text/70">{b.opponentName}</span>
                <div className="flex items-center gap-2">
                  <span className={b.won ? 'text-emerald-400' : 'text-rose-400'}>
                    {b.won ? 'W' : 'L'}
                  </span>
                  <span className={b.eloChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {b.eloChange >= 0 ? '+' : ''}{b.eloChange}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
