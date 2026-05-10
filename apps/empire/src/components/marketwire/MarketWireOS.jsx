/**
 * MarketWireOS.jsx — Yahoo Finance-style financial news and market data hub.
 *
 * Permanent tab accessible in all game modes. Displays:
 * - Market index ticker bar
 * - Agent-generated news feed (articles about player behavior)
 * - Portfolio summary dashboard
 * - Instrument screener
 * - Stock detail view
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { useMarketWireStore } from '../../store/marketWireStore';
import { useNewsStore } from '../../store/newsStore';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { MARKET_INDICES, SECTOR_COLORS, JOURNALIST_AGENTS } from '../../data/marketWireTemplates';
import MarketIndexBar from './MarketIndexBar';
import PortfolioDashboard from './PortfolioDashboard';
import StockDetail from './StockDetail';
import Screener from './Screener';
import AdCardInline from '../ads/AdCardInline';

const fmt = (n) =>
  n >= 1e9 ? `€${(n / 1e9).toFixed(2)}B` :
  n >= 1e6 ? `€${(n / 1e6).toFixed(1)}M` :
  n >= 1e3 ? `€${(n / 1e3).toFixed(0)}K` :
  `€${Math.round(n)}`;

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function sentimentBadge(s) {
  if (s === 'bullish') return { text: 'BULLISH', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
  if (s === 'bearish') return { text: 'BEARISH', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
  return { text: 'NEUTRAL', color: 'text-gray-400 bg-gray-500/15 border-gray-500/30' };
}

// ── Tab Navigation ──

const TABS = [
  { key: 'news', label: 'News', icon: '📰' },
  { key: 'portfolio', label: 'Portfolio', icon: '💼' },
  { key: 'screener', label: 'Screener', icon: '🔍' },
  { key: 'watchlist', label: 'Watchlist', icon: '⭐' },
];

export default function MarketWireOS() {
  const [activeTab, setActiveTab] = useState('news');
  const [selectedStock, setSelectedStock] = useState(null); // symbol
  const [newsFilter, setNewsFilter] = useState('all'); // 'all' | 'agent' | 'bulletin'

  // Update indices every 30s
  const updateIndices = useMarketWireStore(s => s.updateIndices);
  useEffect(() => {
    updateIndices();
    const iv = setInterval(updateIndices, 30_000);
    return () => clearInterval(iv);
  }, [updateIndices]);

  // Stock detail view
  if (selectedStock) {
    return (
      <div className="absolute inset-0 z-20 bg-[#060a12] overflow-y-auto scrollbar-thin">
        <StockDetail
          symbol={selectedStock}
          onBack={() => setSelectedStock(null)}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 bg-[#060a12] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#060a12]/95 backdrop-blur-xl border-b border-tactical-border/10 px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[#f59e0b] text-sm">◆</span>
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#f59e0b]">MARKETWIRE</span>
            <span className="text-[7px] text-tactical-text/20 font-mono ml-1">FINANCIAL INTELLIGENCE</span>
          </div>
          <div className="flex items-center gap-2">
            <UnreadBadge />
            <span className="text-[7px] text-tactical-text/20 font-mono">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
          </div>
        </div>

        {/* Market Index Ticker */}
        <MarketIndexBar />

        {/* Tab Navigation */}
        <div className="flex items-center gap-0 mt-2">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-[8px] font-mono tracking-[0.12em] uppercase transition-all flex items-center gap-1 border-b-2 ${
                activeTab === key
                  ? 'text-[#f59e0b] border-[#f59e0b] font-semibold'
                  : 'text-tactical-text/30 border-transparent hover:text-tactical-text/55 hover:border-tactical-border/20'
              }`}
            >
              <span className="text-[9px]">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <AdCardInline variant="wide" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'news' && (
          <NewsFeedTab
            filter={newsFilter}
            setFilter={setNewsFilter}
            onSelectStock={setSelectedStock}
          />
        )}
        {activeTab === 'portfolio' && (
          <PortfolioDashboard onSelectStock={setSelectedStock} />
        )}
        {activeTab === 'screener' && (
          <Screener onSelectStock={setSelectedStock} />
        )}
        {activeTab === 'watchlist' && (
          <WatchlistTab onSelectStock={setSelectedStock} />
        )}
      </div>
    </div>
  );
}

// ── Unread badge ──

function UnreadBadge() {
  const agentUnread = useMarketWireStore(s => s.getUnreadCount());
  const bulletinUnread = useNewsStore(s => s.getUnreadCount());
  const total = agentUnread + bulletinUnread;
  if (total === 0) return null;
  return (
    <span className="px-1.5 py-0.5 bg-[#f59e0b]/20 border border-[#f59e0b]/40 rounded text-[7px] text-[#f59e0b] font-mono font-bold">
      {total} NEW
    </span>
  );
}

// ── News Feed Tab ──

function NewsFeedTab({ filter, setFilter, onSelectStock }) {
  const agentArticles = useMarketWireStore(s => s.articles);
  const bulletins = useNewsStore(s => s.bulletins);
  const markAgentRead = useMarketWireStore(s => s.markAsRead);
  const markBulletinRead = useNewsStore(s => s.markAsRead);
  const bulletinRead = useNewsStore(s => s.readBulletins);

  // Merge and sort all articles chronologically
  const allArticles = useMemo(() => {
    const items = [];

    if (filter === 'all' || filter === 'agent') {
      for (const a of agentArticles) {
        items.push({
          type: 'agent',
          id: a.id,
          headline: a.headline,
          body: a.body.join(' '),
          source: `${a.journalist.avatarEmoji} ${a.journalist.name} · ${a.journalist.outlet}`,
          sentiment: a.sentiment,
          category: a.category,
          publishedAt: a.publishedAt,
          read: a.read,
          relatedSymbols: a.relatedSymbols,
          journalist: a.journalist,
        });
      }
    }

    if (filter === 'all' || filter === 'bulletin') {
      for (const b of bulletins) {
        items.push({
          type: 'bulletin',
          id: b.id,
          headline: b.headline,
          body: b.body,
          source: b.source,
          sentiment: b.sentiment,
          category: b.category,
          publishedAt: b.publishedAt,
          read: bulletinRead.includes(b.id),
          relatedSymbols: [],
          journalist: null,
        });
      }
    }

    return items.sort((a, b) => b.publishedAt - a.publishedAt);
  }, [agentArticles, bulletins, bulletinRead, filter]);

  const handleRead = useCallback((item) => {
    if (item.type === 'agent') markAgentRead(item.id);
    else markBulletinRead(item.id);
  }, [markAgentRead, markBulletinRead]);

  return (
    <div className="p-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'all', label: 'All News' },
          { key: 'agent', label: 'Agent Reports' },
          { key: 'bulletin', label: 'Market Bulletins' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded text-[7px] font-mono tracking-[0.1em] uppercase transition-all ${
              filter === key
                ? 'text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30'
                : 'text-tactical-text/30 border border-tactical-border/10 hover:text-tactical-text/50'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-[7px] text-tactical-text/20 font-mono ml-auto">{allArticles.length} ARTICLES</span>
      </div>

      {/* Article List */}
      {allArticles.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-tactical-text/20 text-[10px] font-mono">No articles yet. Keep playing to generate market news.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {allArticles.map((item) => (
            <ArticleCard
              key={item.id}
              item={item}
              onRead={() => handleRead(item)}
              onSelectStock={onSelectStock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Article Card ──

function ArticleCard({ item, onRead, onSelectStock }) {
  const [expanded, setExpanded] = useState(false);
  const badge = sentimentBadge(item.sentiment);

  const handleClick = () => {
    if (!item.read) onRead();
    setExpanded(!expanded);
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-[#0a0e18]/60 border rounded-lg p-4 cursor-pointer transition-all hover:border-tactical-border/40 ${
        item.read ? 'border-tactical-border/10' : 'border-[#f59e0b]/20 bg-[#f59e0b]/[0.02]'
      }`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" />}
            <span className={`px-1.5 py-0.5 rounded border text-[6px] font-mono tracking-[0.1em] ${badge.color}`}>
              {badge.text}
            </span>
            <span className="text-[6px] text-tactical-text/25 font-mono uppercase">{item.category}</span>
            {item.type === 'agent' && (
              <span className="text-[6px] text-[#f59e0b]/40 font-mono">AGENT REPORT</span>
            )}
          </div>
          <h3 className={`text-[11px] font-mono leading-tight ${item.read ? 'text-tactical-text/50' : 'text-tactical-text/90 font-semibold'}`}>
            {item.headline}
          </h3>
        </div>
        <span className="text-[7px] text-tactical-text/20 font-mono whitespace-nowrap flex-shrink-0">
          {timeAgo(item.publishedAt)}
        </span>
      </div>

      {/* Source */}
      <div className="text-[7px] text-tactical-text/30 font-mono mb-2">{item.source}</div>

      {/* Body (expanded) */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-tactical-border/10">
          <p className="text-[9px] text-tactical-text/60 font-mono leading-relaxed whitespace-pre-line">
            {item.body}
          </p>

          {/* Related Symbols */}
          {item.relatedSymbols.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[6px] text-tactical-text/25 font-mono">RELATED:</span>
              {item.relatedSymbols.map(sym => (
                <button
                  key={sym}
                  onClick={(e) => { e.stopPropagation(); onSelectStock(sym); }}
                  className="px-1.5 py-0.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded text-[7px] text-[#3b82f6] font-mono hover:bg-[#3b82f6]/20 transition-all"
                >
                  {sym}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Watchlist Tab ──

function WatchlistTab({ onSelectStock }) {
  const watchlist = useMarketWireStore(s => s.watchlist);
  const removeFromWatchlist = useMarketWireStore(s => s.removeFromWatchlist);
  const addToWatchlist = useMarketWireStore(s => s.addToWatchlist);
  const [addSymbol, setAddSymbol] = useState('');

  const instruments = useMemo(() => {
    return watchlist.map(sym => ALL_INSTRUMENTS.find(i => i.symbol === sym)).filter(Boolean);
  }, [watchlist]);

  const handleAdd = () => {
    const sym = addSymbol.trim().toUpperCase();
    if (sym && ALL_INSTRUMENTS.find(i => i.symbol === sym)) {
      addToWatchlist(sym);
      setAddSymbol('');
    }
  };

  return (
    <div className="p-4">
      {/* Add to watchlist */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={addSymbol}
          onChange={(e) => setAddSymbol(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add symbol (e.g. AAPL)"
          className="flex-1 bg-[#0a0e18]/60 border border-tactical-border/20 rounded px-3 py-1.5 text-[9px] font-mono text-tactical-text/70 placeholder:text-tactical-text/20 outline-none focus:border-[#f59e0b]/30"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded text-[8px] text-[#f59e0b] font-mono hover:bg-[#f59e0b]/20 transition-all"
        >
          + ADD
        </button>
      </div>

      {instruments.length === 0 ? (
        <div className="text-center py-16 text-tactical-text/20 text-[10px] font-mono">
          Your watchlist is empty. Add symbols above.
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_60px_30px] gap-2 px-3 py-1.5 text-[6px] text-tactical-text/25 font-mono tracking-[0.15em] uppercase">
            <span>Symbol</span>
            <span className="text-right">Price</span>
            <span className="text-right">Change</span>
            <span className="text-right">Mkt Cap</span>
            <span className="text-right">Type</span>
            <span />
          </div>

          {instruments.map(inst => (
            <div
              key={inst.symbol}
              onClick={() => onSelectStock(inst.symbol)}
              className="grid grid-cols-[1fr_80px_80px_80px_60px_30px] gap-2 px-3 py-2.5 bg-[#0a0e18]/40 border border-tactical-border/10 rounded-lg cursor-pointer hover:border-tactical-border/30 transition-all items-center"
            >
              <div>
                <div className="text-[10px] text-tactical-text/80 font-mono font-semibold">{inst.symbol}</div>
                <div className="text-[7px] text-tactical-text/30 font-mono truncate">{inst.name}</div>
              </div>
              <div className="text-right text-[10px] text-tactical-text/70 font-mono tabular-nums">
                €{inst.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-right text-[9px] font-mono tabular-nums ${inst.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {inst.change24h >= 0 ? '+' : ''}{inst.change24h.toFixed(2)}%
              </div>
              <div className="text-right text-[8px] text-tactical-text/40 font-mono">
                {inst.marketCapB ? `€${inst.marketCapB}B` : '-'}
              </div>
              <div className="text-right">
                <span className="text-[6px] px-1 py-0.5 rounded border font-mono uppercase" style={{
                  color: inst.type === 'crypto' ? '#f97316' : inst.type === 'stock' ? '#3b82f6' : '#9ca3af',
                  borderColor: inst.type === 'crypto' ? '#f9731630' : inst.type === 'stock' ? '#3b82f630' : '#9ca3af30',
                  backgroundColor: inst.type === 'crypto' ? '#f9731610' : inst.type === 'stock' ? '#3b82f610' : '#9ca3af10',
                }}>
                  {inst.type}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFromWatchlist(inst.symbol); }}
                className="text-[10px] text-tactical-text/20 hover:text-rose-400 transition-all"
                title="Remove from watchlist"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
