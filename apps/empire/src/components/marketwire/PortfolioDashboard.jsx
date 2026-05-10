/**
 * PortfolioDashboard.jsx — Yahoo Finance-style portfolio summary.
 * Shows holdings, allocation breakdown, performance metrics.
 */

import { useMemo } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { SECTOR_COLORS } from '../../data/marketWireTemplates';
import AdCardInline from '../ads/AdCardInline';

const fmt = (n) =>
  n >= 1e9 ? `€${(n / 1e9).toFixed(2)}B` :
  n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` :
  n >= 1e3 ? `€${(n / 1e3).toFixed(0)}K` :
  `€${Math.round(n)}`;

export default function PortfolioDashboard({ onSelectStock }) {
  const portfolio = useEmpireStore(s => s.portfolio);
  const balance = useEmpireStore(s => s.companyBalance);
  const netWorth = useEmpireStore(s => s.netWorth);

  const holdings = useMemo(() => {
    return Object.entries(portfolio).map(([id, pos]) => {
      const inst = ALL_INSTRUMENTS.find(i => i.id === id || i.symbol === pos.symbol);
      const currentPrice = inst?.price || pos.avgCost;
      const marketValue = currentPrice * pos.quantity;
      const costBasis = pos.avgCost * pos.quantity;
      const pnl = marketValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return {
        id,
        symbol: pos.symbol,
        name: pos.name,
        type: pos.instrumentType,
        quantity: pos.quantity,
        avgCost: pos.avgCost,
        currentPrice,
        marketValue,
        costBasis,
        pnl,
        pnlPercent,
        sector: inst?.sector || 'Other',
      };
    }).sort((a, b) => b.marketValue - a.marketValue);
  }, [portfolio]);

  const totals = useMemo(() => {
    const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);
    const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalPnl, totalPnlPct };
  }, [holdings]);

  // Sector allocation
  const sectorAllocation = useMemo(() => {
    const map = {};
    for (const h of holdings) {
      map[h.sector] = (map[h.sector] || 0) + h.marketValue;
    }
    return Object.entries(map)
      .map(([sector, value]) => ({ sector, value, pct: totals.totalValue > 0 ? (value / totals.totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totals]);

  // Type allocation
  const typeAllocation = useMemo(() => {
    const map = {};
    for (const h of holdings) {
      const t = h.type || 'other';
      map[t] = (map[t] || 0) + h.marketValue;
    }
    return Object.entries(map)
      .map(([type, value]) => ({ type, value, pct: totals.totalValue > 0 ? (value / totals.totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totals]);

  return (
    <div className="p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Portfolio Value" value={fmt(totals.totalValue)} color="#3b82f6" />
        <SummaryCard label="Cash Balance" value={fmt(balance)} color="#00e5ff" />
        <SummaryCard
          label="Unrealized P&L"
          value={`${totals.totalPnl >= 0 ? '+' : ''}${fmt(totals.totalPnl)}`}
          sub={`${totals.totalPnlPct >= 0 ? '+' : ''}${totals.totalPnlPct.toFixed(2)}%`}
          color={totals.totalPnl >= 0 ? '#10b981' : '#ef4444'}
        />
        <SummaryCard label="Net Worth" value={fmt(netWorth)} color="#f59e0b" />
      </div>

      {/* Allocation Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Sector Breakdown */}
        <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg p-4">
          <div className="text-[7px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono mb-3">Sector Allocation</div>
          {sectorAllocation.length === 0 ? (
            <div className="text-[8px] text-tactical-text/20 font-mono">No holdings</div>
          ) : (
            <div className="space-y-2">
              {sectorAllocation.slice(0, 8).map(({ sector, value, pct }) => (
                <div key={sector}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] text-tactical-text/60 font-mono">{sector}</span>
                    <span className="text-[7px] text-tactical-text/40 font-mono tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: SECTOR_COLORS[sector] || '#6b7280',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Type Breakdown */}
        <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg p-4">
          <div className="text-[7px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono mb-3">Asset Type Allocation</div>
          {typeAllocation.length === 0 ? (
            <div className="text-[8px] text-tactical-text/20 font-mono">No holdings</div>
          ) : (
            <div className="space-y-2">
              {typeAllocation.map(({ type, value, pct }) => {
                const typeColors = { stock: '#3b82f6', crypto: '#f97316', forex: '#8b5cf6', commodity: '#f59e0b', bond: '#10b981' };
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] text-tactical-text/60 font-mono capitalize">{type}</span>
                      <span className="text-[7px] text-tactical-text/40 font-mono tabular-nums">{fmt(value)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: typeColors[type] || '#6b7280' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-tactical-border/10">
          <span className="text-[7px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono">Holdings ({holdings.length})</span>
        </div>

        {holdings.length === 0 ? (
          <div className="text-center py-12 text-tactical-text/20 text-[9px] font-mono">
            No positions. Start trading to build your portfolio.
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_70px_70px_80px_80px_70px] gap-2 px-4 py-2 text-[6px] text-tactical-text/25 font-mono tracking-[0.15em] uppercase border-b border-tactical-border/5">
              <span>Asset</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Avg Cost</span>
              <span className="text-right">Mkt Value</span>
              <span className="text-right">P&L</span>
              <span className="text-right">Return</span>
            </div>

            {/* Rows */}
            {holdings.map(h => (
              <div
                key={h.id}
                onClick={() => onSelectStock(h.symbol)}
                className="grid grid-cols-[1fr_70px_70px_80px_80px_70px] gap-2 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-all border-b border-tactical-border/[0.03] items-center"
              >
                <div>
                  <div className="text-[9px] text-tactical-text/80 font-mono font-semibold">{h.symbol}</div>
                  <div className="text-[7px] text-tactical-text/30 font-mono truncate">{h.name}</div>
                </div>
                <div className="text-right text-[9px] text-tactical-text/60 font-mono tabular-nums">{h.quantity}</div>
                <div className="text-right text-[9px] text-tactical-text/50 font-mono tabular-nums">€{h.avgCost.toFixed(2)}</div>
                <div className="text-right text-[9px] text-tactical-text/70 font-mono tabular-nums">{fmt(h.marketValue)}</div>
                <div className={`text-right text-[9px] font-mono tabular-nums ${h.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {h.pnl >= 0 ? '+' : ''}{fmt(h.pnl)}
                </div>
                <div className={`text-right text-[8px] font-mono tabular-nums ${h.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div className="grid grid-cols-[1fr_70px_70px_80px_80px_70px] gap-2 px-4 py-2.5 bg-white/[0.02] border-t border-tactical-border/10 items-center">
              <div className="text-[8px] text-tactical-text/50 font-mono font-semibold uppercase">Total</div>
              <div />
              <div />
              <div className="text-right text-[9px] text-tactical-text/70 font-mono font-semibold tabular-nums">{fmt(totals.totalValue)}</div>
              <div className={`text-right text-[9px] font-mono font-semibold tabular-nums ${totals.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totals.totalPnl >= 0 ? '+' : ''}{fmt(totals.totalPnl)}
              </div>
              <div className={`text-right text-[8px] font-mono font-semibold tabular-nums ${totals.totalPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totals.totalPnlPct >= 0 ? '+' : ''}{totals.totalPnlPct.toFixed(2)}%
              </div>
            </div>
          </>
        )}
      </div>

      <AdCardInline variant="wide" />
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg p-3">
      <div className="text-[6px] text-tactical-text/35 uppercase tracking-[0.2em] font-mono mb-1">{label}</div>
      <div className="text-base font-bold font-mono tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-[8px] font-mono mt-0.5" style={{ color: `${color}99` }}>{sub}</div>}
    </div>
  );
}
