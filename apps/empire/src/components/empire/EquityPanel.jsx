import React, { useState, useMemo } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import AdCardInline from '../ads/AdCardInline';

// ── Investors available in the game (mirrors EmpireOverview INVESTOR_TYPES) ──
const INVESTORS = [
  { id: 'seed1', type: 'Seed Fund', name: 'Sprout Capital', portrait: '\uD83C\uDF31', focus: 'Pre-revenue ideas', maxInvestment: 25_000, equityAsk: 8, color: '#10b981', className: 'Seed Round' },
  { id: 'angel1', type: 'Angel Investor', name: 'Sofia Reyes', portrait: '\uD83D\uDC69\u200D\uD83D\uDCBC', focus: 'Early-stage tech', maxInvestment: 50_000, equityAsk: 15, color: '#ec4899', className: 'Angel Round' },
  { id: 'angel2', type: 'Angel Investor', name: 'Marcus Webb', portrait: '\uD83E\uDDD1\u200D\uD83D\uDCBC', focus: 'Social enterprise', maxInvestment: 30_000, equityAsk: 10, color: '#10b981', className: 'Angel Round' },
  { id: 'vc1', type: 'Venture Capital', name: 'Meridian Partners', portrait: '\uD83C\uDFE2', focus: 'Series A \u2014 Growth', maxInvestment: 250_000, equityAsk: 20, color: '#7c3aed', className: 'Series A' },
  { id: 'vc2', type: 'Venture Capital', name: 'Nordic Ventures', portrait: '\uD83C\uDFD4\uFE0F', focus: 'Series A \u2014 ESG', maxInvestment: 200_000, equityAsk: 18, color: '#00e5ff', className: 'Series A' },
  { id: 'vc3', type: 'Venture Capital', name: 'Apex Capital', portrait: '\uD83E\uDD85', focus: 'Series B \u2014 Scale', maxInvestment: 1_000_000, equityAsk: 25, color: '#f59e0b', className: 'Series B' },
  { id: 'pe1', type: 'Private Equity', name: 'Blackridge Group', portrait: '\uD83C\uDFDB\uFE0F', focus: 'Buyout / Control', maxInvestment: 3_000_000, equityAsk: 40, color: '#ef4444', className: 'PE Round' },
];

const PIE_COLORS = ['#00e5ff', '#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6', '#f97316', '#6366f1'];

