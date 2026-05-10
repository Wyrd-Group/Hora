/**
 * EventModal.jsx — Modal for random events with choice buttons.
 * Cannot be dismissed without choosing (or explicit dismiss).
 */

import { useState } from 'react';
import { useEventsStore } from '../../store/eventsStore';

function formatEffects(effects) {
  return Object.entries(effects)
    .filter(([key]) => key !== 'balance')
    .map(([key, val]) => ({
      key,
      val,
      label: key.charAt(0).toUpperCase() + key.slice(1),
    }));
}

function formatCurrency(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount}`;
}

export default function EventModal() {
  const { activeEvent, resolveEvent, dismissEvent } = useEventsStore();
  const [resolving, setResolving] = useState(false);

  if (!activeEvent) return null;

  const handleChoice = (index) => {
    if (resolving) return;
    setResolving(true);
    resolveEvent(index);
    setResolving(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md border border-tactical-border bg-[#060a12] rounded-lg shadow-2xl overflow-hidden animate-slideUp"
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 text-center">
          <div className="text-[8px] font-mono tracking-[0.2em] uppercase text-[#00e5ff]/60 mb-2">
            Random Event
          </div>
          <h2 className="text-sm font-mono font-bold text-white">{activeEvent.title}</h2>
          <p className="text-[10px] font-mono text-tactical-text/60 mt-2 leading-relaxed">
            {activeEvent.description}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-tactical-border mx-4" />

        {/* Options */}
        <div className="p-4 space-y-2">
          {activeEvent.options.map((opt, i) => {
            const effects = formatEffects(opt.effects);
            const cost = opt.effects.balance;

            return (
              <button
                key={i}
                onClick={() => handleChoice(i)}
                disabled={resolving}
                className="w-full text-left p-3 rounded-lg border border-tactical-border hover:border-[#00e5ff]/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all group disabled:opacity-40"
              >
                <div className="text-[10px] font-mono font-bold text-tactical-text group-hover:text-white transition-colors">
                  {opt.label}
                </div>

                {cost && cost < 0 && (
                  <div className="text-[9px] font-mono text-rose-400 mt-0.5">
                    Cost: {formatCurrency(Math.abs(cost))}
                  </div>
                )}

                <div className="text-[9px] font-mono text-tactical-text/40 mt-0.5">
                  {opt.description}
                </div>

                {effects.length > 0 && (
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {effects.map((e) => (
                      <span
                        key={e.key}
                        className={`text-[8px] font-mono ${
                          e.val > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {e.label}: {e.val > 0 ? '+' : ''}
                        {e.val}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Dismiss */}
        <div className="px-4 pb-4">
          <button
            onClick={dismissEvent}
            className="w-full text-center text-[8px] font-mono tracking-wider uppercase text-tactical-text/25 hover:text-tactical-text/50 py-2 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
