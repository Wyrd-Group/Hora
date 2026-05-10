import React, { useState } from 'react';

const FocusOS = () => {
  const [activeTab, setActiveTab] = useState('timer');

  return (
    <div className="flex flex-col items-center w-full h-full animate-fade-in">
      
      {/* Sub-Navigation Selector */}
      <div className="flex flex-col sm:flex-row gap-2 p-1 bg-[#111827] rounded-2xl border border-tactical-border/50 w-[90%] md:w-auto max-w-fit mb-4 md:mb-8 shadow-2xl">
        <button 
          onClick={() => setActiveTab('timer')}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex flex-col items-center transition-all w-full sm:w-48 border-b-[3px] ${activeTab === 'timer' ? 'bg-[#0f1729] border-[#00e5ff] text-white shadow-[0_4px_15px_-4px_rgba(0,229,255,0.6)]' : 'border-transparent hover:bg-white/5 text-tactical-text/50 hover:text-white hover:border-tactical-border/50'}`}>
          <div className="font-mono flex items-center gap-2 font-bold mb-1 text-sm md:text-base">Focus Timer</div>
          <div className={`${activeTab === 'timer' ? 'text-tactical-cyan' : 'text-tactical-text/40'} font-mono text-[8px] md:text-[9px] tracking-widest uppercase`}>Passive Income</div>
        </button>
        <button 
          onClick={() => setActiveTab('projects')}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl flex flex-col items-center transition-all w-full sm:w-48 border-b-[3px] ${activeTab === 'projects' ? 'bg-[#0f1729] border-[#10b981] text-white shadow-[0_4px_15px_-4px_rgba(16,185,129,0.6)]' : 'border-transparent hover:bg-white/5 text-tactical-text/50 hover:text-white hover:border-tactical-border/50'}`}>
          <div className="font-mono flex items-center gap-2 font-bold mb-1 text-sm md:text-base">Projects</div>
          <div className={`${activeTab === 'projects' ? 'text-[#10b981]' : 'text-tactical-text/40'} font-mono text-[8px] md:text-[9px] tracking-widest uppercase`}>Department Queue</div>
        </button>
      </div>

      {/* Content Container */}
      <div className="w-full max-w-3xl flex-1 overflow-y-auto px-4 md:px-0 pb-8">
        
        {activeTab === 'timer' && (
          <div className="animate-fade-in flex flex-col items-center justify-center h-full max-w-md mx-auto md:-mt-10 mt-0">
            <div className="relative w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,229,255,0.1)] rounded-full bg-black/40">
               {/* SVG Progress Ring */}
               <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                 {/* Background Track */}
                 <circle cx="50" cy="50" r="48" fill="none" stroke="#111827" strokeWidth="2" />
                 {/* Progress Arc */}
                 <circle cx="50" cy="50" r="48" fill="none" stroke="#00e5ff" strokeWidth="2"
                         strokeDasharray="301.59" strokeDashoffset="250" strokeLinecap="round"
                         className="transition-all duration-1000 ease-linear shadow-[0_0_15px_#00e5ff]" />
               </svg>
               <div className="absolute inset-2 bg-gradient-to-t from-tactical-cyan/10 to-transparent animate-pulse rounded-full pointer-events-none"></div>
               <div className="text-[64px] md:text-[90px] text-white font-mono leading-none tracking-tight drop-shadow-[0_0_15px_rgba(0,229,255,0.8)] z-10 font-bold mb-2">25:00</div>
               <div className="text-tactical-cyan font-mono tracking-[0.3em] text-[8px] md:text-[10px] z-10 font-bold">READY TO DEPLOY</div>
            </div>
            
            <button className="w-64 md:w-80 mt-8 md:mt-10 py-4 bg-[#10b981] text-black font-bold font-mono tracking-widest rounded-lg hover:brightness-125 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] text-sm md:text-base border border-[#10b981]">
              INITIATE FOCUS RUN
            </button>
            <div className="flex w-64 md:w-80 justify-between mt-4 text-xs font-mono text-tactical-text/50">
               <span>Estimated Yield:</span>
               <span className="text-[#10b981] font-bold">+€75.00</span>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="animate-fade-in flex flex-col max-w-2xl mx-auto h-full gap-4 mt-2 md:mt-4">
             <div className="border border-tactical-border/50 bg-[#111827] rounded-xl p-5 md:p-6 flex flex-col relative overflow-hidden hover:border-[#10b981]/40 transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 w-2 h-full bg-[#10b981]"></div>
                <div className="text-[#10b981] text-[10px] md:text-xs font-mono mb-2 tracking-widest font-bold">HR DEPARTMENT</div>
                <div className="text-white font-mono text-xl md:text-2xl mb-4 md:mb-6 font-bold">Employee Training</div>
                 <div className="flex justify-between items-center text-[10px] md:text-xs text-tactical-text/50 font-mono mb-2 md:mb-3">
                  <span>Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-4 h-2 rounded-sm bg-[#10b981] shadow-[0_0_8px_#10b981]"></div>
                      <div className="w-4 h-2 rounded-sm bg-[#10b981] shadow-[0_0_8px_#10b981]"></div>
                      <div className="w-4 h-2 rounded-sm bg-[#10b981] shadow-[0_0_8px_#10b981]"></div>
                      <div className="w-4 h-2 rounded-sm bg-black border border-tactical-border/30"></div>
                      <div className="w-4 h-2 rounded-sm bg-black border border-tactical-border/30"></div>
                    </div>
                    <span className="text-white">3/5</span>
                  </div>
                 </div>
              </div>

              <div className="border border-tactical-border/50 bg-[#111827] rounded-xl p-5 md:p-6 flex flex-col relative overflow-hidden hover:border-[#f59e0b]/40 transition-colors cursor-pointer">
                 <div className="absolute top-0 right-0 w-2 h-full bg-[#f59e0b]"></div>
                 <div className="text-[#f59e0b] text-[10px] md:text-xs font-mono mb-2 tracking-widest font-bold">R&D LAB</div>
                 <div className="text-white font-mono text-xl md:text-2xl mb-4 md:mb-6 font-bold">Patent Filing</div>
                 <div className="flex justify-between items-center text-[10px] md:text-xs text-tactical-text/50 font-mono mb-2 md:mb-3">
                  <span>Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-4 h-2 rounded-sm bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"></div>
                      <div className="w-4 h-2 rounded-sm bg-black border border-tactical-border/30"></div>
                      <div className="w-4 h-2 rounded-sm bg-black border border-tactical-border/30"></div>
                      <div className="w-4 h-2 rounded-sm bg-black border border-tactical-border/30"></div>
                      <div className="w-4 h-2 rounded-sm bg-black border border-tactical-border/30"></div>
                    </div>
                    <span className="text-white">1/5</span>
                  </div>
                 </div>
              </div>
             
             <button className="border border-tactical-border border-dashed bg-transparent rounded-xl p-5 md:p-6 font-mono text-tactical-text/50 tracking-widest hover:border-tactical-cyan hover:text-tactical-cyan transition-colors mt-2 uppercase text-xs md:text-sm font-bold">
               + Assign New Project
             </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default FocusOS;