function fmt(n) {
  if (n >= 1e9) return `\u20AC${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `\u20AC${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `\u20AC${(n / 1e3).toFixed(0)}K`;
  return `\u20AC${n.toLocaleString()}`;
}

// ── Simple SVG Pie Chart ──
function CapTablePie({ slices }) {
  let cumulative = 0;
  const paths = slices.map((s, i) => {
    const start = cumulative;
    cumulative += s.pct;
    const startAngle = (start / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
    const largeArc = s.pct > 50 ? 1 : 0;
    const x1 = 50 + 40 * Math.cos(startAngle);
    const y1 = 50 + 40 * Math.sin(startAngle);
    const x2 = 50 + 40 * Math.cos(endAngle);
    const y2 = 50 + 40 * Math.sin(endAngle);
    if (s.pct >= 99.9) {
      return <circle key={i} cx="50" cy="50" r="40" fill={s.color} />;
    }
    if (s.pct < 0.1) return null;
    return (
      <path
        key={i}
        d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`}
        fill={s.color}
        stroke="#0f172a"
        strokeWidth="0.5"
      />
    );
  });
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {paths}
      <circle cx="50" cy="50" r="20" fill="#0f172a" />
    </svg>
  );
}

export default function EquityPanel() {
  const store = useEmpireStore();
  const [ipoPrice, setIpoPrice] = useState('');
  const [ipoFloat, setIpoFloat] = useState('20');
  const [sellQty, setSellQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellBuyer, setSellBuyer] = useState('Secondary Market');

  // Aggregate ownership by holder
  const ownership = useMemo(() => {
    const map = {};
    for (const sc of store.shareClasses) {
      if (!map[sc.holder]) {
        map[sc.holder] = { holder: sc.holder, holderName: sc.holderName, shares: 0 };
      }
      map[sc.holder].shares += sc.shares;
    }
    return Object.values(map).map((o, i) => ({
      ...o,
      pct: (o.shares / store.totalShares) * 100,
      color: o.holder === 'player' ? '#00e5ff' : o.holder === 'public' ? '#f59e0b' : PIE_COLORS[(i + 1) % PIE_COLORS.length],
    })).sort((a, b) => b.shares - a.shares);
  }, [store.shareClasses, store.totalShares]);

  const playerPct = store.totalShares > 0 ? (store.sharesOwnedByPlayer / store.totalShares) * 100 : 100;

  const handleSellEquity = (inv) => {
    store.sellEquity(inv.id, inv.name, inv.equityAsk, inv.maxInvestment, inv.className);
  };

  const handleIPO = () => {
    const price = parseFloat(ipoPrice);
    const float = parseFloat(ipoFloat);
    if (!price || price <= 0 || !float || float <= 0 || float > 49) return;
    store.executeIPO(price, float);
    setIpoPrice('');
  };

  const handleSellShares = () => {
    const qty = parseInt(sellQty);
    const price = parseFloat(sellPrice) || store.currentSharePrice;
    if (!qty || qty <= 0 || qty > store.sharesOwnedByPlayer) return;
    store.sellShares(qty, price, sellBuyer);
    setSellQty('');
  };

  // Already sold to this investor?
  const soldTo = useMemo(() => {
    const s = new Set();
    for (const sc of store.shareClasses) {
      if (sc.holder !== 'player' && sc.holder !== 'public') s.add(sc.holder);
    }
    return s;
  }, [store.shareClasses]);

  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#00e5ff] tracking-wider uppercase font-mono">Equity & Cap Table</h2>
        {store.isPublic && (
          <span className="text-[9px] bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-0.5 rounded font-mono border border-[#f59e0b]/30">
            PUBLIC
          </span>
        )}
      </div>

      {/* Share Price + Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0f172a] rounded border border-[#00e5ff]/20 p-2 text-center">
          <div className="text-[7px] text-[#9ca3af] uppercase tracking-wider font-mono">Share Price</div>
          <div className="text-sm font-bold text-[#00e5ff] font-mono">{'\u20AC'}{store.currentSharePrice.toFixed(2)}</div>
        </div>
        <div className="bg-[#0f172a] rounded border border-[#00e5ff]/20 p-2 text-center">
          <div className="text-[7px] text-[#9ca3af] uppercase tracking-wider font-mono">Total Shares</div>
          <div className="text-sm font-bold text-[#e2e8f0] font-mono">{store.totalShares.toLocaleString()}</div>
        </div>
        <div className="bg-[#0f172a] rounded border border-[#00e5ff]/20 p-2 text-center">
          <div className="text-[7px] text-[#9ca3af] uppercase tracking-wider font-mono">Your Ownership</div>
          <div className="text-sm font-bold text-[#10b981] font-mono">{playerPct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Cap Table Pie + Legend */}
      <div className="bg-[#0f172a] rounded border border-[#00e5ff]/10 p-3">
        <div className="text-[8px] text-[#9ca3af] uppercase tracking-wider font-mono mb-2">Cap Table</div>
        <div className="flex gap-4">
          <div className="w-24 h-24 shrink-0">
            <CapTablePie slices={ownership} />
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto max-h-24">
            {ownership.map((o) => (
              <div key={o.holder} className="flex items-center justify-between text-[8px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: o.color }} />
                  <span className="text-[#e2e8f0] truncate max-w-[100px]">{o.holderName}</span>
                </div>
                <div className="text-[#9ca3af]">
                  {o.shares.toLocaleString()} ({o.pct.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raise Capital */}
      <div className="bg-[#0f172a] rounded border border-[#7c3aed]/20 p-3">
        <div className="text-[8px] text-[#7c3aed] uppercase tracking-wider font-mono mb-2">Raise Capital</div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {INVESTORS.map((inv) => {
            const alreadySold = soldTo.has(inv.id);
            return (
              <div
                key={inv.id}
                className={`flex items-center justify-between p-2 rounded border transition-all ${
                  alreadySold
                    ? 'border-[#374151]/40 bg-[#1e293b]/30 opacity-50'
                    : 'border-[#374151]/60 bg-[#1e293b]/50 hover:border-[#7c3aed]/40 hover:bg-[#7c3aed]/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{inv.portrait}</span>
                  <div>
                    <div className="text-[9px] font-bold text-[#e2e8f0] font-mono">{inv.name}</div>
                    <div className="text-[7px] text-[#9ca3af] font-mono">{inv.type} &middot; {inv.focus}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-mono" style={{ color: inv.color }}>
                    {fmt(inv.maxInvestment)} for {inv.equityAsk}%
                  </div>
                  {alreadySold ? (
                    <span className="text-[7px] text-[#6b7280] font-mono">FUNDED</span>
                  ) : (
                    <button
                      onClick={() => handleSellEquity(inv)}
                      className="text-[7px] px-2 py-0.5 rounded bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/30 hover:bg-[#7c3aed]/30 font-mono cursor-pointer transition-all"
                    >
                      ACCEPT
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* IPO */}
      {!store.isPublic && (
        <div className="bg-[#0f172a] rounded border border-[#f59e0b]/20 p-3">
          <div className="text-[8px] text-[#f59e0b] uppercase tracking-wider font-mono mb-2">Initial Public Offering (IPO)</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[7px] text-[#9ca3af] font-mono">Price Per Share</label>
              <input
                type="number"
                value={ipoPrice}
                onChange={(e) => setIpoPrice(e.target.value)}
                placeholder={store.currentSharePrice.toFixed(2)}
                className="w-full bg-[#1e293b] border border-[#374151] rounded px-2 py-1 text-[9px] text-[#e2e8f0] font-mono focus:border-[#f59e0b]/50 outline-none"
              />
            </div>
            <div>
              <label className="text-[7px] text-[#9ca3af] font-mono">Float % (max 49%)</label>
              <input
                type="number"
                value={ipoFloat}
                onChange={(e) => setIpoFloat(e.target.value)}
                min="1"
                max="49"
                className="w-full bg-[#1e293b] border border-[#374151] rounded px-2 py-1 text-[9px] text-[#e2e8f0] font-mono focus:border-[#f59e0b]/50 outline-none"
              />
            </div>
          </div>
          {ipoPrice && parseFloat(ipoPrice) > 0 && parseFloat(ipoFloat) > 0 && (
            <div className="text-[8px] text-[#9ca3af] font-mono mb-2">
              Projected proceeds: <span className="text-[#f59e0b] font-bold">
                {fmt(Math.round(store.totalShares * (parseFloat(ipoFloat) / 100) * parseFloat(ipoPrice)))}
              </span> &middot; {Math.round(store.totalShares * parseFloat(ipoFloat) / 100).toLocaleString()} new shares
            </div>
          )}
          <button
            onClick={handleIPO}
            disabled={!ipoPrice || parseFloat(ipoPrice) <= 0}
            className="w-full py-1.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30 text-[9px] font-mono font-bold uppercase tracking-wider hover:bg-[#f59e0b]/30 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Go Public
          </button>
        </div>
      )}

      {/* Secondary Sale (if player owns shares) */}
      {store.sharesOwnedByPlayer > 0 && (
        <div className="bg-[#0f172a] rounded border border-[#ef4444]/20 p-3">
          <div className="text-[8px] text-[#ef4444] uppercase tracking-wider font-mono mb-2">
            Sell Your Shares ({store.sharesOwnedByPlayer.toLocaleString()} available)
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-[7px] text-[#9ca3af] font-mono">Quantity</label>
              <input
                type="number"
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                max={store.sharesOwnedByPlayer}
                className="w-full bg-[#1e293b] border border-[#374151] rounded px-2 py-1 text-[9px] text-[#e2e8f0] font-mono focus:border-[#ef4444]/50 outline-none"
              />
            </div>
            <div>
              <label className="text-[7px] text-[#9ca3af] font-mono">Price/Share</label>
              <input
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder={store.currentSharePrice.toFixed(2)}
                className="w-full bg-[#1e293b] border border-[#374151] rounded px-2 py-1 text-[9px] text-[#e2e8f0] font-mono focus:border-[#ef4444]/50 outline-none"
              />
            </div>
            <div>
              <label className="text-[7px] text-[#9ca3af] font-mono">Buyer</label>
              <input
                type="text"
                value={sellBuyer}
                onChange={(e) => setSellBuyer(e.target.value)}
                className="w-full bg-[#1e293b] border border-[#374151] rounded px-2 py-1 text-[9px] text-[#e2e8f0] font-mono focus:border-[#ef4444]/50 outline-none"
              />
            </div>
          </div>
          {sellQty && parseInt(sellQty) > 0 && (
            <div className="text-[8px] text-[#9ca3af] font-mono mb-2">
              Proceeds: <span className="text-[#10b981] font-bold">
                {fmt(Math.round(parseInt(sellQty) * (parseFloat(sellPrice) || store.currentSharePrice)))}
              </span>
            </div>
          )}
          <button
            onClick={handleSellShares}
            disabled={!sellQty || parseInt(sellQty) <= 0 || parseInt(sellQty) > store.sharesOwnedByPlayer}
            className="w-full py-1.5 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 text-[9px] font-mono font-bold uppercase tracking-wider hover:bg-[#ef4444]/30 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Sell Shares
          </button>
        </div>
      )}

      {/* Dilution History */}
      {store.dilutionEvents.length > 0 && (
        <div className="bg-[#0f172a] rounded border border-[#00e5ff]/10 p-3">
          <div className="text-[8px] text-[#9ca3af] uppercase tracking-wider font-mono mb-2">Dilution History</div>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {store.dilutionEvents.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-[8px] font-mono py-1 border-b border-[#1e293b]">
                <div className="text-[#e2e8f0]">{e.investor}</div>
                <div className="text-[#9ca3af]">
                  {e.shares.toLocaleString()} shares ({e.pct}%) @ {'\u20AC'}{e.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdCardInline variant="wide" />

      {/* Market Cap (if public) */}
      {store.isPublic && (
        <div className="bg-[#0f172a] rounded border border-[#f59e0b]/20 p-3">
          <div className="text-[8px] text-[#f59e0b] uppercase tracking-wider font-mono mb-2">Public Market</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[7px] text-[#9ca3af] font-mono">Market Cap</div>
              <div className="text-sm font-bold text-[#f59e0b] font-mono">{fmt(Math.round(store.totalShares * store.currentSharePrice))}</div>
            </div>
            <div>
              <div className="text-[7px] text-[#9ca3af] font-mono">IPO Price</div>
              <div className="text-sm font-bold text-[#e2e8f0] font-mono">{'\u20AC'}{store.ipoPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[7px] text-[#9ca3af] font-mono">Public Float</div>
              <div className="text-sm font-bold text-[#e2e8f0] font-mono">{store.publicFloat.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[7px] text-[#9ca3af] font-mono">Change from IPO</div>
              <div className={`text-sm font-bold font-mono ${store.currentSharePrice >= store.ipoPrice ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {store.currentSharePrice >= store.ipoPrice ? '+' : ''}{((store.currentSharePrice - store.ipoPrice) / store.ipoPrice * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
