import React, { useState } from 'react';
import ShoppingModal from './ShoppingModal';
import AdCardInline from '../ads/AdCardInline';

export default function ShoppingHub() {
  const [activeTier, setActiveTier] = useState(null);

  // The 4 distinct internet hubs scaling by socioeconomic class
  const portals = [
    {
      id: 'Poor',
      name: 'SurplusCity',
      slogan: 'Survival essentials & deep discounts.',
      color: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500',
      icon: '🛒',
      desc: 'Second-hand goods, bulk calories, and basic transport to keep you moving.'
    },
    {
      id: 'Medium',
      name: 'MainStreet Direct',
      slogan: 'Curated consumer lifestyle.',
      color: 'bg-blue-900/20 text-blue-400 border-blue-900/50 hover:border-blue-500',
      icon: '🛍️',
      desc: 'Gadgets, nice cars, and standard luxury to signal your ascent to middle management.'
    },
    {
      id: 'High',
      name: 'The Executive Port',
      slogan: 'Excellence without compromise.',
      color: 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50 hover:border-emerald-500',
      icon: '💎',
      desc: 'Exclusive real estate, supercars, and timepieces for those who govern the market.'
    },
    {
      id: 'Ultra',
      name: 'The Vault',
      slogan: 'Acquisitions for the Global Elite.',
      color: 'bg-black text-[#d4af37] border-white/10 hover:border-[#d4af37]/50 shadow-[0_0_20px_rgba(212,175,55,0.05)] hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]',
      icon: '🏛️',
      desc: 'Priceless art, megayachts, and physical assets that dictate geopolitical dominance.'
    }
  ];

  if (activeTier) {
    return <ShoppingModal tier={activeTier} onClose={() => setActiveTier(null)} />;
  }

  return (
    <div className="flex flex-col h-full w-full p-6 bg-[#030508] text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-widest text-white uppercase mb-2">Global Commerce Network</h1>
        <p className="text-xs text-white/40 uppercase tracking-widest leading-relaxed max-w-2xl">
          Welcome to the shadow internet. Your digital gateway to acquiring physical assets. Select a marketplace gateway corresponding to your current capital structure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {portals.map(portal => (
          <div 
            key={portal.id}
            onClick={() => setActiveTier(portal.id)}
            className={`border rounded-xl p-8 flex flex-col justify-between cursor-pointer transition-all duration-500 relative overflow-hidden group ${portal.color}`}
          >
            {/* Background shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative z-10">
              <div className="text-4xl mb-4 opacity-80">{portal.icon}</div>
              <h2 className="text-2xl font-bold tracking-wider mb-1">{portal.name}</h2>
              <h3 className="text-xs uppercase tracking-widest opacity-60 mb-6">{portal.slogan}</h3>
            </div>
            
            <div className="relative z-10 mt-auto">
              <p className="text-sm opacity-80 leading-relaxed max-w-md">
                {portal.desc}
              </p>
              
              <div className="mt-6 flex items-center space-x-2 text-xs uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <span>Access Terminal</span>
                <span>→</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdCardInline variant="wide" />
    </div>
  );
}
