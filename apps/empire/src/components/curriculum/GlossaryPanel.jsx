import React, { useState, useMemo } from 'react';
import { glossaryTerms, GLOSSARY_CATEGORIES } from '../../data/glossary';

/**
 * GlossaryPanel — searchable glossary with category filter pills.
 * Renders as a full tab content area.
 */
export default function GlossaryPanel() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [expandedTerm, setExpandedTerm] = useState(null);

  const categories = Object.entries(GLOSSARY_CATEGORIES);

  const filtered = useMemo(() => {
    let terms = glossaryTerms;
    if (activeCategory) {
      terms = terms.filter(t => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      terms = terms.filter(t =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
      );
    }
    return terms.sort((a, b) => a.term.localeCompare(b.term));
  }, [search, activeCategory]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
      {/* Search */}
      <div className="mb-4 shrink-0">
        <input
          type="text"
          placeholder="Search glossary..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 text-xs font-mono text-tactical-text placeholder:text-tactical-text/30 focus:outline-none focus:border-[#00e5ff]/40"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 flex-wrap mb-4 shrink-0">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all
            ${!activeCategory ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30' : 'bg-white/[0.04] text-tactical-text/40 border border-white/[0.06] hover:bg-white/[0.06]'}`}
        >
          ALL ({glossaryTerms.length})
        </button>
        {categories.map(([key, cat]) => {
          const count = glossaryTerms.filter(t => t.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all border
                ${activeCategory === key
                  ? `text-white border-current`
                  : 'bg-white/[0.04] text-tactical-text/40 border-white/[0.06] hover:bg-white/[0.06]'}`}
              style={activeCategory === key ? { backgroundColor: `${cat.color}25`, borderColor: `${cat.color}50`, color: cat.color } : {}}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Terms list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {filtered.length === 0 && (
          <p className="text-xs font-mono text-tactical-text/30 py-8 text-center">No matching terms found.</p>
        )}
        {filtered.map(term => {
          const catConfig = GLOSSARY_CATEGORIES[term.category];
          const color = catConfig?.color ?? '#888';
          const expanded = expandedTerm === term.term;
          return (
            <button
              key={term.term}
              onClick={() => setExpandedTerm(expanded ? null : term.term)}
              className="w-full text-left rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[8px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded shrink-0"
                  style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                >
                  {catConfig?.label ?? term.category}
                </span>
                <span className="text-xs font-mono font-bold text-tactical-text">{term.term}</span>
              </div>

              <p className="text-[11px] font-mono text-tactical-text/60 mt-1.5">{term.definition}</p>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                  {term.why && (
                    <div>
                      <span className="text-[9px] font-mono font-bold text-[#00e5ff] tracking-widest">WHY IT MATTERS</span>
                      <p className="text-[11px] font-mono text-tactical-text/50 mt-0.5">{term.why}</p>
                    </div>
                  )}
                  {term.interpret && (
                    <div>
                      <span className="text-[9px] font-mono font-bold text-[#f59e0b] tracking-widest">HOW TO INTERPRET</span>
                      <p className="text-[11px] font-mono text-tactical-text/50 mt-0.5">{term.interpret}</p>
                    </div>
                  )}
                  {term.marketEffect && (
                    <div>
                      <span className="text-[9px] font-mono font-bold text-[#10b981] tracking-widest">MARKET EFFECT</span>
                      <p className="text-[11px] font-mono text-tactical-text/50 mt-0.5">{term.marketEffect}</p>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
