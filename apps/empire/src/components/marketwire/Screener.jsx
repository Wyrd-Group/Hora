/**
 * Screener.jsx — Yahoo Finance-style instrument screener.
 * Filter and sort all instruments by type, sector, price, change.
 */

import { useState, useMemo } from 'react';
import { ALL_INSTRUMENTS } from '../../data/instruments';
import { SECTOR_COLORS } from '../../data/marketWireTemplates';
import AdCardInline from '../ads/AdCardInline';

const TYPES = ['all', 'stock', 'crypto', 'forex', 'commodity', 'bond'];
const SORT_OPTIONS = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price' },
  { key: 'change24h', label: 'Change %' },
  { key: 'marketCapB', label: 'Market Cap' },
  { key: 'name', label: 'Name' },
];

export default function Screener({ onSelectStock }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [sortBy, setSortBy] = useState('marketCapB');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  // Unique sectors
  const sectors = useMemo(() => {
    const s = new Set();
    ALL_INSTRUMENTS.forEach(i => { if (i.sector) s.add(i.sector); });
    return ['all', ...Array.from(s).sort()];
  }, []);

  // Filtered + sorted
  const instruments = useMemo(() => {
    let list = [...ALL_INSTRUMENTS];

    if (typeFilter !== 'all') {
      list = list.filter(i => i.type === typeFilter);
    }
    if (sectorFilter !== 'all') {
      list = list.filter(i => i.sector === sectorFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.symbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        (i.sector || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let va = a[sortBy] ?? 0;
      let vb = b[sortBy] ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [typeFilter, sectorFilter, sortBy, sortDir, search]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbol or name..."
          className="bg-[#0a0e18]/60 border border-tactical-border/20 rounded px-3 py-1.5 text-[9px] font-mono text-tactical-text/70 placeholder:text-tactical-text/20 outline-none focus:border-[#f59e0b]/30 w-[200px]"
        />

        {/* Type Filter */}
        <div className="flex items-center gap-1">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-1 rounded text-[7px] font-mono tracking-[0.1em] uppercase transition-all ${
                typeFilter === t
                  ? 'text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30'
                  : 'text-tactical-text/25 border border-transparent hover:text-tactical-text/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sector dropdown (only for stocks) */}
        {(typeFilter === 'all' || typeFilter === 'stock') && (
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-[#0a0e18]/60 border border-tactical-border/20 rounded px-2 py-1 text-[8px] font-mono text-tactical-text/50 outline-none"
          >
            {sectors.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</option>
            ))}
          </select>
        )}

        <span className="text-[7px] text-tactical-text/20 font-mono ml-auto">{instruments.length} INSTRUMENTS</span>
      </div>

      {/* Table */}
      <div className="bg-[#0a0e18]/60 border border-tactical-border/15 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_50px_80px_80px_80px_60px] gap-2 px-4 py-2 text-[6px] text-tactical-text/25 font-mono tracking-[0.15em] uppercase border-b border-tactical-border/10">
          {[
            { key: 'symbol', label: 'Symbol', col: '' },
            { key: 'type', label: 'Type', col: 'text-center' },
            { key: 'price', label: 'Price', col: 'text-right' },
            { key: 'change24h', label: '24h %', col: 'text-right' },
            { key: 'marketCapB', label: 'Mkt Cap', col: 'text-right' },
          ].map(({ key, label, col }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`${col} hover:text-tactical-text/50 transition-all flex items-center gap-0.5 ${col.includes('right') ? 'justify-end' : col.includes('center') ? 'justify-center' : ''}`}
            >
              {label}
              {sortBy === key && <span className="text-[#f59e0b]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
          <span className="text-right">Sector</span>
        </div>

        {/* Rows */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {instruments.map(inst => (
            <div
              key={inst.id}
              onClick={() => onSelectStock(inst.symbol)}
              className="grid grid-cols-[1fr_50px_80px_80px_80px_60px] gap-2 px-4 py-2 cursor-pointer hover:bg-white/[0.02] transition-all border-b border-tactical-border/[0.03] items-center"
            >
              <div>
                <div className="text-[9px] text-tactical-text/80 font-mono font-semibold">{inst.symbol}</div>
                <div className="text-[7px] text-tactical-text/30 font-mono truncate">{inst.name}</div>
              </div>
              <div className="text-center">
                <span className="text-[6px] px-1 py-0.5 rounded border font-mono uppercase" style={{
                  color: inst.type === 'crypto' ? '#f97316' : inst.type === 'stock' ? '#3b82f6' : inst.type === 'forex' ? '#8b5cf6' : inst.type === 'commodity' ? '#f59e0b' : '#10b981',
                  borderColor: `${inst.type === 'crypto' ? '#f97316' : inst.type === 'stock' ? '#3b82f6' : '#9ca3af'}30`,
                  backgroundColor: `${inst.type === 'crypto' ? '#f97316' : inst.type === 'stock' ? '#3b82f6' : '#9ca3af'}10`,
                }}>
                  {inst.type}
                </span>
              </div>
              <div className="text-right text-[9px] text-tactical-text/70 font-mono tabular-nums">
                €{inst.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-right text-[9px] font-mono tabular-nums ${inst.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {inst.change24h >= 0 ? '+' : ''}{inst.change24h.toFixed(2)}%
              </div>
              <div className="text-right text-[8px] text-tactical-text/40 font-mono tabular-nums">
                {inst.marketCapB ? `€${inst.marketCapB}B` : '-'}
              </div>
              <div className="text-right">
                {inst.sector && (
                  <span className="text-[6px] text-tactical-text/30 font-mono" style={{ color: SECTOR_COLORS[inst.sector] || '#6b7280' }}>
                    {inst.sector}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdCardInline variant="wide" />
    </div>
  );
}
