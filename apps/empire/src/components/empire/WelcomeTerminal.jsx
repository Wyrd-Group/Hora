import React, { useState } from 'react';
import { useEmpireStore } from '../../store/empireStore';

export default function WelcomeTerminal({ onComplete }) {
  const [step, setStep] = useState(0);
  const [ceoName, setCeoName] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  
  const personalBalance = useEmpireStore(state => state.personalBalance);
  const companyBalance = useEmpireStore(state => state.companyBalance);

  // If the user already has seed capital from a previous persisted session, safely unmount after render
  React.useEffect(() => {
    if (personalBalance > 0 || companyBalance > 0) {
      onComplete();
    }
  }, [personalBalance, companyBalance, onComplete]);

  if (personalBalance > 0 || companyBalance > 0) {
    return null;
  }

  const handleAuthorization = () => {
    if (ceoName.length < 2) return;
    setIsInjecting(true);

    setTimeout(() => {
      // In a real scenario, this would write to store by grabbing Zustand `set`
      // But because we use it as a pre-loader, we'll just leverage the store hook directly
      useEmpireStore.setState({ 
        personalBalance: 5_000_000, 
        companyBalance: 25_000_000,
        monthlyIncome: 0,
        netWorth: 30_000_000,
        heat: 0
      });
      onComplete();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-[#00e5ff] font-mono flex flex-col items-center justify-center p-8 overflow-hidden">
      
      {/* VCR / CRT Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMCwgMjI5LCAyNTUsIDAuMDUpIi8+PC9zdmc+')] opacity-50 z-0"></div>
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] z-10"></div>

      <div className="relative z-20 max-w-2xl w-full border border-[#00e5ff]/30 bg-black/80 backdrop-blur-sm p-8 shadow-[0_0_40px_rgba(0,229,255,0.1)]">
        
        {step === 0 && (
          <div className="animate-pulse">
            <h1 className="text-4xl font-bold tracking-widest mb-4">QUANTICO APEX SYSTEM</h1>
            <p className="text-sm opacity-70 mb-8 border-b border-[#00e5ff]/20 pb-4">INITIALIZING SECURE UPLINK... ESTABLISHED.</p>
            
            <p className="mb-4">Welcome to the Architect Sandbox.</p>
            <p className="mb-8 opacity-80 leading-relaxed text-sm">
              You have been granted access to the terminal to begin construction of your geopolitical and financial corporation. 
              The infrastructure graph contains exactly 1,000 real-world assets available for acquisition. 
              You must navigate macro-economics, asset management, and risk.
            </p>

            <button 
              onClick={() => setStep(1)}
              className="bg-[#00e5ff]/10 hover:bg-[#00e5ff]/30 border border-[#00e5ff] px-6 py-3 tracking-widest transition-all font-bold w-full text-left"
            >
              [ ENTER CREDENTIALS ]
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold tracking-widest mb-6 border-b border-[#00e5ff]/20 pb-4">IDENTITY VERIFICATION</h1>
            
            <p className="mb-4 text-sm opacity-80">Please enter the designation of the new Chief Executive Officer.</p>
            
            <input 
              type="text" 
              className="w-full bg-black border border-[#00e5ff] p-4 text-[#00e5ff] text-xl font-bold outline-none mb-8 focus:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-shadow uppercase tracking-widest"
              placeholder="CEO_NAME_"
              value={ceoName}
              onChange={e => setCeoName(e.target.value)}
              disabled={isInjecting}
              autoFocus
            />

            {!isInjecting ? (
              <button 
                onClick={handleAuthorization}
                disabled={ceoName.length < 2}
                className={`w-full p-4 tracking-[0.2em] transition-all font-bold 
                  ${ceoName.length >= 2 ? 'bg-[#00e5ff] text-black hover:bg-white cursor-pointer' : 'bg-[#00e5ff]/10 opacity-50 cursor-not-allowed border border-[#00e5ff]/30'}`}
              >
                REQUEST CAPITAL INJECTION
              </button>
            ) : (
              <div className="w-full p-4 bg-[#00e5ff]/20 border border-[#00e5ff] text-center animate-pulse">
                <p className="text-lg font-bold tracking-widest mb-2">AUTHORIZING...</p>
                <div className="text-xs opacity-70 space-y-1">
                  <p>Injecting €5,000,000 Private Wealth</p>
                  <p>Injecting €25,000,000 Corporate Treasury</p>
                  <p>Booting Palantir Network...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
