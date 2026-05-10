import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { PriceFilter, applyPriceFilter } from './PriceFilter';

// Aesthetic configuration mapped to each tier
const TIER_THEMES = {
  Poor: {
    bg: 'bg-zinc-900 border-zinc-700',
    headerBg: 'bg-zinc-800',
    titleColor: 'text-zinc-300',
    titleText: 'SURPLUS CITY',
    slogan: 'NO QUESTIONS ASKED RETURNS. WITHIN 5 MINUTES.',
    cardBg: 'bg-zinc-800 border-zinc-700 hover:border-zinc-500',
    buttonAccent: 'bg-zinc-600 text-white hover:bg-zinc-500',
    font: 'font-sans'
  },
  Medium: {
    bg: 'bg-slate-900 border-blue-900',
    headerBg: 'bg-slate-800 border-blue-900',
    titleColor: 'text-blue-400',
    titleText: 'MAINSTREET DIRECT',
    slogan: 'DISCOVER YOUR LIFESTYLE.',
    cardBg: 'bg-slate-800 border-blue-900/50 hover:border-blue-500',
    buttonAccent: 'bg-blue-600 text-white hover:bg-blue-500',
    font: 'font-sans'
  },
  High: {
    bg: 'bg-emerald-950 border-emerald-900',
    headerBg: 'bg-emerald-900 border-emerald-800',
    titleColor: 'text-emerald-400',
    titleText: 'THE EXECUTIVE PORT',
    slogan: 'PREMIUM ASSETS SECURED.',
    cardBg: 'bg-emerald-900/40 border-emerald-800 hover:border-emerald-500',
    buttonAccent: 'bg-emerald-600 text-white hover:bg-emerald-500',
    font: 'font-sans'
  },
  Ultra: {
    bg: 'bg-[#0c0c0c] border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/10',
    headerBg: 'bg-gradient-to-r from-black via-zinc-900 to-black border-white/10',
    titleColor: 'text-[#d4af37]',
    titleText: 'THE VAULT',
    slogan: 'ACQUISITIONS FOR THE GLOBAL ELITE.',
    cardBg: 'bg-[#141414] border-white/5 hover:border-[#d4af37]/40',
    buttonAccent: 'bg-[#d4af37] text-black hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]',
    font: 'font-sans font-light'
  }
};

export default function ShoppingModal({ tier, onClose }) {
  const shoppingAssets = useEmpireStore(state => state.shoppingAssets);
  const buyAsset = useEmpireStore(state => state.buyAsset);
  const personalBalance = useEmpireStore(state => state.personalBalance);

  const theme = TIER_THEMES[tier] || TIER_THEMES.Medium;

  // Filter items by the selected tier
  const tierAssets = shoppingAssets.filter(asset => asset.tier === tier);
  
  // Extract unique categories for this tier
  const categories = [...new Set(tierAssets.map(asset => asset.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] || 'All');
  const [shopSort, setShopSort] = useState('default');
  const [shopPriceMin, setShopPriceMin] = useState('');
  const [shopPriceMax, setShopPriceMax] = useState('');

  const filteredAssets = applyPriceFilter(tierAssets.filter(asset => asset.category === activeCategory), 'value', shopSort, shopPriceMin, shopPriceMax);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md ${theme.font}`}>
      <div className="absolute inset-0 z-0" onClick={onClose} />
      
      <div className={`relative z-10 w-full max-w-7xl max-h-[90vh] border rounded-2xl overflow-hidden flex flex-col ${theme.bg}`}>
        
        {/* Header */}
        <div className={`flex-shrink-0 border-b p-6 flex justify-between items-center ${theme.headerBg}`}>
          <div>
            <h2 className={`text-3xl tracking-widest uppercase ${theme.titleColor} ${tier === 'Ultra' ? 'font-light' : 'font-bold'}`}>
              {theme.titleText}
            </h2>
            <p className="text-white/50 text-sm mt-1 tracking-wider uppercase">{theme.slogan}</p>
          </div>
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <span className="block text-xs text-white/40 uppercase tracking-widest">Available Capital</span>
              <span className="block text-xl font-mono text-white">€{personalBalance.toLocaleString()}</span>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition bg-white/5 rounded-full"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Category Navigation */}
          <div className="w-64 flex-shrink-0 border-r border-white/5 bg-black/20 p-6 flex flex-col space-y-6 overflow-y-auto">
            <span className="text-xs uppercase tracking-[0.2em] text-white/30">Departments</span>
            <div className="flex flex-col space-y-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-left px-4 py-3 rounded-md transition-all duration-300 uppercase tracking-widest text-sm ${
                    activeCategory === cat 
                      ? 'bg-white/10 text-white font-bold' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid Array */}
          <div className="flex-1 overflow-y-auto p-8 bg-black/10">
            <div className="mb-4">
              <PriceFilter sortBy={shopSort} setSortBy={setShopSort} priceMin={shopPriceMin} setPriceMin={setShopPriceMin} priceMax={shopPriceMax} setPriceMax={setShopPriceMax} variant="light" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {filteredAssets.map(asset => {
                const canAfford = personalBalance >= asset.value;
                return (
                  <div key={asset.id} className={`group relative flex flex-col border rounded-xl overflow-hidden transition-all duration-500 ${theme.cardBg}`}>
                    {/* Image Area */}
                    <div className="h-64 overflow-hidden relative bg-black/50 flex items-center justify-center">
                      {asset.imageUrl ? (
                        <img 
                          src={asset.imageUrl} 
                          alt={asset.name} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        />
                      ) : (
                        <div className="text-white/20 uppercase tracking-widest text-sm">Image Pending</div>
                      )}
                      
                      {asset.owned && (
                        <div className="absolute top-4 right-4 bg-white text-black px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm shadow-lg">
                          Owned
                        </div>
                      )}
                    </div>

                    {/* Metadata Area */}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-medium text-white/90 leading-tight">{asset.name}</h3>
                          {tier === 'Ultra' && <span className="text-xs text-[#d4af37] uppercase tracking-widest mt-1 block">Certified Authentic</span>}
                        </div>
                        <div className="text-right">
                          <span className="block text-2xl font-mono text-white">
                            {asset.value >= 1000000 ? `€${(asset.value / 1000000).toFixed(1)}M` : `€${asset.value.toLocaleString()}`}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-white/50 leading-relaxed mb-6 flex-1">
                        {asset.description}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center space-x-2">
                          {asset.yieldMultiplier > 1.0 && (
                            <>
                              <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                              <span className="text-xs text-white/40 uppercase tracking-wider">Yield Buff: +{((asset.yieldMultiplier - 1) * 100).toFixed(1)}%</span>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (canAfford && !asset.owned) {
                              buyAsset('shoppingAssets', asset.id, asset.value);
                            }
                          }}
                          disabled={!canAfford || asset.owned}
                          className={`px-8 py-3 rounded text-sm uppercase tracking-widest transition-all duration-300 ${
                            asset.owned
                              ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
                              : canAfford
                              ? theme.buttonAccent
                              : 'bg-white/5 text-red-400/50 cursor-not-allowed border border-red-500/20'
                          }`}
                        >
                          {asset.owned ? 'Purchased' : canAfford ? 'Buy Now' : 'Insufficient Capital'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredAssets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-white/30 uppercase tracking-widest text-sm">
                No inventory available in this category.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
