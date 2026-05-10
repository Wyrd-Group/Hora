import React, { useState } from 'react';

/**
 * Reusable list toolbar for search, sort, and filter.
 *
 * Props:
 *   search        - current search string
 *   onSearch       - (val) => void
 *   placeholder    - search input placeholder
 *   sortOptions    - [{ key, label }]   e.g. [{ key: 'income', label: 'Income' }]
 *   sortKey        - current sort key
 *   sortDir        - 'asc' | 'desc'
 *   onSort         - (key, dir) => void
 *   filterPills    - [{ key, label, color? }]
 *   activeFilter   - current filter key
 *   onFilter       - (key) => void
 *   count          - total items after filtering
 *   flouLevel      - current FLOU level (0-10)
 *   flouRequired   - minimum FLOU level for this section (0 = always available)
 *   flouLabel      - label for the locked feature (e.g. "Advanced Sorting")
 */
export default function ListToolbar({
  search, onSearch, placeholder = 'Search...',
  sortOptions, sortKey, sortDir, onSort,
  filterPills, activeFilter, onFilter,
  count,
  flouLevel = 10, flouRequired = 0, flouLabel,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const isLocked = flouLevel < flouRequired;

  return (
    <div className="space-y-2 mb-3">
      {/* Search Row */}
      {onSearch && (
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tactical-text/30 text-[10px]">⌕</span>
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-tactical-bg/60 border border-tactical-border/30 rounded-lg pl-7 pr-3 py-2 text-[10px] font-mono text-tactical-text/80 placeholder-tactical-text/25 focus:outline-none focus:border-[#00e5ff]/40 transition-colors"
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tactical-text/30 hover:text-tactical-text/60 text-[10px] font-mono">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Sort + Count Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Sort Dropdown */}
        {sortOptions && sortOptions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => !isLocked && setSortOpen(!sortOpen)}
              className={`flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-lg border transition-all ${
                isLocked
                  ? 'text-tactical-text/20 border-tactical-border/10 cursor-not-allowed'
                  : 'text-tactical-text/50 border-tactical-border/20 hover:text-tactical-text/80 hover:border-tactical-border/40 cursor-pointer'
              }`}
              title={isLocked ? `FLOU Level ${flouRequired} required` : 'Sort'}
            >
              {isLocked && <span className="text-[8px]">🔒</span>}
              <span>Sort: {sortOptions.find(o => o.key === sortKey)?.label || 'Default'}</span>
              <span className="text-[6px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
            </button>
            {sortOpen && !isLocked && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                <div className="absolute top-full left-0 mt-1 bg-[#0a0e18] border border-tactical-border/30 rounded-lg shadow-2xl z-50 min-w-[140px] py-1 max-h-60 overflow-y-auto">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (sortKey === opt.key) {
                          onSort(opt.key, sortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          onSort(opt.key, 'desc');
                        }
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[9px] font-mono transition-all flex items-center justify-between ${
                        sortKey === opt.key
                          ? 'text-[#00e5ff] bg-[#00e5ff]/5'
                          : 'text-tactical-text/50 hover:text-tactical-text/80 hover:bg-white/[0.03]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortKey === opt.key && <span className="text-[7px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Count badge */}
        {count !== undefined && (
          <span className="text-[8px] font-mono text-tactical-text/30 tabular-nums">
            {count} items
          </span>
        )}
      </div>

      {/* Filter Pills */}
      {filterPills && filterPills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filterPills.map(pill => {
            const isActive = activeFilter === pill.key;
            const pillColor = pill.color || '#00e5ff';
            return (
              <button
                key={pill.key}
                onClick={() => onFilter(pill.key)}
                className={`px-2.5 py-1 rounded-md text-[8px] font-mono uppercase tracking-[0.08em] border transition-all ${
                  isActive
                    ? 'font-bold'
                    : 'border-transparent text-tactical-text/40 hover:text-tactical-text/70 bg-tactical-bg/40 hover:bg-tactical-bg/60'
                }`}
                style={isActive ? {
                  color: pillColor,
                  borderColor: `${pillColor}40`,
                  backgroundColor: `${pillColor}10`,
                } : {}}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      )}

      {/* FLOU Lock Banner */}
      {isLocked && flouLabel && (
        <div className="flex items-center gap-2 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-lg px-3 py-2">
          <span className="text-[10px]">🔒</span>
          <div className="flex-1">
            <div className="text-[8px] font-mono text-[#f59e0b] font-bold">{flouLabel} — FLOU Level {flouRequired} Required</div>
            <div className="text-[7px] font-mono text-tactical-text/30">Complete foundation courses to unlock. Current: Level {flouLevel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
