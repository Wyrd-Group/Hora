import React, { useEffect, useState } from 'react';
import { AP_BUNDLES } from '../../data/agentCards';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/apiFetch';

const APPurchaseModal = ({ onClose }) => {
  const buyBundle = useCardEconomyStore(s => s.buyAegisPointsBundle);
  const session = useAuthStore(s => s.session);
  const guestMode = useAuthStore(s => s.guestMode);
  const [purchasing, setPurchasing] = useState(null);

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePurchase = async (bundle) => {
    // If no Stripe key configured or guest mode, use simulated purchase
    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || guestMode || !session) {
      buyBundle(bundle.id);
      onClose?.();
      return;
    }

    // Real Stripe Checkout flow
    setPurchasing(bundle.id);
    try {
      const resp = await apiFetch('/api/v1/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          priceId: bundle.stripePriceId,
          mode: 'payment',
          bundleId: bundle.id,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const { url } = await resp.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('[Stripe] Checkout failed:', err.message);
      // Fallback to simulated purchase for beta
      buyBundle(bundle.id);
      onClose?.();
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center font-mono">
      <div className="relative w-[90vw] max-w-[560px] bg-[#0b1018] border border-tactical-border/30 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-[#ec4899]/60 font-bold">
              Acquire Aegis Points
            </h2>
            <p className="text-[8px] text-white/25 tracking-wider mt-0.5">
              Premium currency for packs, upgrades, and market actions
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
          >
            &#10005;
          </button>
        </div>

        {/* Bundle grid */}
        <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AP_BUNDLES.map((bundle, i) => {
            const isBest = i === AP_BUNDLES.length - 1;
            const isLoading = purchasing === bundle.id;
            return (
              <div
                key={bundle.id}
                className={`relative rounded-xl border p-4 flex flex-col items-center gap-2 transition-all hover:scale-[1.03] ${
                  isBest
                    ? 'border-[#ec4899]/40 bg-[#ec4899]/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-[#ec4899]/20'
                }`}
              >
                {isBest && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full bg-[#ec4899]/20 text-[#ec4899] border border-[#ec4899]/30">
                    Best Value
                  </span>
                )}

                {/* AP amount */}
                <span className="text-xl font-black text-[#ec4899]">
                  {bundle.ap.toLocaleString()}
                </span>
                <span className="text-[9px] text-white/40 -mt-1">AP</span>

                {/* Bonus badge */}
                {bundle.bonus > 0 && (
                  <span className="text-[8px] font-bold tracking-wider text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded border border-[#10b981]/20">
                    +{bundle.bonus} BONUS
                  </span>
                )}

                {/* Price */}
                <span className="text-sm font-bold text-white/80 mt-1">
                  {bundle.price}
                </span>

                {/* Purchase button */}
                <button
                  onClick={() => handlePurchase(bundle)}
                  disabled={isLoading}
                  className={`w-full mt-1 py-1.5 rounded text-[8px] font-bold tracking-[0.15em] uppercase transition-all border border-[#ec4899]/30 bg-[#ec4899]/10 text-[#ec4899] hover:bg-[#ec4899]/20 ${
                    isLoading ? 'opacity-50 cursor-wait' : ''
                  }`}
                >
                  {isLoading ? 'Redirecting...' : 'Purchase'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 text-center">
          <p className="text-[7px] text-white/15 tracking-wider">
            {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
              ? 'Secure payments powered by Stripe.'
              : 'Alpha build — purchases are simulated.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default APPurchaseModal;
