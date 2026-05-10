import React, { useEffect } from 'react';

const LegalModal = ({ onClose, title, children }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center font-mono">
      <div className="w-[90vw] max-w-[640px] max-h-[80vh] bg-[#0b1018] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
          <h2 className="text-[10px] tracking-[0.3em] uppercase text-cyan-400/70 font-bold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
          >
            &#10005;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
