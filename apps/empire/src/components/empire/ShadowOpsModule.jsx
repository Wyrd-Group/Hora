import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import { PriceFilter, applyPriceFilter } from './PriceFilter';

export default function ShadowOpsModule({ onClose }) {
  const shadowOps = useEmpireStore(state => state.shadowOps);
  const executeShadowOp = useEmpireStore(state => state.executeShadowOp);
  const heat = useEmpireStore(state => state.heat);

  const [activeOp, setActiveOp] = useState(null);
  const [executionLog, setExecutionLog] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [shadowSort, setShadowSort] = useState('default');
  const [shadowPriceMin, setShadowPriceMin] = useState('');
  const [shadowPriceMax, setShadowPriceMax] = useState('');

  const handleExecute = () => {
    if (!activeOp) return;
    setIsExecuting(true);
    setExecutionLog(null);

    // Simulate connection delay for dramatic effect
    setTimeout(() => {
      const result = executeShadowOp(activeOp.id);
      setExecutionLog(result);
      setIsExecuting(false);
      
      // Clear active selection since it gets removed from the pool in the store
      if (result) {
        setTimeout(() => setActiveOp(null), 3000);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 font-mono text-red-500 overflow-hidden">
      
      {/* Background CRT scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LCAwLCAwLCAwLjA1KSIvPjwvc3ZnPg==')] opacity-50 z-0"></div>

      <div className="absolute inset-0 z-0" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-black border-2 border-red-900 shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col">
        
        {/* Terminal Header */}
        <div className="border-b-2 border-red-900 bg-red-950/20 p-2 flex justify-between items-center text-xs uppercase tracking-[0.3em]">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-600 animate-pulse"></span>
            <span>CLASSIFIED // NO_FORN // OMEGA_CLEARANCE</span>
          </div>
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-red-900 mr-2">SYS_HEAT:</span>
              <span className={`font-bold ${heat > 80 ? 'text-red-500 animate-pulse' : 'text-red-400'}`}>
                {heat}%
              </span>
            </div>
            <button onClick={onClose} className="hover:bg-red-900 hover:text-black px-4 transition-colors">
              ABORT
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          
          {/* Operations List */}
          <div className="w-1/3 border-r-2 border-red-900 flex flex-col items-stretch overflow-y-auto custom-scrollbar bg-black p-4 space-y-4">
            <div className="text-[10px] text-red-900 mb-2">AVAILABLE TARGETS</div>
            <PriceFilter sortBy={shadowSort} setSortBy={setShadowSort} priceMin={shadowPriceMin} setPriceMin={setShadowPriceMin} priceMax={shadowPriceMax} setPriceMax={setShadowPriceMax} variant="red" label="€ reward" />

            {shadowOps.length === 0 ? (
              <div className="text-red-900 text-xs text-center border border-red-900/50 border-dashed p-4">
                NO ACTIVE INTEL DOQUETS
              </div>
            ) : (
              applyPriceFilter(shadowOps, 'reward', shadowSort, shadowPriceMin, shadowPriceMax).map(op => (
                <div 
                  key={op.id}
                  onClick={() => !isExecuting && setActiveOp(op)}
                  className={`border-l-4 p-3 cursor-pointer transition-all ${
                    activeOp?.id === op.id 
                      ? 'border-red-500 bg-red-950/40 translate-x-2' 
                      : 'border-red-900/50 bg-black hover:border-red-600 hover:bg-red-950/10'
                  }`}
                >
                  <div className="text-sm font-bold truncate">{op.name}</div>
                  <div className="flex justify-between text-[10px] mt-2 opacity-70">
                    <span>{op.type}</span>
                    <span>Win_Prob: {op.successRate}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Operation Details Terminal */}
          <div className="w-2/3 bg-[#050000] p-8 flex flex-col relative">
            {activeOp ? (
              <div className="flex-1 flex flex-col">
                <h1 className="text-3xl font-bold text-red-600 mb-2 tracking-tighter uppercase">{activeOp.name}</h1>
                <div className="text-xs text-red-900 mb-8 font-bold tracking-[0.2em] uppercase border-b border-red-900/50 pb-2">
                  TARGET: <span className="text-white bg-red-950 px-2">{activeOp.targetEntity}</span>
                </div>

                <div className="flex bg-red-950/20 border border-red-900 p-4 space-x-8 mb-8 text-sm">
                  <div className="flex-1">
                    <span className="block text-[10px] text-red-900 mb-1">PROBABILITY OF SUCCESS</span>
                    <span className="text-2xl text-white font-bold">{activeOp.successRate}%</span>
                  </div>
                  <div className="flex-1">
                    <span className="block text-[10px] text-red-900 mb-1">PROJECTED PAYOUT</span>
                    <span className="text-2xl text-emerald-500 font-bold">
                      {activeOp.reward > 0 ? `€${(activeOp.reward / 1_000_000).toFixed(1)}M` : 'NON-FINANCIAL'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="block text-[10px] text-red-900 mb-1">EXPOSURE INFLATION (HEAT)</span>
                    <span className="text-2xl text-red-600 font-bold">+{activeOp.heatGain}</span>
                  </div>
                </div>

                <div className="text-sm leading-relaxed text-red-400 mb-auto font-sans tracking-wide">
                  <span className="bg-red-900 text-black px-1 mr-2 font-bold mb-1">BRIEFING:</span>
                  {activeOp.description}
                </div>

                {/* Execution Module */}
                <div className="mt-8 border-t-2 border-red-900 pt-6">
                  {isExecuting ? (
                    <div className="bg-red-950 text-red-500 p-4 border border-red-600 animate-pulse text-center font-bold tracking-widest text-lg">
                      ESTABLISHING SECURE UPLINK... STAND BY
                    </div>
                  ) : executionLog ? (
                    <div className={`p-4 border text-center font-bold tracking-widest uppercase text-lg ${
                      executionLog.success ? 'bg-emerald-950 border-emerald-600 text-emerald-500' : 'bg-red-950 border-red-600 text-red-500'
                    }`}>
                      {executionLog.success ? (
                        <>OPERATION SUCCESSFUL. PAYOUT SECURED: +€{(executionLog.reward / 1_000_000).toFixed(1)}M</>
                      ) : (
                        <>CRITICAL FAILURE. OPERATION COMPROMISED. HEAT INSTANTLY INCREASED BY {executionLog.heatGain}.</>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={handleExecute}
                      className="w-full bg-red-900 hover:bg-red-600 text-black font-bold p-4 tracking-[0.2em] text-xl transition-all uppercase"
                    >
                      AUTHORIZE STRIKE
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <div className="tracking-[0.5em] uppercase text-xl">Awaiting Authorization</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
