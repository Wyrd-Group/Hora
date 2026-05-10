import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { PriceFilter, applyPriceFilter } from './PriceFilter';

export default function PerksModule({ onClose }) {
  const perks = useEmpireStore(state => state.perks);
  const buyAsset = useEmpireStore(state => state.buyAsset);
  const personalBalance = useEmpireStore(state => state.personalBalance);

  const types = [...new Set(perks.map(p => p.type))];
  const [activeType, setActiveType] = useState(types[0] || 'Lifestyle');
  const [perksSort, setPerksSort] = useState('default');
  const [perksPriceMin, setPerksPriceMin] = useState('');
  const [perksPriceMax, setPerksPriceMax] = useState('');

  const filteredPerks = applyPriceFilter(perks.filter(p => p.type === activeType), 'value', perksSort, perksPriceMin, perksPriceMax);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-sans">
      <div className="absolute inset-0 z-0" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-4xl h-[80vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900 p-6 flex justify-between items-center relative">
          <div>
            <h2 className="text-2xl font-light text-white tracking-widest uppercase">Influence & Perks</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Off-Books Assets & Geopolitical Advantages</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest">Discretionary Capital</span>
              <span className="block text-xl font-light text-white">€{personalBalance.toLocaleString()}</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white transition bg-zinc-800 rounded-full">
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Navigation */}
          <div className="w-56 border-r border-zinc-800 bg-zinc-950 p-6">
            <div className="space-y-2">
              {types.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`w-full text-left px-4 py-3 rounded-md text-xs uppercase tracking-widest transition-all ${
                    activeType === type 
                      ? 'bg-white text-black font-semibold' 
                      : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 p-8 overflow-y-auto bg-zinc-950">
            <div className="mb-3">
              <PriceFilter sortBy={perksSort} setSortBy={setPerksSort} priceMin={perksPriceMin} setPriceMin={setPerksPriceMin} priceMax={perksPriceMax} setPriceMax={setPerksPriceMax} variant="light" />
            </div>
            <div className="flex flex-col space-y-4">
              {filteredPerks.map(perk => {
                const canAfford = personalBalance >= perk.value;
                return (
                  <div key={perk.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col hover:border-zinc-700 transition-colors overflow-hidden">
                    {perk.imageUrl && (
                      <div className="h-40 w-full overflow-hidden bg-black">
                        <img src={perk.imageUrl} alt={perk.name} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-white tracking-wide">{perk.name}</h3>
                        <span className="text-sm font-mono text-zinc-300">
                          {perk.value >= 1000000 ? `€${(perk.value / 1000000).toFixed(1)}M` : `€${perk.value.toLocaleString()}`}
                        </span>
                      </div>

                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      {perk.description}
                    </p>

                    <div className="flex justify-between items-end mt-auto pt-4 border-t border-zinc-800/50">
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Game Effect</span>
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">{perk.effect}</span>
                      </div>

                      <button
                        onClick={() => {
                          if (canAfford && !perk.owned) {
                            buyAsset('perks', perk.id, perk.value);
                          }
                        }}
                        disabled={!canAfford || perk.owned}
                        className={`px-6 py-2 text-xs uppercase tracking-widest font-semibold rounded transition-all ${
                          perk.owned 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : canAfford
                            ? 'bg-white text-black hover:bg-zinc-200'
                            : 'bg-zinc-900 text-red-500/50 border border-red-900/30 cursor-not-allowed'
                        }`}
                      >
                        {perk.owned ? 'Active' : canAfford ? 'Unlock' : 'Insufficient Capital'}
                      </button>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
