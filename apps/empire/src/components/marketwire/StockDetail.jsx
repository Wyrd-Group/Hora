/**
 * StockDetail.jsx — Yahoo Finance-style stock detail page.
 * Shows instrument info, price chart placeholder, key stats, and related news.
 */

import { useMemo, useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useMarketWireStore } from '../../store/marketWireStore';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { SECTOR_COLORS } from '../../data/marketWireTemplates';

const fmt = (n) =>
  n >= 1e9 ? `€${(n / 1e9).toFixed(2)}B` :
  n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` :
  n >= 1e3 ? `€${(n / 1e3).toFixed(0)}K` :
  `€${n.toFixed(2)}`;

export default function StockDetail({ symbol, onBack }) {
  const inst = useMemo(() => ALL_INSTRUMENTS.find(i => i.symbol === symbol), [symbol]);
  const portfolio = useEmpireStore(s => s.portfolio);
  const watchlist = useMarketWireStore(s => s.watchlist);
  const addToWatchlist = useMarketWireStore(s => s.addToWatchlist);
  const removeFromWatchlist = useMarketWireStore(s => s.removeFromWatchlist);
  const articles = useMarketWireStore(s => s.articles);

  const isWatched = watchlist.includes(symbol);

  // Player's position in this instrument
  const position = useMemo(() => {
    if (!inst) return null;
    const pos = Object.entries(portfolio).find(([_, p]) => p.symbol === symbol);
    if (!pos) return null;
    const [id, p] = pos;
    const value = inst.price * p.quantity;
    const cost = p.avgCost * p.quantity;
    return { ...p, id, value, cost, pnl: value - cost, pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0 };
  }, [inst, portfolio, symbol]);

  // Related articles
  const relatedArticles = useMemo(() => {
    return articles.filter(a => a.relatedSymbols.includes(symbol)).slice(0, 5);
  }, [articles, symbol]);

  // Generate price chart data (simulated sparkline from base price + change)
  const chartData = useMemo(() => {
    if (!inst) return [];
    const points = 30;
    const base = inst.price / (1 + inst.change24h / 100);
    const data = [];
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const noise = (Math.random() - 0.5) * inst.price * 0.005;
      data.push(base + (inst.price - base) * progress + noise);
    }
    data[data.length - 1] = inst.price; // ensure last point is current
    return data;
  }, [inst]);

  if (!inst) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="text-[9px] text-tactical-text/40 hover:text-tactical-cyan font-mono mb-4">← Back</button>
        <div className="text-center py-20 text-tactical-text/30 text-[10px] font-mono">Instrument not found: {symbol}</div>
      </div>
    );
  }

  const isUp = inst.change24h >= 0;
  const sectorColor = SECTOR_COLORS[inst.sector] || '#6b7280';

  return (
    <div className="p-4 space-y-4">
      {/* Back + Watchlist */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-[9px] text-tactical-text/40 hover:text-[#f59e0b] font-mono transition-all">← Back to MarketWire</button>
        <button
          onClick={() => isWatched ? removeFromWatchlist(symbol) : addToWatchlist(symbol)}
          className={`px-2.5 py-1 rounded text-[7px] font-mono transition-all ${
            isWatched
              ? 'text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30'
              : 'text-tactical-text/30 border border-tactical-border/20 hover:text-[#f59e0b] hover:border-[#f59e0b]/20'
          }`}
        >
          {isWatched ? '★ Watching' : '☆ Watch'}
        </button>
      </div>

      {/* Header */}
      <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-mono font-bold text-tactical-text/90">{inst.symbol}</span>
              <span className="text-[7px] px-1.5 py-0.5 rounded border font-mono uppercase" style={{
                color: sectorColor, borderColor: `${sectorColor}40`, backgroundColor: `${sectorColor}10`
              }}>
                {inst.sector || inst.type}
              </span>
            </div>
            <div className="text-[10px] text-tactical-text/50 font-mono mb-3">{inst.name}</div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-mono font-bold text-tactical-text/90 tabular-nums">
                €{inst.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-mono font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '+' : ''}{inst.change24h.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Mini Chart */}
          <PriceChart data={chartData} isUp={isUp} />
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {inst.marketCapB && <StatCard label="Market Cap" value={`€${inst.marketCapB}B`} />}
        <StatCard label="Price" value={`€${inst.price.toFixed(2)}`} />
        <StatCard label="24h Change" value={`${isUp ? '+' : ''}${inst.change24h.toFixed(2)}%`} color={isUp ? '#10b981' : '#ef4444'} />
        <StatCard label="Type" value={inst.type.charAt(0).toUpperCase() + inst.type.slice(1)} />
      </div>

      {/* Description */}
      <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg p-4">
        <div className="text-[7px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono mb-2">About</div>
        <p className="text-[9px] text-tactical-text/60 font-mono leading-relaxed">{inst.description}</p>
      </div>

      {/* Your Position */}
      {position && (
        <div className="bg-[#0a0e18]/60 border border-[#3b82f6]/20 rounded-lg p-4">
          <div className="text-[7px] text-[#3b82f6]/60 uppercase tracking-[0.2em] font-mono mb-3">Your Position</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Shares" value={position.quantity.toString()} color="#3b82f6" />
            <StatCard label="Avg Cost" value={`€${position.avgCost.toFixed(2)}`} color="#3b82f6" />
            <StatCard label="Market Value" value={fmt(position.value)} color="#3b82f6" />
            <StatCard
              label="P&L"
              value={`${position.pnl >= 0 ? '+' : ''}${fmt(position.pnl)} (${position.pnlPct >= 0 ? '+' : ''}${position.pnlPct.toFixed(2)}%)`}
              color={position.pnl >= 0 ? '#10b981' : '#ef4444'}
            />
          </div>
        </div>
      )}

      {/* Related News */}
      {relatedArticles.length > 0 && (
        <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg p-4">
          <div className="text-[7px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono mb-3">Related News</div>
          <div className="space-y-2">
            {relatedArticles.map(a => (
              <div key={a.id} className="flex items-start gap-2 py-2 border-b border-tactical-border/[0.05] last:border-0">
                <span className="text-[10px] flex-shrink-0">{a.journalist.avatarEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-tactical-text/70 font-mono leading-tight truncate">{a.headline}</div>
                  <div className="text-[7px] text-tactical-text/30 font-mono mt-0.5">{a.journalist.outlet} · {timeAgo(a.publishedAt)}</div>
                </div>
                <span className={`text-[6px] px-1 py-0.5 rounded font-mono flex-shrink-0 ${
                  a.sentiment === 'bullish' ? 'text-emerald-400 bg-emerald-500/10' :
                  a.sentiment === 'bearish' ? 'text-rose-400 bg-rose-500/10' :
                  'text-gray-400 bg-gray-500/10'
                }`}>
                  {a.sentiment.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector peers */}
      {inst.sector && <SectorPeers sector={inst.sector} currentSymbol={symbol} />}
    </div>
  );
}

function PriceChart({ data, isUp }) {
  if (data.length < 2) return null;
  const w = 140, h = 50;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const color = isUp ? '#10b981' : '#ef4444';

  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const fillPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <defs>
        <linearGradient id={`grad-${isUp}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#grad-${isUp})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, color = '#9ca3af' }) {
  return (
    <div className="bg-[#060a12]/40 rounded-lg p-2.5">
      <div className="text-[6px] text-tactical-text/30 uppercase tracking-[0.15em] font-mono mb-0.5">{label}</div>
      <div className="text-[11px] font-mono font-semibold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function SectorPeers({ sector, currentSymbol }) {
  const peers = useMemo(() => {
    return ALL_INSTRUMENTS
      .filter(i => i.sector === sector && i.symbol !== currentSymbol)
      .slice(0, 6);
  }, [sector, currentSymbol]);

  if (peers.length === 0) return null;

  return (
    <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg p-4">
      <div className="text-[7px] text-tactical-text/40 uppercase tracking-[0.2em] font-mono mb-3">Sector Peers — {sector}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {peers.map(p => (
          <div key={p.symbol} className="bg-[#060a12]/40 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[9px] text-tactical-text/70 font-mono font-semibold">{p.symbol}</div>
              <div className="text-[7px] text-tactical-text/30 font-mono truncate max-w-[80px]">{p.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[8px] text-tactical-text/60 font-mono tabular-nums">€{p.price.toFixed(2)}</div>
              <div className={`text-[7px] font-mono tabular-nums ${p.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p.change24h >= 0 ? '+' : ''}{p.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
