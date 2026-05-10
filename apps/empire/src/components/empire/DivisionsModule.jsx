import React, { useState, useEffect } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { PriceFilter, applyPriceFilter } from './PriceFilter';
import AdCardInline from '../ads/AdCardInline';

const TABS = [
  { key: 'vc', label: 'VC' },
  { key: 'pe', label: 'PE' },
  { key: 'hf', label: 'HF' },
  { key: 'ib', label: 'IB' },
  { key: 'media', label: 'Media' },
  { key: 'auctions', label: 'Auctions' },
];

const STAGE_COLORS = {
  'Pre-Seed': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Seed': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Series A': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Series B': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Series C': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const RISK_COLORS = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
  extreme: 'text-red-500',
};

const TYPE_BADGE_COLORS = {
  'M&A': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'IPO': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Restructuring': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'SPAC': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Debt Issuance': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const RARITY_COLORS = {
  common: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  uncommon: 'bg-green-500/10 text-green-400 border-green-500/20',
  rare: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  epic: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  legendary: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function fmt(n) {
  if (n == null) return '---';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtTime(ms) {
  if (!ms || ms <= 0) return '00:00';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border rounded ${className}`}>
      {children}
    </span>
  );
}

function ActionButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 rounded-lg font-mono text-[9px] font-bold uppercase tracking-widest transition-colors hover:bg-[#00e5ff]/20 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {children}
    </button>
  );
}

function OwnedBadge({ children = 'OWNED' }) {
  return (
    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
      {children}
    </Badge>
  );
}

function Card({ children }) {
  return (
    <div className="bg-[#111827]/60 border border-tactical-border/20 rounded-lg p-3 space-y-2">
      {children}
    </div>
  );
}

/* =========================================================================
   VC TAB
   ========================================================================= */
function VCTab({ vcDeals, companyBalance, investVC }) {
  const [sort, setSort] = useState('default');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const filtered = applyPriceFilter(vcDeals || [], 'askAmount', sort, min, max);

  return (
    <div className="space-y-2">
      <PriceFilter sortBy={sort} setSortBy={setSort} priceMin={min} setPriceMin={setMin} priceMax={max} setPriceMax={setMax} variant="dark" label="$" />
      {filtered.length === 0 && <div className="text-tactical-text/30 text-[10px] text-center py-6 font-mono">NO VC DEALS AVAILABLE</div>}
      {filtered.map(deal => {
        const owned = deal.owned || deal.invested;
        return (
          <Card key={deal.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-white truncate">{deal.name || deal.startupName}</span>
                  {deal.sector && <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{deal.sector}</Badge>}
                </div>
                {deal.founder && <div className="text-[9px] text-tactical-text/40 mt-0.5">Founded by {deal.founder}</div>}
              </div>
              {deal.stage && <Badge className={STAGE_COLORS[deal.stage] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}>{deal.stage}</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
              <div><span className="text-tactical-text/40">ASK:</span> <span className="text-white">€{fmt(deal.askAmount)}</span></div>
              <div><span className="text-tactical-text/40">EQUITY:</span> <span className="text-white">{deal.equityOffered ?? deal.equity}%</span></div>
              {deal.traction && <div className="col-span-2"><span className="text-tactical-text/40">TRACTION:</span> <span className="text-tactical-text/70">{deal.traction}</span></div>}
              <div>
                <span className="text-tactical-text/40">RISK:</span>{' '}
                <span className={RISK_COLORS[deal.risk?.toLowerCase?.()] || 'text-tactical-text/70'}>{deal.risk || '---'}</span>
              </div>
              <div><span className="text-tactical-text/40">POTENTIAL:</span> <span className="text-emerald-400">{deal.potentialMultiple || deal.multiple}x</span></div>
              {deal.timeToExit && <div><span className="text-tactical-text/40">EXIT:</span> <span className="text-tactical-text/70">{deal.timeToExit}</span></div>}
            </div>

            <div className="flex justify-end pt-1">
              {owned ? (
                <OwnedBadge>PORTFOLIO ✓</OwnedBadge>
              ) : (
                <ActionButton onClick={() => investVC(deal.id)} disabled={companyBalance < (deal.askAmount || 0)}>
                  INVEST
                </ActionButton>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================================
   PE TAB
   ========================================================================= */
function PETab({ peTargets, companyBalance, acquirePE }) {
  const [sort, setSort] = useState('default');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const filtered = applyPriceFilter(peTargets || [], 'askingPrice', sort, min, max);

  return (
    <div className="space-y-2">
      <PriceFilter sortBy={sort} setSortBy={setSort} priceMin={min} setPriceMin={setMin} priceMax={max} setPriceMax={setMax} variant="dark" label="$" />
      {filtered.length === 0 && <div className="text-tactical-text/30 text-[10px] text-center py-6 font-mono">NO PE TARGETS AVAILABLE</div>}
      {filtered.map(target => {
        const owned = target.owned || target.acquired;
        return (
          <Card key={target.id}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-mono font-bold text-white truncate">{target.name}</span>
              {target.sector && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">{target.sector}</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
              <div><span className="text-tactical-text/40">REVENUE:</span> <span className="text-white">€{fmt(target.revenue)}</span></div>
              <div><span className="text-tactical-text/40">EBITDA:</span> <span className="text-white">€{fmt(target.ebitda)}</span></div>
              <div><span className="text-tactical-text/40">ASK PRICE:</span> <span className="text-[#00e5ff]">€{fmt(target.askingPrice)}</span></div>
              <div><span className="text-tactical-text/40">EMPLOYEES:</span> <span className="text-white">{target.employeeCount?.toLocaleString?.() || target.employees || '---'}</span></div>
              {target.improvementPotential && (
                <div className="col-span-2"><span className="text-tactical-text/40">UPSIDE:</span> <span className="text-tactical-text/70">{target.improvementPotential}</span></div>
              )}
              <div>
                <span className="text-tactical-text/40">RISK:</span>{' '}
                <span className={RISK_COLORS[target.risk?.toLowerCase?.()] || 'text-tactical-text/70'}>{target.risk || '---'}</span>
              </div>
              <div><span className="text-tactical-text/40">EXIT MULT:</span> <span className="text-emerald-400">{target.targetExitMultiple || target.exitMultiple}x</span></div>
              {target.holdPeriod && <div><span className="text-tactical-text/40">HOLD:</span> <span className="text-tactical-text/70">{target.holdPeriod}</span></div>}
            </div>

            <div className="flex items-center justify-between pt-1">
              {owned && target.monthlyEbitda != null && (
                <div className="text-[9px] font-mono text-emerald-400/70">+€{fmt(target.monthlyEbitda)}/mo EBITDA</div>
              )}
              <div className="ml-auto">
                {owned ? (
                  <OwnedBadge>ACQUIRED ✓</OwnedBadge>
                ) : (
                  <ActionButton onClick={() => acquirePE(target.id)} disabled={companyBalance < (target.askingPrice || 0)}>
                    ACQUIRE
                  </ActionButton>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================================
   HF TAB
   ========================================================================= */
function HFTab({ hfStrategies, companyBalance, allocateHF }) {
  const [sort, setSort] = useState('default');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [amounts, setAmounts] = useState({});

  const filtered = applyPriceFilter(hfStrategies || [], 'minCapital', sort, min, max);

  const handleAllocate = (id) => {
    const amt = parseInt(amounts[id], 10);
    if (amt > 0) {
      allocateHF(id, amt);
      setAmounts(prev => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <div className="space-y-2">
      <PriceFilter sortBy={sort} setSortBy={setSort} priceMin={min} setPriceMin={setMin} priceMax={max} setPriceMax={setMax} variant="dark" label="$" />
      {filtered.length === 0 && <div className="text-tactical-text/30 text-[10px] text-center py-6 font-mono">NO HF STRATEGIES AVAILABLE</div>}
      {filtered.map(strat => {
        const active = strat.active || (strat.capitalAllocated > 0);
        return (
          <Card key={strat.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-white truncate">{strat.name}</span>
                  {strat.type && <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">{strat.type}</Badge>}
                </div>
              </div>
              {active && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">ACTIVE</Badge>}
            </div>

            {strat.description && <div className="text-[9px] font-mono text-tactical-text/50 leading-relaxed">{strat.description}</div>}

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
              <div><span className="text-tactical-text/40">MIN CAPITAL:</span> <span className="text-[#00e5ff]">€{fmt(strat.minCapital)}</span></div>
              <div><span className="text-tactical-text/40">EXP RETURN:</span> <span className="text-emerald-400">{strat.expectedReturn ?? '---'}%</span></div>
              <div><span className="text-tactical-text/40">VOLATILITY:</span> <span className="text-amber-400">{strat.volatility ?? '---'}%</span></div>
              <div><span className="text-tactical-text/40">SHARPE:</span> <span className="text-white">{strat.sharpeRatio ?? strat.sharpe ?? '---'}</span></div>
              <div className="col-span-2">
                <span className="text-tactical-text/40">FEES:</span>{' '}
                <span className="text-tactical-text/70">
                  {strat.managementFee ?? strat.mgmtFee ?? '---'}% mgmt / {strat.performanceFee ?? strat.perfFee ?? '---'}% perf
                </span>
              </div>
              {active && strat.capitalAllocated != null && (
                <div className="col-span-2">
                  <span className="text-tactical-text/40">DEPLOYED:</span>{' '}
                  <span className="text-emerald-400">€{fmt(strat.capitalAllocated)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                placeholder={`Min €${fmt(strat.minCapital)}`}
                value={amounts[strat.id] || ''}
                onChange={e => setAmounts(prev => ({ ...prev, [strat.id]: e.target.value }))}
                className="flex-1 bg-[#0a0e18] border border-tactical-border/20 rounded px-2 py-1 text-[9px] font-mono text-white placeholder:text-tactical-text/25 outline-none focus:border-[#00e5ff]/40"
              />
              <ActionButton
                onClick={() => handleAllocate(strat.id)}
                disabled={
                  !amounts[strat.id] ||
                  parseInt(amounts[strat.id], 10) < (strat.minCapital || 0) ||
                  parseInt(amounts[strat.id], 10) > companyBalance
                }
              >
                ALLOCATE
              </ActionButton>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================================
   IB TAB
   ========================================================================= */
function IBTab({ ibDeals, companyBalance, startIBDeal }) {
  const [sort, setSort] = useState('default');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const filtered = applyPriceFilter(ibDeals || [], 'dealSize', sort, min, max);

  return (
    <div className="space-y-2">
      <PriceFilter sortBy={sort} setSortBy={setSort} priceMin={min} setPriceMin={setMin} priceMax={max} setPriceMax={setMax} variant="dark" label="$" />
      {filtered.length === 0 && <div className="text-tactical-text/30 text-[10px] text-center py-6 font-mono">NO IB DEALS IN PIPELINE</div>}
      {filtered.map(deal => {
        const inProgress = deal.inProgress || deal.engaged;
        const setupCost = Math.round((deal.dealSize || 0) * 0.001);
        const advisoryFeeAmt = Math.round((deal.dealSize || 0) * ((deal.advisoryFee || deal.feePercent || 0) / 100));
        const typeStyle = TYPE_BADGE_COLORS[deal.type] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

        return (
          <Card key={deal.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-white truncate">{deal.name}</span>
                  {deal.type && <Badge className={typeStyle}>{deal.type}</Badge>}
                </div>
                {deal.client && <div className="text-[9px] text-tactical-text/40 mt-0.5">Client: {deal.client}</div>}
              </div>
              {deal.complexity && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">{deal.complexity}</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
              <div><span className="text-tactical-text/40">DEAL SIZE:</span> <span className="text-white">€{fmt(deal.dealSize)}</span></div>
              <div>
                <span className="text-tactical-text/40">ADV FEE:</span>{' '}
                <span className="text-emerald-400">{deal.advisoryFee || deal.feePercent}% (€{fmt(advisoryFeeAmt)})</span>
              </div>
              <div><span className="text-tactical-text/40">DURATION:</span> <span className="text-tactical-text/70">{deal.duration || '---'}</span></div>
              <div><span className="text-tactical-text/40">REP PTS:</span> <span className="text-[#00e5ff]">+{deal.reputationPoints ?? deal.repGain ?? '---'}</span></div>
              <div><span className="text-tactical-text/40">SETUP COST:</span> <span className="text-rose-400">€{fmt(setupCost)}</span></div>
            </div>

            <div className="flex justify-end pt-1">
              {inProgress ? (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">IN PROGRESS</Badge>
              ) : (
                <ActionButton onClick={() => startIBDeal(deal.id)} disabled={companyBalance < setupCost}>
                  ENGAGE
                </ActionButton>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================================
   MEDIA TAB
   ========================================================================= */
function MediaTab({ mediaOutlets, companyBalance, acquireMedia }) {
  const [sort, setSort] = useState('default');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const filtered = applyPriceFilter(mediaOutlets || [], 'acquisitionCost', sort, min, max);

  return (
    <div className="space-y-2">
      <PriceFilter sortBy={sort} setSortBy={setSort} priceMin={min} setPriceMin={setMin} priceMax={max} setPriceMax={setMax} variant="dark" label="$" />
      {filtered.length === 0 && <div className="text-tactical-text/30 text-[10px] text-center py-6 font-mono">NO MEDIA OUTLETS AVAILABLE</div>}
      {filtered.map(outlet => {
        const owned = outlet.owned || outlet.acquired;
        return (
          <Card key={outlet.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-white truncate">{outlet.name}</span>
                {outlet.type && <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20">{outlet.type}</Badge>}
              </div>
            </div>

            {outlet.description && <div className="text-[9px] font-mono text-tactical-text/50 leading-relaxed">{outlet.description}</div>}

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
              <div><span className="text-tactical-text/40">REACH:</span> <span className="text-white">{fmt(outlet.reach)}M</span></div>
              <div><span className="text-tactical-text/40">MONTHLY REV:</span> <span className="text-emerald-400">€{fmt(outlet.monthlyRevenue)}</span></div>
              <div><span className="text-tactical-text/40">ACQ COST:</span> <span className="text-[#00e5ff]">€{fmt(outlet.acquisitionCost)}</span></div>
              <div>
                <span className="text-tactical-text/40">INFLUENCE:</span>{' '}
                <span className="text-amber-400">{outlet.influenceScore ?? outlet.influence ?? '---'}</span>
                {(outlet.influenceScore != null || outlet.influence != null) && (
                  <div className="mt-0.5 w-full h-1 bg-tactical-border/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400/60 rounded-full"
                      style={{ width: `${Math.min((outlet.influenceScore ?? outlet.influence ?? 0) * 10, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              {owned ? (
                <OwnedBadge>OWNED ✓</OwnedBadge>
              ) : (
                <ActionButton onClick={() => acquireMedia(outlet.id)} disabled={companyBalance < (outlet.acquisitionCost || 0)}>
                  ACQUIRE
                </ActionButton>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================================
   AUCTIONS TAB
   ========================================================================= */
function AuctionsTab({ auctionItems, personalBalance, placeBid }) {
  const [sort, setSort] = useState('default');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [bids, setBids] = useState({});
  const [, setTick] = useState(0);

  // Tick every 30s to update timers
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const filtered = applyPriceFilter(auctionItems || [], 'estimatedValue', sort, min, max);

  const handleBid = (id) => {
    const amt = parseInt(bids[id], 10);
    if (amt > 0) {
      placeBid(id, amt);
      setBids(prev => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <div className="space-y-2">
      <PriceFilter sortBy={sort} setSortBy={setSort} priceMin={min} setPriceMin={setMin} priceMax={max} setPriceMax={setMax} variant="dark" label="$" />
      {filtered.length === 0 && <div className="text-tactical-text/30 text-[10px] text-center py-6 font-mono">NO AUCTION ITEMS AVAILABLE</div>}
      {filtered.map(item => {
        const won = item.won || item.owned;
        const currentBid = item.currentBid || 0;
        const increment = item.increment || Math.max(Math.round(currentBid * 0.05), 1000);
        const minBid = currentBid + increment;
        const timeLeft = item.endsAt ? item.endsAt - Date.now() : item.timeRemaining;
        const rarityStyle = RARITY_COLORS[item.rarity?.toLowerCase?.()] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

        return (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-white truncate">{item.name}</span>
                {item.category && <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{item.category}</Badge>}
                {item.rarity && <Badge className={rarityStyle}>{item.rarity}</Badge>}
              </div>
              {won && <OwnedBadge>WON ✓</OwnedBadge>}
            </div>

            {item.emoji && <div className="text-3xl text-center py-1">{item.emoji}</div>}

            {item.description && <div className="text-[9px] font-mono text-tactical-text/50 leading-relaxed">{item.description}</div>}
            {item.provenance && <div className="text-[8px] font-mono text-tactical-text/30 italic">{item.provenance}</div>}

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
              <div><span className="text-tactical-text/40">EST VALUE:</span> <span className="text-white">€{fmt(item.estimatedValue)}</span></div>
              <div><span className="text-tactical-text/40">CURRENT BID:</span> <span className="text-[#00e5ff]">€{fmt(currentBid)}</span></div>
              <div><span className="text-tactical-text/40">MIN NEXT:</span> <span className="text-amber-400">€{fmt(minBid)}</span></div>
              {timeLeft != null && timeLeft > 0 && (
                <div>
                  <span className="text-tactical-text/40">ENDS IN:</span>{' '}
                  <span className={`${timeLeft < 3600000 ? 'text-rose-400' : 'text-tactical-text/70'}`}>{fmtTime(timeLeft)}</span>
                </div>
              )}
            </div>

            {!won && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  placeholder={`Min €${fmt(minBid)}`}
                  value={bids[item.id] || ''}
                  onChange={e => setBids(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="flex-1 bg-[#0a0e18] border border-tactical-border/20 rounded px-2 py-1 text-[9px] font-mono text-white placeholder:text-tactical-text/25 outline-none focus:border-[#00e5ff]/40"
                />
                <ActionButton
                  onClick={() => handleBid(item.id)}
                  disabled={
                    !bids[item.id] ||
                    parseInt(bids[item.id], 10) < minBid ||
                    parseInt(bids[item.id], 10) > personalBalance
                  }
                >
                  PLACE BID
                </ActionButton>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================================
   MAIN DIVISIONS MODULE
   ========================================================================= */
export default function DivisionsModule() {
  const [activeTab, setActiveTab] = useState('vc');

  const vcDeals = useEmpireStore(s => s.vcDeals);
  const peTargets = useEmpireStore(s => s.peTargets);
  const hfStrategies = useEmpireStore(s => s.hfStrategies);
  const ibDeals = useEmpireStore(s => s.ibDeals);
  const mediaOutlets = useEmpireStore(s => s.mediaOutlets);
  const auctionItems = useEmpireStore(s => s.auctionItems);
  const companyBalance = useEmpireStore(s => s.companyBalance);
  const personalBalance = useEmpireStore(s => s.personalBalance);
  const investVC = useEmpireStore(s => s.investVC);
  const acquirePE = useEmpireStore(s => s.acquirePE);
  const allocateHF = useEmpireStore(s => s.allocateHF);
  const startIBDeal = useEmpireStore(s => s.startIBDeal);
  const acquireMedia = useEmpireStore(s => s.acquireMedia);
  const placeBid = useEmpireStore(s => s.placeBid);

  const renderTab = () => {
    switch (activeTab) {
      case 'vc':
        return <VCTab vcDeals={vcDeals} companyBalance={companyBalance} investVC={investVC} />;
      case 'pe':
        return <PETab peTargets={peTargets} companyBalance={companyBalance} acquirePE={acquirePE} />;
      case 'hf':
        return <HFTab hfStrategies={hfStrategies} companyBalance={companyBalance} allocateHF={allocateHF} />;
      case 'ib':
        return <IBTab ibDeals={ibDeals} companyBalance={companyBalance} startIBDeal={startIBDeal} />;
      case 'media':
        return <MediaTab mediaOutlets={mediaOutlets} companyBalance={companyBalance} acquireMedia={acquireMedia} />;
      case 'auctions':
        return <AuctionsTab auctionItems={auctionItems} personalBalance={personalBalance} placeBid={placeBid} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full font-mono">
      {/* Inner Tab Bar */}
      <div className="bg-[#0a0e18] border border-tactical-border/20 rounded-lg p-0.5 flex gap-0.5 mb-3 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30'
                : 'text-tactical-text/40 hover:text-tactical-text/60 hover:bg-tactical-border/5 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content (scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5">
        {renderTab()}
      </div>

      <AdCardInline variant="wide" />
    </div>
  );
}
