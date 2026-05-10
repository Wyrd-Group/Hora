import { useState } from 'react';
import { useLuxuryStore } from '../../store/luxuryStore';
import { useEmpireStore } from '../../store/empireStore';
import { LUXURY_CATALOG, LUXURY_CATEGORIES } from '../../data/luxuryCatalog';

/**
 * LuxuryStore -- Luxury item browser and owned inventory panel.
 * Filterable by category with purchase/sell actions.
 */
export default function LuxuryStore() {
  const {
    ownedItems, purchaseItem, sellItem,
    getMonthlyMaintenance, getTotalValue, getInfluenceBonus, getFollowerBonus,
  } = useLuxuryStore();

  const personalBalance = useEmpireStore(s => s.personalBalance);

  const [activeCategory, setActiveCategory] = useState('all');
  const [showOwned, setShowOwned] = useState(false);

  const ownedIds = new Set(ownedItems.map(o => o.id));

  const deductBalance = (amount) => {
    const store = useEmpireStore.getState();
    if (store.personalBalance < amount) return false;
    useEmpireStore.setState({ personalBalance: store.personalBalance - amount });
    return true;
  };

  const addBalance = (amount) => {
    useEmpireStore.setState(s => ({ personalBalance: s.personalBalance + amount }));
  };

  const filtered = activeCategory === 'all'
    ? LUXURY_CATALOG
    : LUXURY_CATALOG.filter(i => i.category === activeCategory);

  const fmt = (n) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  const categoryLabel = (cat) => cat.charAt(0).toUpperCase() + cat.slice(1);

  return (
    <div className="space-y-3 text-tactical-text">
      {/* Header Stats */}
      <div className="bg-[#0a1020] border border-tactical-border rounded p-3">
        <div className="text-[10px] tracking-widest uppercase text-tactical-text/50 font-mono mb-2">LUXURY PORTFOLIO</div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div>
            <div className="text-tactical-text/40">MONTHLY COST</div>
            <div className="text-amber-400">{fmt(getMonthlyMaintenance())}/mo</div>
          </div>
          <div>
            <div className="text-tactical-text/40">RESALE VALUE</div>
            <div className="text-emerald-400">{fmt(getTotalValue())}</div>
          </div>
          <div>
            <div className="text-tactical-text/40">INFLUENCE</div>
            <div className="text-[#00e5ff]">+{getInfluenceBonus()}</div>
          </div>
          <div>
            <div className="text-tactical-text/40">FOLLOWERS</div>
            <div className="text-purple-400">+{getFollowerBonus()}</div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-tactical-text/30 mt-2">
          Personal Balance: {fmt(personalBalance)} | Owned: {ownedItems.length} items
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => { setActiveCategory('all'); setShowOwned(false); }}
          className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider border transition-colors ${
            activeCategory === 'all' && !showOwned
              ? 'bg-[#00e5ff]/10 border-[#00e5ff]/30 text-[#00e5ff]'
              : 'bg-black/20 border-tactical-border text-tactical-text/50 hover:text-tactical-text/80'
          }`}
        >
          ALL
        </button>
        {LUXURY_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setShowOwned(false); }}
            className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider border transition-colors ${
              activeCategory === cat && !showOwned
                ? 'bg-[#00e5ff]/10 border-[#00e5ff]/30 text-[#00e5ff]'
                : 'bg-black/20 border-tactical-border text-tactical-text/50 hover:text-tactical-text/80'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
        <button
          onClick={() => setShowOwned(!showOwned)}
          className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider border transition-colors ${
            showOwned
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-black/20 border-tactical-border text-tactical-text/50 hover:text-tactical-text/80'
          }`}
        >
          OWNED ({ownedItems.length})
        </button>
      </div>

      {/* Item List */}
      {!showOwned ? (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-thin">
          {filtered.map(item => {
            const isOwned = ownedIds.has(item.id);
            const canAfford = personalBalance >= item.price;
            return (
              <div
                key={item.id}
                className={`p-2 rounded border transition-colors ${
                  isOwned
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-black/20 border-tactical-border'
                } ${!canAfford && !isOwned ? 'opacity-40' : ''}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-xs font-mono text-tactical-text">
                      {item.name}
                      {isOwned && <span className="ml-2 text-[9px] text-emerald-400">OWNED</span>}
                    </div>
                    <div className="text-[9px] font-mono text-tactical-text/30">{categoryLabel(item.category)}</div>
                  </div>
                  <div className="text-right text-[10px] font-mono text-[#00e5ff]">
                    {fmt(item.price)}
                  </div>
                </div>
                <div className="text-[9px] font-mono text-tactical-text/40 mb-1.5 line-clamp-2">
                  {item.description}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-[9px] font-mono text-tactical-text/40">
                    <span>Maint: {fmt(item.monthlyMaintenance)}/mo</span>
                    <span className="text-purple-400/70">+{item.influenceBonus} inf</span>
                    <span className="text-[#00e5ff]/50">+{item.followerBonus} fol</span>
                  </div>
                  {!isOwned && (
                    <button
                      onClick={() => purchaseItem(item, deductBalance)}
                      disabled={!canAfford}
                      className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 hover:bg-[#00e5ff]/20 disabled:opacity-30 transition-colors"
                    >
                      BUY
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Owned Items */
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-thin">
          {ownedItems.length === 0 ? (
            <div className="text-center text-[10px] font-mono text-tactical-text/30 py-8">
              No luxury items owned yet
            </div>
          ) : (
            ownedItems.map(item => (
              <div key={item.id} className="p-2 rounded border border-tactical-border bg-black/20">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-xs font-mono text-tactical-text">{item.name}</div>
                    <div className="text-[9px] font-mono text-tactical-text/30">{categoryLabel(item.category)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-emerald-400">
                      {fmt(Math.round(item.resaleValue * item.condition))}
                    </div>
                    <div className="text-[9px] font-mono text-tactical-text/30">resale</div>
                  </div>
                </div>
                {/* Condition bar */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-mono text-tactical-text/30">COND</span>
                  <div className="flex-1 h-1 rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.condition > 0.8 ? 'bg-emerald-500' :
                        item.condition > 0.6 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.condition * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-tactical-text/40">{Math.round(item.condition * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-mono text-amber-400/60">
                    {fmt(item.monthlyMaintenance)}/mo maintenance
                  </div>
                  <button
                    onClick={() => sellItem(item.id, addBalance)}
                    className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                  >
                    SELL
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
