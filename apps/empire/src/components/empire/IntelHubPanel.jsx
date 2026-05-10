import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import AdCardInline from '../ads/AdCardInline';

// ── Formatting helpers ─────────────────────────────────────────────
const fmtPrice = (n) => {
  if (n >= 10000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 100)   return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)     return n.toFixed(3);
  return n.toFixed(5);
};
const fmtMoney = (n) =>
  n >= 1e9  ? `€${(n/1e9).toFixed(2)}B` :
  n >= 1e6  ? `€${(n/1e6).toFixed(2)}M` :
  n >= 1e3  ? `€${(n/1e3).toFixed(1)}K` :
  `€${Math.round(n)}`;

const TYPE_COLOR = {
  stock:     '#00e5ff',
  crypto:    '#f59e0b',
  forex:     '#10b981',
  commodity: '#a78bfa',
  bond:      '#6366f1',
};

const TYPE_LABELS = ['all', 'stock', 'crypto', 'forex', 'commodity', 'bond'];

// ── Ticker sparkline (micro price history) ─────────────────────────
function Spark({ history, color }) {
  if (!history || history.length < 2) return null;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const w = 56, h = 20;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── Trade modal ────────────────────────────────────────────────────
function TradeModal({ instrument, livePrice, onClose }) {
  const companyBalance = useEmpireStore(s => s.companyBalance);
  const portfolio      = useEmpireStore(s => s.portfolio);
  const buyInstrument  = useEmpireStore(s => s.buyInstrument);
  const sellInstrument = useEmpireStore(s => s.sellInstrument);

  const [qty, setQty] = useState('1');
  const [side, setSide] = useState('buy');

  const pos = portfolio[instrument.id];
  const quantity = Math.max(0, parseFloat(qty) || 0);
  const total = quantity * livePrice;
  const canBuy = side === 'buy' && quantity > 0 && total <= companyBalance;
  const canSell = side === 'sell' && quantity > 0 && pos && pos.quantity >= quantity;
  const canExecute = side === 'buy' ? canBuy : canSell;

  const pnlIfSell = pos ? (livePrice - pos.avgCost) * quantity : 0;
  const c = TYPE_COLOR[instrument.type] || '#9ca3af';

  const execute = () => {
    if (side === 'buy') {
      buyInstrument(instrument.id, instrument.symbol, instrument.name, instrument.type, livePrice, quantity);
    } else {
      sellInstrument(instrument.id, livePrice, quantity);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6,10,18,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-80 rounded-xl font-mono overflow-hidden"
        style={{ background: 'rgba(8,14,26,0.99)', border: `1px solid ${c}30`, boxShadow: `0 0 32px ${c}12` }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: `${c}20` }}>
          <div>
            <span className="text-[11px] font-bold" style={{ color: c }}>{instrument.symbol}</span>
            <span className="text-[9px] text-tactical-text/50 ml-2">{instrument.name}</span>
          </div>
          <button onClick={onClose} aria-label="Close instrument details" className="text-tactical-text/40 hover:text-tactical-text text-xs">✕</button>
        </div>

        <div className="p-4">
          {/* Live price */}
          <div className="text-center mb-4">
            <div className="text-[22px] font-bold" style={{ color: c }}>€{fmtPrice(livePrice)}</div>
            <div className="text-[9px] text-tactical-text/50 mt-1">
              {instrument.change24h >= 0 ? '+' : ''}{instrument.change24h.toFixed(2)}% 24h
            </div>
          </div>

          {/* Side toggle */}
          <div className="flex mb-3 rounded overflow-hidden border border-[#ffffff12]">
            {['buy', 'sell'].map(s => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className="flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all"
                style={{
                  background: side === s
                    ? s === 'buy' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
                    : 'transparent',
                  color: side === s
                    ? s === 'buy' ? '#10b981' : '#ef4444'
                    : '#4b5563',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div className="mb-3">
            <div className="text-[8px] text-tactical-text/40 mb-1 uppercase tracking-widest">Quantity</div>
            <div className="flex gap-2 mb-1.5">
              {[1, 5, 10, 25].map(n => (
                <button
                  key={n}
                  onClick={() => setQty(String(n))}
                  className="flex-1 py-1 rounded text-[9px] border transition-all hover:brightness-125"
                  style={{ borderColor: '#ffffff15', backgroundColor: '#ffffff08', color: '#9ca3af' }}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={qty}
              min="0"
              onChange={e => setQty(e.target.value)}
              className="w-full rounded px-3 py-2 text-[12px] font-bold outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            />
          </div>

          {/* Position info */}
          {pos && (
            <div className="mb-3 rounded p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex justify-between text-[9px]">
                <span className="text-tactical-text/40">Position</span>
                <span className="text-tactical-text">{pos.quantity} × {pos.symbol}</span>
              </div>
              <div className="flex justify-between text-[9px] mt-1">
                <span className="text-tactical-text/40">Avg cost</span>
                <span className="text-tactical-text">€{fmtPrice(pos.avgCost)}</span>
              </div>
              {side === 'sell' && quantity > 0 && (
                <div className="flex justify-between text-[9px] mt-1">
                  <span className="text-tactical-text/40">P&L if sold</span>
                  <span style={{ color: pnlIfSell >= 0 ? '#10b981' : '#ef4444' }}>
                    {pnlIfSell >= 0 ? '+' : ''}{fmtMoney(pnlIfSell)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] text-tactical-text/50">Total</span>
            <span className="text-[13px] font-bold text-[#e2e8f0]">{fmtMoney(total)}</span>
          </div>

          {side === 'buy' && total > companyBalance && (
            <div className="text-[9px] text-[#ef4444] mb-2 text-center">Insufficient company balance</div>
          )}
          {side === 'sell' && pos && quantity > pos.quantity && (
            <div className="text-[9px] text-[#ef4444] mb-2 text-center">Cannot sell more than you hold</div>
          )}

          <button
            onClick={execute}
            disabled={!canExecute}
            className="w-full py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all"
            style={{
              background: canExecute
                ? side === 'buy' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
                : 'rgba(255,255,255,0.03)',
              border: canExecute
                ? side === 'buy' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)'
                : '1px solid rgba(255,255,255,0.06)',
              color: canExecute
                ? side === 'buy' ? '#10b981' : '#ef4444'
                : '#374151',
              cursor: canExecute ? 'pointer' : 'not-allowed',
            }}
          >
            {side === 'buy' ? `Buy ${quantity || 0} × ${instrument.symbol}` : `Sell ${quantity || 0} × ${instrument.symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Instrument row ─────────────────────────────────────────────────
function InstrumentRow({ instrument, livePrice, history, onTrade }) {
  const portfolio = useEmpireStore(s => s.portfolio);
  const pos = portfolio[instrument.id];
  const c = TYPE_COLOR[instrument.type] || '#9ca3af';
  const change = ((livePrice - instrument.price) / instrument.price) * 100;
  const isUp = change >= 0;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-[#ffffff06] hover:bg-[#ffffff05] cursor-pointer transition-all group"
      onClick={() => onTrade(instrument)}
    >
      {/* Symbol + type badge */}
      <div className="w-20 shrink-0">
        <div className="text-[10px] font-bold" style={{ color: c }}>{instrument.symbol}</div>
        <div className="text-[8px] mt-0.5 px-1 py-0.5 rounded inline-block" style={{ backgroundColor: `${c}15`, color: c }}>
          {instrument.type}
        </div>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-tactical-text/70 truncate">{instrument.name}</div>
        {pos && (
          <div className="text-[8px] mt-0.5" style={{ color: '#f59e0b' }}>
            ↳ {pos.quantity} held
          </div>
        )}
      </div>

      {/* Sparkline */}
      <div className="shrink-0 w-14">
        <Spark history={history} color={isUp ? '#10b981' : '#ef4444'} />
      </div>

      {/* Price + change */}
      <div className="w-28 text-right shrink-0">
        <div className="text-[11px] font-bold font-mono text-tactical-text">€{fmtPrice(livePrice)}</div>
        <div className="text-[9px] font-mono mt-0.5" style={{ color: isUp ? '#10b981' : '#ef4444' }}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </div>
      </div>

      {/* Market cap */}
      {instrument.marketCapB && (
        <div className="w-16 text-right shrink-0 hidden xl:block">
          <div className="text-[8px] text-tactical-text/40">${instrument.marketCapB}B</div>
        </div>
      )}

      {/* Trade button */}
      <div className="w-12 text-right shrink-0">
        <span
          className="text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all"
          style={{ background: `${c}20`, color: c, border: `1px solid ${c}30` }}
        >
          TRADE
        </span>
      </div>
    </div>
  );
}

// ── Portfolio tab ──────────────────────────────────────────────────
function PortfolioTab({ livePrices }) {
  const portfolio      = useEmpireStore(s => s.portfolio);
  const sellInstrument = useEmpireStore(s => s.sellInstrument);
  const [selected, setSelected] = useState(null);

  const positions = Object.entries(portfolio).map(([id, pos]) => {
    const lp = livePrices[id] ?? pos.avgCost;
    const currentValue = pos.quantity * lp;
    const costBasis = pos.quantity * pos.avgCost;
    const pnl = currentValue - costBasis;
    const pnlPct = (pnl / costBasis) * 100;
    return { id, ...pos, livePrice: lp, currentValue, costBasis, pnl, pnlPct };
  });

  const totalValue    = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalCost     = positions.reduce((s, p) => s + p.costBasis,   0);
  const totalPnl      = totalValue - totalCost;
  const totalPnlPct   = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const instr = selected ? ALL_INSTRUMENTS.find(i => i.id === selected) : null;

  if (positions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <div className="text-[32px] mb-3 opacity-20">📊</div>
        <div className="text-[11px] text-tactical-text/50 mb-1">No open positions</div>
        <div className="text-[9px] text-tactical-text/30">Go to the MARKETS tab to trade financial instruments</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px border-b border-[#ffffff08] shrink-0" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {[
          { label: 'PORTFOLIO VALUE', value: fmtMoney(totalValue), color: '#00e5ff' },
          { label: 'TOTAL P&L', value: `${totalPnl >= 0 ? '+' : ''}${fmtMoney(totalPnl)}`, color: totalPnl >= 0 ? '#10b981' : '#ef4444' },
          { label: 'RETURN', value: `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`, color: totalPnlPct >= 0 ? '#10b981' : '#ef4444' },
        ].map(item => (
          <div key={item.label} className="px-5 py-3">
            <div className="text-[8px] text-tactical-text/40 uppercase tracking-widest mb-1">{item.label}</div>
            <div className="text-[16px] font-bold font-mono" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Positions list */}
      <div className="flex-1 overflow-y-auto">
        {/* Table header */}
        <div className="flex items-center px-4 py-2 text-[8px] text-tactical-text/30 uppercase tracking-widest border-b border-[#ffffff06] sticky top-0 bg-[#060a12]">
          <div className="w-20">Symbol</div>
          <div className="flex-1">Name</div>
          <div className="w-16 text-right">Qty</div>
          <div className="w-24 text-right">Avg Cost</div>
          <div className="w-24 text-right">Live Price</div>
          <div className="w-24 text-right">P&L</div>
          <div className="w-16 text-right">Return</div>
          <div className="w-14 text-right"></div>
        </div>

        {positions.map(pos => {
          const c = TYPE_COLOR[pos.instrumentType] || '#9ca3af';
          return (
            <div
              key={pos.id}
              className="flex items-center px-4 py-3 border-b border-[#ffffff06] hover:bg-[#ffffff03] transition-all"
            >
              <div className="w-20">
                <span className="text-[10px] font-bold" style={{ color: c }}>{pos.symbol}</span>
              </div>
              <div className="flex-1 text-[9px] text-tactical-text/60 truncate pr-2">{pos.name}</div>
              <div className="w-16 text-right text-[10px] font-mono text-tactical-text">{pos.quantity}</div>
              <div className="w-24 text-right text-[10px] font-mono text-tactical-text/60">€{fmtPrice(pos.avgCost)}</div>
              <div className="w-24 text-right text-[10px] font-mono text-tactical-text">€{fmtPrice(pos.livePrice)}</div>
              <div className="w-24 text-right text-[10px] font-bold font-mono" style={{ color: pos.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                {pos.pnl >= 0 ? '+' : ''}{fmtMoney(pos.pnl)}
              </div>
              <div className="w-16 text-right text-[9px] font-mono" style={{ color: pos.pnlPct >= 0 ? '#10b981' : '#ef4444' }}>
                {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(1)}%
              </div>
              <div className="w-14 text-right">
                <button
                  onClick={() => setSelected(pos.id)}
                  className="text-[8px] px-2 py-1 rounded transition-all hover:brightness-125"
                  style={{ background: `${c}15`, color: c, border: `1px solid ${c}25` }}
                >
                  TRADE
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected && instr && (
        <TradeModal
          instrument={instr}
          livePrice={livePrices[selected] ?? instr.price}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Intel tab ──────────────────────────────────────────────────────
function IntelTab() {
  const nodes   = useEmpireStore(s => s.nodes);
  const heat    = useEmpireStore(s => s.heat);
  const power   = useEmpireStore(s => s.power);
  const growth  = useEmpireStore(s => s.growth);
  const athenaRegime = useEmpireStore(s => s.athenaRegime);
  const athenaScore  = useEmpireStore(s => s.athenaScore);

  const nodeList = Object.values(nodes);
  const playerNodes = nodeList.filter(n => n.owner === 'player');
  const rivalNodes  = nodeList.filter(n => n.owner === 'rival');
  const marketNodes = nodeList.filter(n => n.owner === 'market');

  // Sector breakdown
  const sectorIncome = {};
  playerNodes.filter(n => n.status === 'operational').forEach(n => {
    sectorIncome[n.type] = (sectorIncome[n.type] ?? 0) + n.income;
  });
  const sectorEntries = Object.entries(sectorIncome).sort((a, b) => b[1] - a[1]);
  const totalIncome = sectorEntries.reduce((s, [, v]) => s + v, 0);

  const SECTOR_COLORS = {
    finance: '#00e5ff', tech: '#7c3aed', oil_gas: '#f59e0b',
    manufacturing: '#6366f1', energy: '#10b981', pharma: '#ec4899', venue: '#a78bfa',
  };

  const regimeColor = athenaRegime === 'risk-on' ? '#10b981' : athenaRegime === 'risk-off' ? '#ef4444' : '#f59e0b';

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Macro overlay */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg p-4" style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)' }}>
          <div className="text-[8px] text-tactical-text/40 uppercase tracking-widest mb-2">ATHENA Macro Regime</div>
          <div className="text-[20px] font-bold uppercase tracking-wide" style={{ color: regimeColor }}>
            {athenaRegime}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded overflow-hidden bg-tactical-border">
              <div className="h-full rounded transition-all" style={{ width: `${athenaScore}%`, background: regimeColor }} />
            </div>
            <span className="text-[9px] font-mono" style={{ color: regimeColor }}>Risk {athenaScore}</span>
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <div className="text-[8px] text-tactical-text/40 uppercase tracking-widest mb-2">Threat Assessment</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[8px] text-tactical-text/40 mb-1">Heat Level</div>
              <div className="text-[16px] font-bold" style={{ color: heat > 60 ? '#ef4444' : heat > 30 ? '#f59e0b' : '#10b981' }}>
                {heat}/100
              </div>
            </div>
            <div>
              <div className="text-[8px] text-tactical-text/40 mb-1">Power Axis</div>
              <div className="text-[16px] font-bold text-[#a78bfa]">{power}/100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Node coverage */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'PLAYER NODES', count: playerNodes.length, color: '#10b981', icon: '🟢' },
          { label: 'RIVAL NODES',  count: rivalNodes.length,  color: '#ef4444', icon: '🔴' },
          { label: 'AVAILABLE',    count: marketNodes.length, color: '#f59e0b', icon: '🟡' },
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
            <div className="text-[20px] mb-1">{item.icon}</div>
            <div className="text-[22px] font-bold" style={{ color: item.color }}>{item.count}</div>
            <div className="text-[7px] text-tactical-text/40 uppercase tracking-widest mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Sector income breakdown */}
      {sectorEntries.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] text-tactical-text/40 uppercase tracking-widest mb-3">Revenue by Sector</div>
          {sectorEntries.map(([sector, income]) => {
            const c = SECTOR_COLORS[sector] || '#64748b';
            const pct = totalIncome > 0 ? (income / totalIncome) * 100 : 0;
            return (
              <div key={sector} className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: c }}>
                    {sector.replace('_', ' & ')}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] text-tactical-text/40">{pct.toFixed(1)}%</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: c }}>{fmtMoney(income)}/mo</span>
                  </div>
                </div>
                <div className="h-1 bg-tactical-border rounded overflow-hidden">
                  <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, background: c }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decrypted rival intel */}
      {rivalNodes.some(n => n.intelDecrypted) && (
        <div>
          <div className="text-[9px] text-tactical-text/40 uppercase tracking-widest mb-3">Decrypted Rival Intel</div>
          {rivalNodes.filter(n => n.intelDecrypted).map(node => {
            const c = SECTOR_COLORS[node.type] || '#64748b';
            const strikeCost = node.income * 24;
            const successPct = Math.round(20 + (power * 0.5));
            return (
              <div key={node.id} className="rounded-lg p-3 mb-2" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] px-1.5 py-0.5 rounded uppercase" style={{ background: `${c}20`, color: c }}>{node.type.replace('_', '/')}</span>
                    <span className="text-[10px] font-bold text-tactical-text">{node.name}</span>
                  </div>
                  <span className="text-[9px] font-mono text-empire-rival">{fmtMoney(node.income)}/mo</span>
                </div>
                <div className="flex justify-between text-[8px] text-tactical-text/40">
                  <span>Strike cost: {fmtMoney(strikeCost)}</span>
                  <span>Success: {successPct}%</span>
                  <span>Lv.{node.level}/5</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Market opportunities */}
      <div className="mt-4">
        <div className="text-[9px] text-tactical-text/40 uppercase tracking-widest mb-3">Top Market Opportunities</div>
        {marketNodes
          .sort((a, b) => (b.income * 2.5) - (a.income * 2.5))
          .slice(0, 5)
          .map(node => {
            const c = SECTOR_COLORS[node.type] || '#64748b';
            return (
              <div key={node.id} className="flex items-center gap-3 rounded p-2 mb-1.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                <div className="flex-1 text-[9px] text-tactical-text/70 truncate">{node.name}</div>
                <div className="text-[8px]" style={{ color: c }}>{node.type.replace('_', '/')}</div>
                <div className="text-[9px] font-mono text-[#f59e0b]">{fmtMoney(node.capex ?? 0)}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Main IntelHubPanel ─────────────────────────────────────────────
export default function IntelHubPanel({ onClose }) {
  const [activeTab, setActiveTab]       = useState('markets');
  const [typeFilter, setTypeFilter]     = useState('all');
  const [searchQ, setSearchQ]           = useState('');
  const [sortBy, setSortBy]             = useState('change');
  const [tradeInstrument, setTradeInstrument] = useState(null);

  // Live price simulation: seed from instruments.ts, drift every 2s
  const [livePrices, setLivePrices] = useState(() =>
    Object.fromEntries(ALL_INSTRUMENTS.map(i => [i.id, i.price]))
  );
  const [priceHistory, setPriceHistory] = useState(() =>
    Object.fromEntries(ALL_INSTRUMENTS.map(i => [i.id, [i.price]]))
  );
  // Ref so the interval can read the latest prices without being in its dep array
  const livePricesRef = useRef(livePrices);
  useEffect(() => { livePricesRef.current = livePrices; }, [livePrices]);

  useEffect(() => {
    const tick = setInterval(() => {
      const prev = livePricesRef.current;
      const next = { ...prev };
      ALL_INSTRUMENTS.forEach(inst => {
        const bias = inst.change24h / 100;
        const drift = (Math.random() - 0.499 + bias * 0.1) * 0.002;
        next[inst.id] = Math.max(0.000001, prev[inst.id] * (1 + drift));
      });
      setLivePrices(next);
      setPriceHistory(h => {
        const nh = { ...h };
        ALL_INSTRUMENTS.forEach(inst => {
          nh[inst.id] = [...(h[inst.id] ?? []), next[inst.id]].slice(-24);
        });
        return nh;
      });
    }, 2000);
    return () => clearInterval(tick);
  }, []); // stable — reads via ref

  // Filtered + sorted instruments
  const displayed = useMemo(() => {
    let list = ALL_INSTRUMENTS;
    if (typeFilter !== 'all') list = list.filter(i => i.type === typeFilter);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(i =>
        i.symbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        (i.sector ?? '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'change') {
      list = [...list].sort((a, b) => {
        const ca = ((livePrices[a.id] - a.price) / a.price);
        const cb = ((livePrices[b.id] - b.price) / b.price);
        return cb - ca;
      });
    } else if (sortBy === 'price') {
      list = [...list].sort((a, b) => (livePrices[b.id] ?? b.price) - (livePrices[a.id] ?? a.price));
    } else if (sortBy === 'mcap') {
      list = [...list].sort((a, b) => (b.marketCapB ?? 0) - (a.marketCapB ?? 0));
    }
    return list;
  }, [typeFilter, searchQ, sortBy, livePrices]);

  const portfolio = useEmpireStore(s => s.portfolio);
  const positionCount = Object.keys(portfolio).length;

  const TABS = [
    { id: 'markets',   label: 'MARKETS' },
    { id: 'portfolio', label: `PORTFOLIO${positionCount > 0 ? ` (${positionCount})` : ''}` },
    { id: 'intel',     label: 'INTEL' },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(6,10,18,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative flex flex-col font-mono overflow-hidden"
        style={{
          width: '1040px',
          maxHeight: '90vh',
          background: 'rgba(6,10,18,0.99)',
          border: '1px solid rgba(245,158,11,0.18)',
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: 'rgba(245,158,11,0.12)', background: 'rgba(245,158,11,0.03)' }}
        >
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[12px] font-bold text-[#f59e0b] tracking-[0.2em]">INTEL HUB</span>
              <span className="ml-3 text-[9px] text-tactical-text/40 tracking-widest">MARKET INTELLIGENCE & ANALYTICS</span>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 ml-4">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="px-3 py-1.5 rounded text-[9px] uppercase tracking-widest font-bold transition-all"
                  style={{
                    background: activeTab === t.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                    color: activeTab === t.id ? '#f59e0b' : '#4b5563',
                    border: activeTab === t.id ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close intel hub" className="text-tactical-text/40 hover:text-tactical-text">✕</button>
        </div>

        {/* Markets toolbar */}
        {activeTab === 'markets' && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {/* Type filter */}
            <div className="flex gap-1">
              {TYPE_LABELS.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="px-2.5 py-1 rounded text-[8px] uppercase tracking-widest transition-all"
                  style={{
                    background: typeFilter === t ? `${TYPE_COLOR[t] ?? '#f59e0b'}20` : 'rgba(255,255,255,0.04)',
                    color: typeFilter === t ? (TYPE_COLOR[t] ?? '#f59e0b') : '#4b5563',
                    border: typeFilter === t ? `1px solid ${TYPE_COLOR[t] ?? '#f59e0b'}40` : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search symbols, names..."
              className="flex-1 bg-[#ffffff06] border border-[#ffffff10] rounded px-3 py-1.5 text-[10px] text-tactical-text placeholder-tactical-text/30 outline-none focus:border-[#f59e0b40]"
            />

            {/* Sort */}
            <div className="flex gap-1">
              {[['change', '% CHANGE'], ['price', 'PRICE'], ['mcap', 'MKT CAP']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSortBy(id)}
                  className="px-2.5 py-1 rounded text-[8px] uppercase tracking-widest transition-all"
                  style={{
                    background: sortBy === id ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                    color: sortBy === id ? '#00e5ff' : '#4b5563',
                    border: sortBy === id ? '1px solid rgba(0,229,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="text-[8px] text-tactical-text/30 shrink-0">{displayed.length} instruments</div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'markets' && (
            <>
              {/* Column headers */}
              <div className="flex items-center px-4 py-2 text-[8px] text-tactical-text/30 uppercase tracking-widest border-b border-[#ffffff06] shrink-0">
                <div className="w-20">Symbol</div>
                <div className="flex-1">Name / Sector</div>
                <div className="w-14 text-right">Trend</div>
                <div className="w-28 text-right">Price</div>
                <div className="w-16 text-right hidden xl:block">Mkt Cap</div>
                <div className="w-12 text-right"></div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {displayed.map(inst => (
                  <InstrumentRow
                    key={inst.id}
                    instrument={inst}
                    livePrice={livePrices[inst.id] ?? inst.price}
                    history={priceHistory[inst.id]}
                    onTrade={setTradeInstrument}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'portfolio' && (
            <PortfolioTab livePrices={livePrices} />
          )}

          {activeTab === 'intel' && (
            <IntelTab />
          )}
        </div>

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-4 py-1.5 border-t shrink-0 text-[8px] text-tactical-text/30"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <span>LIVE · 2s refresh · {ALL_INSTRUMENTS.length} instruments tracked</span>
          <span>Click any instrument to trade</span>
        </div>

        <AdCardInline variant="wide" />
      </div>

      {/* Trade modal */}
      {tradeInstrument && (
        <TradeModal
          instrument={tradeInstrument}
          livePrice={livePrices[tradeInstrument.id] ?? tradeInstrument.price}
          onClose={() => setTradeInstrument(null)}
        />
      )}
    </div>
  );
}
