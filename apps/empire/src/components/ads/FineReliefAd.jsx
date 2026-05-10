/**
 * FineReliefAd.jsx — 60-second full-screen ad overlay.
 * Watching the full ad erases 50% of the player's compliance fines.
 * Cannot be skipped — must watch the entire 60 seconds.
 */
import { useEffect, useRef } from 'react';
import { useAdStore, INTERSTITIAL_ADS } from '../../store/adStore';
import { useEmpireStore } from '../../store/empireStore';
import { useTranslation } from '../../lib/i18n';
import { isNativeAds } from '../../lib/admobBridge';

export default function FineReliefAd() {
  const { t } = useTranslation();
  const showFineRelief = useAdStore(s => s.showFineRelief);
  const secondsLeft = useAdStore(s => s.fineReliefSecondsLeft);
  const fineReliefPending = useAdStore(s => s.fineReliefPending);
  const tickFineRelief = useAdStore(s => s.tickFineRelief);
  const claimFineRelief = useAdStore(s => s.claimFineRelief);
  const dismissFineRelief = useAdStore(s => s.dismissFineRelief);
  const intervalRef = useRef(null);

  // Pick a random ad from the interstitial pool
  const ad = INTERSTITIAL_ADS[Math.floor(Date.now() / 60000) % INTERSTITIAL_ADS.length];

  // Tick countdown
  useEffect(() => {
    if (!showFineRelief || fineReliefPending) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => tickFineRelief(), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [showFineRelief, fineReliefPending, tickFineRelief]);

  // On native, AdMob SDK handles rewarded interstitials natively
  if (!showFineRelief || isNativeAds) return null;

  const handleClaim = () => {
    // Erase 50% of fines
    const currentFines = useEmpireStore.getState().complianceFines ?? 0;
    const reduction = Math.round(currentFines * 0.5);
    useEmpireStore.setState({ complianceFines: currentFines - reduction });
    claimFineRelief();
  };

  const progress = ((60 - secondsLeft) / 60) * 100;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center">
      <div className="w-full max-w-lg mx-4">
        {/* Ad content */}
        <div
          className="rounded-xl border p-8 text-center relative overflow-hidden"
          style={{ borderColor: ad.color + '40', background: `linear-gradient(135deg, ${ad.color}08, ${ad.color}03)` }}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 h-1 transition-all duration-1000" style={{ width: `${progress}%`, background: ad.color }} />

          <div className="text-[8px] font-mono text-tactical-text/30 uppercase tracking-[0.2em] mb-4">
            {t('ads.sponsored')} — {t('ads.fineRelief')}
          </div>

          <div className="text-2xl font-bold font-mono mb-2" style={{ color: ad.color }}>
            {ad.brand}
          </div>
          <div className="text-sm font-mono text-tactical-text/60 mb-2">
            {ad.headline}
          </div>
          <div className="text-[9px] font-mono text-tactical-text/30 mb-6">
            {ad.body}
          </div>

          {fineReliefPending ? (
            <button
              onClick={handleClaim}
              className="px-8 py-3 rounded-lg font-mono text-[11px] font-bold uppercase tracking-widest transition-all bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 hover:bg-[#10b981]/30 hover:brightness-125"
            >
              Claim 50% Fine Reduction
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-4xl font-bold font-mono text-tactical-text/80 tabular-nums">
                {secondsLeft}s
              </div>
              <div className="text-[8px] font-mono text-tactical-text/25 uppercase tracking-widest">
                Watch to erase 50% of your fines
              </div>
              {/* Cannot skip */}
              <div className="text-[7px] font-mono text-tactical-text/15 uppercase">
                Ad cannot be skipped
              </div>
            </div>
          )}
        </div>

        {/* Cancel option — forfeits the reward */}
        {!fineReliefPending && (
          <button
            onClick={dismissFineRelief}
            className="w-full mt-3 text-[7px] font-mono text-tactical-text/15 hover:text-tactical-text/30 transition-colors uppercase tracking-widest text-center py-2"
          >
            Cancel (forfeit fine relief)
          </button>
        )}
      </div>
    </div>
  );
}
