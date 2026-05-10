import React, { useState } from 'react';


const DeskOS = () => {
  const [activeTab, setActiveTab] = useState('briefing');

  return (
    <div className="flex flex-col items-center w-full h-full animate-fade-in">
      
      {/* Sub-Navigation Selector */}
      <div className="flex flex-col sm:flex-row gap-2 p-1 bg-[#111827] rounded-2xl border border-tactical-border/50 max-w-full overflow-x-auto no-scrollbar w-[90%] md:w-auto mb-4 md:mb-8 shadow-2xl shrink-0">
        <button 
          onClick={() => setActiveTab('briefing')}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex flex-col items-center transition-all w-full sm:w-40 border-b-[3px] ${activeTab === 'briefing' ? 'bg-[#0f1729] border-[#00e5ff] text-white shadow-[0_4px_15px_-4px_rgba(0,229,255,0.6)]' : 'border-transparent hover:bg-white/5 text-tactical-text/50 hover:text-white hover:border-tactical-border/50'}`}>
          <div className="font-mono flex items-center gap-2 font-bold mb-1 text-sm md:text-base">Briefing</div>
          <div className={`${activeTab === 'briefing' ? 'text-tactical-cyan' : 'text-tactical-text/40'} font-mono text-[8px] md:text-[9px] tracking-widest uppercase`}>Daily Catalysts</div>
        </button>
        <button 
          onClick={() => setActiveTab('bulletins')}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex flex-col items-center transition-all w-full sm:w-40 border-b-[3px] ${activeTab === 'bulletins' ? 'bg-[#0f1729] border-[#ef4444] text-white shadow-[0_4px_15px_-4px_rgba(239,68,68,0.6)]' : 'border-transparent hover:bg-white/5 text-tactical-text/50 hover:text-white hover:border-tactical-border/50'}`}>
          <div className={`${activeTab === 'bulletins' ? 'text-[#ef4444]' : 'text-white'} font-mono flex items-center gap-2 font-bold mb-1 text-sm md:text-base`}>Bulletins</div>
          <div className={`${activeTab === 'bulletins' ? 'text-[#ef4444]' : 'text-tactical-text/40'} font-mono text-[8px] md:text-[9px] tracking-widest uppercase`}>Live AI News</div>
        </button>
        <button 
          onClick={() => setActiveTab('intel')}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex flex-col items-center transition-all w-full sm:w-40 border-b-[3px] ${activeTab === 'intel' ? 'bg-[#0f1729] border-[#f59e0b] text-white shadow-[0_4px_15px_-4px_rgba(245,158,11,0.6)]' : 'border-transparent hover:bg-white/5 text-tactical-text/50 hover:text-white hover:border-tactical-border/50'}`}>
          <div className="font-mono flex items-center gap-2 font-bold mb-1 text-sm md:text-base">Intelligence</div>
          <div className={`${activeTab === 'intel' ? 'text-[#f59e0b]' : 'text-tactical-text/40'} font-mono text-[8px] md:text-[9px] tracking-widest uppercase`}>Models & Tools</div>
        </button>
      </div>

      {/* Content Container */}
      <div className="w-full max-w-4xl flex-1 overflow-y-auto px-4 md:px-0 pb-8">
        
        {activeTab === 'briefing' && (
          <div className="animate-fade-in flex flex-col max-w-2xl mx-auto h-full">
            <h1 className="text-tactical-cyan font-mono text-xl md:text-2xl tracking-[0.2em] uppercase mb-4 md:mb-6 text-center drop-shadow-[0_0_10px_rgba(0,229,255,0.6)] border-b border-tactical-cyan/20 pb-4 inline-block self-center">Global AI Briefing</h1>
            
            <div className="bg-black/40 border border-tactical-border/50 rounded-xl p-5 md:p-8 mb-4 shadow-lg">
              <h2 className="text-[#f59e0b] font-mono text-xs md:text-sm tracking-widest uppercase mb-4 md:mb-6 pb-2 font-bold">Top Catalysts Today</h2>
              
              <div className="mb-6 md:mb-8 border-l-2 border-tactical-cyan/50 pl-4 py-1 hover:border-tactical-cyan transition-colors">
                <h3 className="text-white font-mono mb-2 text-base md:text-lg">1. Fed Rate Decision (14:00 EST)</h3>
                <p className="text-tactical-text/70 text-xs md:text-sm font-mono leading-relaxed">Markets are pricing in a 25bps cut. Any deviation will cause massive volatility in US10Y and correlated tech equities. Prepare hedges accordingly.</p>
              </div>

              <div className="w-full h-px bg-tactical-border/30 mb-6 md:mb-8"></div>

              <div className="mb-6 md:mb-8 border-l-2 border-[#f59e0b]/50 pl-4 py-1 hover:border-[#f59e0b] transition-colors">
                <h3 className="text-white font-mono mb-2 text-base md:text-lg">2. Tech Sector Overbought</h3>
                <p className="text-tactical-text/70 text-xs md:text-sm font-mono leading-relaxed">RSI on QQQ has crossed 82. Consider taking profits on mega-cap tech or opening short-term downside protection.</p>
              </div>
            </div>
          </div>
        )}

        {/* Bulletins Tab - Live AI News Feed */}
        {activeTab === 'bulletins' && (
          <div className="animate-fade-in flex flex-col h-full max-w-2xl mx-auto">
             <div className="bg-[#111827] border border-tactical-border/50 rounded-xl p-5 md:p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 px-3 py-1 bg-[#ef4444] text-black font-bold text-[8px] md:text-[10px] uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                   LIVE AI UPDATE
                </div>
                <h3 className="text-white font-mono text-xl md:text-2xl mb-1 mt-4">Quantico Global Network</h3>
                <p className="text-[#a78bfa] text-[10px] md:text-xs font-mono mb-6 uppercase tracking-widest">Neural bulletin matrix triggers every 60 minutes.</p>
                
                <div className="flex flex-col gap-3 md:gap-4">
                   <div className="border border-tactical-border/30 rounded-lg p-4 bg-black/40 border-l-[4px] border-l-[#ef4444] hover:bg-black/60 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-[#ef4444] font-bold text-[10px] md:text-xs tracking-widest animate-pulse">BREAKING EVENT</span>
                         <span className="text-tactical-text/40 text-[8px] md:text-[10px]">14 mins ago</span>
                      </div>
                      <p className="text-white text-sm md:text-base font-mono mb-2">OPEC+ announces surprise 2M bpd production cut starting next month.</p>
                      <div className="flex gap-2">
                         <span className="bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded text-[10px] font-bold">Impact: $OIL +8.4%</span>
                         <span className="bg-[#ef4444]/10 text-[#ef4444] px-2 py-0.5 rounded text-[10px] font-bold">Impact: Transport -3.2%</span>
                      </div>
                   </div>
                   
                   <div className="border border-tactical-border/30 rounded-lg p-4 bg-black/40 border-l-[4px] border-l-[#10b981] hover:bg-black/60 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-[#10b981] font-bold text-[10px] md:text-xs tracking-widest">TECH UPDATE</span>
                         <span className="text-tactical-text/40 text-[8px] md:text-[10px]">45 mins ago</span>
                      </div>
                      <p className="text-white text-sm md:text-base font-mono mb-2">Major breakthrough in quantum encryption standard approved by IEEE.</p>
                      <div className="flex gap-2">
                         <span className="bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded text-[10px] font-bold">Impact: $CYBER +12.1%</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'intel' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 h-full">
            <div className="bg-[#111827] border border-tactical-border/30 rounded-xl p-6 hover:border-tactical-cyan/50 transition-all group cursor-pointer flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-tactical-cyan/5 pointer-events-none group-hover:to-tactical-cyan/10 transition-colors"></div>
              
              {/* Sound Waveform Visualizer */}
              <div className="flex items-end gap-1 h-12 mb-6">
                {[4,8,12,7,10,5,16,12,6,9,14,7,5].map((h, i) => (
                   <div key={i} className={`w-1.5 bg-tactical-cyan/60 rounded-t group-hover:bg-tactical-cyan animate-pulse`} style={{ height: `${h*3}px`, animationDelay: `${i*100}ms` }} />
                ))}
              </div>

              <h3 className="text-white font-mono text-lg md:text-xl mb-1 md:mb-2 font-bold text-center z-10">The Daily Alpha <span className="bg-[#f59e0b] text-black text-[8px] px-1 rounded align-middle ml-2">LIVE</span></h3>
              <p className="text-tactical-text/70 font-mono text-xs md:text-sm text-center z-10 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-tactical-cyan/20 text-tactical-cyan flex items-center justify-center text-xs">▶</span>
                Ep 42: Navigating the Yield Curve
              </p>
            </div>
            
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="bg-[#111827] border border-tactical-border/50 rounded-xl p-5 md:p-6 hover:border-tactical-cyan/50 cursor-pointer flex items-start gap-4">
                 <div className="w-10 h-10 rounded bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center text-xl shrink-0">🧮</div>
                 <div>
                   <div className="text-tactical-cyan font-mono text-[10px] tracking-widest mb-1 font-bold">TOOL</div>
                   <div className="text-white font-mono text-lg md:text-xl mb-1">DCF Calculator</div>
                   <p className="text-tactical-text/50 text-[10px] md:text-xs font-mono">Run Discounted Cash Flow models on any public asset to find true intrinsic value.</p>
                 </div>
              </div>
              <div className="bg-[#111827] border border-tactical-border/50 rounded-xl p-5 md:p-6 hover:border-tactical-cyan/50 cursor-pointer flex items-start gap-4">
                 <div className="w-10 h-10 rounded bg-[#10b981]/10 text-[#10b981] flex items-center justify-center text-xl shrink-0">📊</div>
                 <div>
                   <div className="text-tactical-cyan font-mono text-[10px] tracking-widest mb-1 font-bold">DATA</div>
                   <div className="text-white font-mono text-lg md:text-xl mb-1">Correlation Matrix</div>
                   <p className="text-tactical-text/50 text-[10px] md:text-xs font-mono">Visualize asset correlations across your portfolio to hedge perfectly.</p>
                 </div>
              </div>
            </div>
          </div>
        )}



      </div>
    </div>
  );
};

export default DeskOS;
