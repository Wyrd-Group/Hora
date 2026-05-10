import React, { useEffect, useRef } from 'react';
import { useAdStore, REWARDED_ADS, REWARDED_AP_AMOUNT } from '../../store/adStore';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import { useTranslation } from '../../lib/i18n';
import { isNativeAds } from '../../lib/admobBridge';

/**
 * AdRewarded — Opt-in rewarded video overlay.
 * User watches a 30s ad in exchange for 1000 AP.
 * Styled as an "AEGIS Intelligence Transmission" — feels in-universe.
 * Max 20 per day.
 */
const AdRewarded = () => {
  const { t } = useTranslation();
  const {
    showRewarded, rewardedSecondsLeft, rewardPending,
    tickRewarded, claimReward, dismissRewarded,
  } = useAdStore();

  const timerRef = useRef(null);
  const adRef = useRef(REWARDED_ADS[Math.floor(Math.random() * REWARDED_ADS.length)]);

  // Countdown timer
  useEffect(() => {
    if (!showRewarded || rewardPending) return;

    timerRef.current = setInterval(() => {
      tickRewarded();
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [showRewarded, rewardPending, tickRewarded]);

  // On native, AdMob SDK handles rewarded video natively
  if (!showRewarded || isNativeAds) return null;

  const ad = adRef.current;
  const rewardedDuration = 60;
  const progressPct = ((rewardedDuration - rewardedSecondsLeft) / rewardedDuration) * 100;

  const handleClaim = () => {
    const apAmount = claimReward();
    // Credit AP to the card economy store
    useCardEconomyStore.getState().awardAegisPoints(apAmount, 'rewarded_ad');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030508]/97 backdrop-blur-xl">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.015]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)',
        }}
      />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.03]">
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #10b98166, #10b981)',
          }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="font-mono text-[7px] tracking-[0.3em] uppercase text-[#10b981]/50">
            AEGIS Reward Transmission
          </span>
        </div>

        {!rewardPending && (
          <span className="font-mono text-[9px] text-white/20 tabular-nums">
            {rewardedSecondsLeft}s
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative z-20 w-[90vw] max-w-[480px] text-center">
        {rewardPending ? (
          /* ── Reward claim screen ── */
          <div className="flex flex-col items-center">
            {/* Success glow */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <span className="text-3xl text-[#10b981]">&#164;</span>
            </div>

            <div className="font-mono text-[8px] tracking-[0.3em] uppercase text-[#10b981]/50 mb-2">
              Transmission Complete
            </div>

            <div className="text-2xl font-bold text-[#10b981] font-mono mb-1">
              +{REWARDED_AP_AMOUNT.toLocaleString()} AP
            </div>

            <div className="font-mono text-[9px] text-white/30 mb-8">
              Aegis Points credited to your account
            </div>

            <button
              onClick={handleClaim}
              className="px-8 py-3 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-mono text-[10px] tracking-[0.15em] uppercase hover:bg-[#10b981]/25 transition-all"
            >
              Claim Reward
            </button>
          </div>
        ) : (
          /* ── Ad playing screen ── */
          <div className="flex flex-col items-center">
            {/* Brand display */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
              style={{
                background: `${ad.color}12`,
                border: `1px solid ${ad.color}30`,
              }}
            >
              <span
                className="font-mono text-2xl font-bold"
                style={{ color: ad.color }}
              >
                {ad.brand.charAt(0)}
              </span>
            </div>

            <div
              className="font-mono text-[10px] tracking-[0.2em] uppercase font-semibold mb-2"
              style={{ color: `${ad.color}cc` }}
            >
              {ad.brand}
            </div>

            <div className="font-mono text-[8px] text-white/20 mb-8">
              {t('ads.sponsored')}
            </div>

            {/* Visual ad area — simulated video frame */}
            <div
              className="w-full aspect-video rounded-lg mb-6 flex items-center justify-center overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${ad.color}08, ${ad.color}03)`,
                border: `1px solid ${ad.color}15`,
              }}
            >
              <div className="text-center">
                <div
                  className="text-4xl font-bold mb-2"
                  style={{ color: `${ad.color}40` }}
                >
                  {ad.brand}
                </div>
                <div className="font-mono text-[9px] text-white/20">
                  {ad.offer}
                </div>
              </div>
            </div>

            {/* Timer ring */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                  <circle
                    cx="16" cy="16" r="14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray={`${progressPct * 0.88} 88`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[7px] text-white/40 tabular-nums">
                  {rewardedSecondsLeft}
                </span>
              </div>
              <div className="text-left">
                <div className="font-mono text-[8px] text-white/30">
                  Watch to earn
                </div>
                <div className="font-mono text-[11px] text-[#10b981] font-semibold">
                  {REWARDED_AP_AMOUNT.toLocaleString()} AP
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Close button (only on reward claim, not during ad) */}
      {rewardPending && (
        <button
          onClick={dismissRewarded}
          className="absolute top-4 right-6 w-8 h-8 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/30 hover:text-white/60 transition-all font-mono text-xs"
        >
          &#10005;
        </button>
      )}
    </div>
  );
};

export default AdRewarded;
