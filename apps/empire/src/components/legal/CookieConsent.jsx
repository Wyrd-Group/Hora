import React, { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('aegis-cookie-consent');
    if (consent !== 'accepted' && consent !== 'declined') {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('aegis-cookie-consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('aegis-cookie-consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0b1018]/95 backdrop-blur-sm border-t border-white/10 font-mono pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[640px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
        <p className="text-[10px] text-[#E8E0D0]/70 leading-relaxed flex-1">
          We use cookies and localStorage to save your game progress and improve the experience.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-1.5 rounded text-[9px] font-bold tracking-[0.15em] uppercase border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-all"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 rounded text-[9px] font-bold tracking-[0.15em] uppercase border border-cyan-500/30 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
